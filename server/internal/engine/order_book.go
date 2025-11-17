package engine

import (
	"sort"
	"sync"
)

type priceLevel struct {
	Price  float64
	Orders []*Order
}

// OrderBook mantém profundidade baseado em FIFO preço-tempo.
type OrderBook struct {
	Symbol string

	mu   sync.RWMutex
	bids map[float64]*priceLevel
	asks map[float64]*priceLevel
}

type OrderBookLevel struct {
	Price    float64 `json:"price"`
	Quantity float64 `json:"quantity"`
	Count    int     `json:"count"`
}

type OrderBookSnapshot struct {
	Symbol string           `json:"symbol"`
	Bids   []OrderBookLevel `json:"bids"`
	Asks   []OrderBookLevel `json:"asks"`
}

func NewOrderBook(symbol string) *OrderBook {
	return &OrderBook{
		Symbol: symbol,
		bids:   make(map[float64]*priceLevel),
		asks:   make(map[float64]*priceLevel),
	}
}

func (ob *OrderBook) addOrder(order *Order) {
	ob.mu.Lock()
	defer ob.mu.Unlock()

	book := ob.bids
	if order.Side == SideSell {
		book = ob.asks
	}

	level, ok := book[order.Price]
	if !ok {
		level = &priceLevel{Price: order.Price}
		book[order.Price] = level
	}

	level.Orders = append(level.Orders, order)
}

func (ob *OrderBook) removeEmptyLevel(side Side, price float64) {
	book := ob.bids
	if side == SideSell {
		book = ob.asks
	}

	level := book[price]
	if level != nil && len(level.Orders) == 0 {
		delete(book, price)
	}
}

func (ob *OrderBook) Snapshot(depth int) OrderBookSnapshot {
	ob.mu.RLock()
	defer ob.mu.RUnlock()

	var bidPrices []float64
	for p := range ob.bids {
		bidPrices = append(bidPrices, p)
	}
	sort.Sort(sort.Reverse(sort.Float64Slice(bidPrices)))

	var askPrices []float64
	for p := range ob.asks {
		askPrices = append(askPrices, p)
	}
	sort.Float64s(askPrices)

	snap := OrderBookSnapshot{Symbol: ob.Symbol}

	for i, price := range bidPrices {
		if depth > 0 && i >= depth {
			break
		}
		level := ob.bids[price]
		var qty float64
		for _, order := range level.Orders {
			qty += order.RemainingQty()
		}
		if qty > 0 {
			snap.Bids = append(snap.Bids, OrderBookLevel{
				Price:    price,
				Quantity: qty,
				Count:    len(level.Orders),
			})
		}
	}

	for i, price := range askPrices {
		if depth > 0 && i >= depth {
			break
		}
		level := ob.asks[price]
		var qty float64
		for _, order := range level.Orders {
			qty += order.RemainingQty()
		}
		if qty > 0 {
			snap.Asks = append(snap.Asks, OrderBookLevel{
				Price:    price,
				Quantity: qty,
				Count:    len(level.Orders),
			})
		}
	}

	return snap
}
