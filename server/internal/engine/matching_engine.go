package engine

import (
	"errors"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"
)

type MatchingEngine struct {
	repo       Repository
	balances   BalanceService
	events     EventBus
	marketData *MarketDataEngine

	mu    sync.RWMutex
	books map[string]*OrderBook

	stopOrders []*Order
}

func NewMatchingEngine(repo Repository, balances BalanceService, events EventBus, marketData *MarketDataEngine) *MatchingEngine {
	return &MatchingEngine{
		repo:       repo,
		balances:   balances,
		events:     events,
		marketData: marketData,
		books:      make(map[string]*OrderBook),
	}
}

func (me *MatchingEngine) getBook(symbol string) *OrderBook {
	me.mu.Lock()
	defer me.mu.Unlock()

	book, ok := me.books[symbol]
	if !ok {
		book = NewOrderBook(symbol)
		me.books[symbol] = book
	}
	return book
}

func (me *MatchingEngine) PlaceOrder(req NewOrderRequest) (*Order, error) {
	if req.Quantity <= 0 {
		return nil, errors.New("quantity must be > 0")
	}

	order := &Order{
		ID:        uuid.NewString(),
		UserID:    req.UserID,
		Symbol:    req.Symbol,
		Side:      req.Side,
		Type:      req.Type,
		Price:     req.Price,
		StopPrice: req.StopPrice,
		Quantity:  req.Quantity,
		Status:    OrderStatusNew,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := me.preCheckAndLock(order); err != nil {
		return nil, err
	}

	if err := me.repo.SaveOrder(order); err != nil {
		return nil, err
	}

	if order.Type == OrderTypeStop {
		me.stopOrders = append(me.stopOrders, order)
		return order, nil
	}

	if err := me.match(order); err != nil {
		return nil, err
	}

	snapshot := me.getBook(order.Symbol).Snapshot(50)
	_ = me.events.PublishOrderBookUpdate(order.Symbol, snapshot)

	// Notificar MarketDataEngine do snapshot atualizado
	if me.marketData != nil {
		me.marketData.OnOrderBookSnapshot(snapshot)
	}

	return order, nil
}

func (me *MatchingEngine) preCheckAndLock(order *Order) error {
	baseSymbol := order.Symbol
	quoteSymbol := order.Symbol + "_QUOTE"

	if order.Side == SideSell {
		if !me.balances.CanLockBase(order.UserID, baseSymbol, order.Quantity) {
			return errors.New("insufficient base balance")
		}
		return me.balances.LockBase(order.UserID, baseSymbol, order.Quantity)
	}

	notional := order.Price * order.Quantity
	if order.Type == OrderTypeMarket && notional == 0 {
		// fallback se preço não veio
		notional = order.Quantity
	}

	if !me.balances.CanLockQuote(order.UserID, quoteSymbol, notional) {
		return errors.New("insufficient quote balance")
	}
	return me.balances.LockQuote(order.UserID, quoteSymbol, notional)
}

func (me *MatchingEngine) match(order *Order) error {
	book := me.getBook(order.Symbol)
	if order.Side == SideBuy {
		return me.matchBuy(book, order)
	}
	return me.matchSell(book, order)
}

func (me *MatchingEngine) matchBuy(book *OrderBook, buy *Order) error {
	for buy.RemainingQty() > 0 {
		book.mu.RLock()
		var askPrices []float64
		for price := range book.asks {
			askPrices = append(askPrices, price)
		}
		book.mu.RUnlock()

		if len(askPrices) == 0 {
			break
		}
		sort.Float64s(askPrices)
		bestAsk := askPrices[0]

		if buy.Type == OrderTypeLimit && bestAsk > buy.Price {
			break
		}

		book.mu.Lock()
		level := book.asks[bestAsk]
		if level == nil || len(level.Orders) == 0 {
			book.mu.Unlock()
			continue
		}

		sell := level.Orders[0]
		qty := min(buy.RemainingQty(), sell.RemainingQty())
		price := bestAsk

		buy.FilledQty += qty
		sell.FilledQty += qty

		if sell.RemainingQty() == 0 {
			sell.Status = OrderStatusFilled
			level.Orders = level.Orders[1:]
		} else {
			sell.Status = OrderStatusPartFilled
		}

		if len(level.Orders) == 0 {
			book.removeEmptyLevel(SideSell, bestAsk)
		}
		book.mu.Unlock()

		trade := &Trade{
			ID:        uuid.NewString(),
			Symbol:    buy.Symbol,
			BuyOrder:  buy.ID,
			SellOrder: sell.ID,
			Price:     price,
			Quantity:  qty,
			CreatedAt: time.Now(),
		}

		_ = me.repo.SaveTrade(trade)
		_ = me.repo.UpdateOrder(buy)
		_ = me.repo.UpdateOrder(sell)
		_ = me.events.PublishTrade(trade)

		// Notificar MarketDataEngine
		if me.marketData != nil {
			_ = me.marketData.OnTradeEvent(TradeEvent{
				ID:        trade.ID,
				Symbol:    trade.Symbol,
				Price:     trade.Price,
				Quantity:  trade.Quantity,
				Side:      SideBuy, // buy é o agressor neste caso
				Source:    TradeSourceLit,
				Timestamp: trade.CreatedAt,
			})
		}

		if buy.RemainingQty() == 0 {
			buy.Status = OrderStatusFilled
			break
		}
		buy.Status = OrderStatusPartFilled
	}

	if buy.RemainingQty() > 0 && buy.Type == OrderTypeLimit {
		book.addOrder(buy)
		_ = me.repo.UpdateOrder(buy)
	}

	return nil
}

func (me *MatchingEngine) matchSell(book *OrderBook, sell *Order) error {
	for sell.RemainingQty() > 0 {
		book.mu.RLock()
		var bidPrices []float64
		for price := range book.bids {
			bidPrices = append(bidPrices, price)
		}
		book.mu.RUnlock()

		if len(bidPrices) == 0 {
			break
		}
		sort.Sort(sort.Reverse(sort.Float64Slice(bidPrices)))
		bestBid := bidPrices[0]

		if sell.Type == OrderTypeLimit && bestBid < sell.Price {
			break
		}

		book.mu.Lock()
		level := book.bids[bestBid]
		if level == nil || len(level.Orders) == 0 {
			book.mu.Unlock()
			continue
		}

		buy := level.Orders[0]
		qty := min(sell.RemainingQty(), buy.RemainingQty())
		price := bestBid

		sell.FilledQty += qty
		buy.FilledQty += qty

		if buy.RemainingQty() == 0 {
			buy.Status = OrderStatusFilled
			level.Orders = level.Orders[1:]
		} else {
			buy.Status = OrderStatusPartFilled
		}

		if len(level.Orders) == 0 {
			book.removeEmptyLevel(SideBuy, bestBid)
		}
		book.mu.Unlock()

		trade := &Trade{
			ID:        uuid.NewString(),
			Symbol:    sell.Symbol,
			BuyOrder:  buy.ID,
			SellOrder: sell.ID,
			Price:     price,
			Quantity:  qty,
			CreatedAt: time.Now(),
		}

		_ = me.repo.SaveTrade(trade)
		_ = me.repo.UpdateOrder(sell)
		_ = me.repo.UpdateOrder(buy)
		_ = me.events.PublishTrade(trade)

		// Notificar MarketDataEngine
		if me.marketData != nil {
			_ = me.marketData.OnTradeEvent(TradeEvent{
				ID:        trade.ID,
				Symbol:    trade.Symbol,
				Price:     trade.Price,
				Quantity:  trade.Quantity,
				Side:      SideSell, // sell é o agressor neste caso
				Source:    TradeSourceLit,
				Timestamp: trade.CreatedAt,
			})
		}

		if sell.RemainingQty() == 0 {
			sell.Status = OrderStatusFilled
			break
		}
		sell.Status = OrderStatusPartFilled
	}

	if sell.RemainingQty() > 0 && sell.Type == OrderTypeLimit {
		book.addOrder(sell)
		_ = me.repo.UpdateOrder(sell)
	}

	return nil
}

func (me *MatchingEngine) TriggerStops(symbol string, lastPrice float64) {
	var pending []*Order

	for _, order := range me.stopOrders {
		if order.Symbol != symbol {
			pending = append(pending, order)
			continue
		}

		trigger := false
		if order.Side == SideBuy && lastPrice >= order.StopPrice {
			trigger = true
		}
		if order.Side == SideSell && lastPrice <= order.StopPrice {
			trigger = true
		}

		if !trigger {
			pending = append(pending, order)
			continue
		}

		order.Type = OrderTypeMarket
		_ = me.match(order)
	}

	me.stopOrders = pending
}

func (me *MatchingEngine) GetOrderBookSnapshot(symbol string, depth int) OrderBookSnapshot {
	return me.getBook(symbol).Snapshot(depth)
}

func min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}
