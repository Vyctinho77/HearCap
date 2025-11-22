export interface OrderbookEntry {
    price: number;
    size: number;
    total: number;
    side: 'buy' | 'sell';
}

export interface Trade {
    id: string;
    price: number;
    qty: number;
    time: string;
    side: 'buy' | 'sell';
}

export interface UserOrder {
    id: string;
    time: string;
    pair: string;
    type: 'Limit' | 'Market';
    side: 'Buy' | 'Sell';
    price: number;
    amount: number;
    filled: number;
    total: number;
    status: 'Open' | 'Filled' | 'Canceled';
}

export const mockBids: OrderbookEntry[] = Array.from({ length: 15 }).map((_, i) => {
    const price = 81500 - i * 5;
    const size = Math.random() * 0.5;
    return {
        price,
        size,
        total: size * price,
        side: 'buy',
    };
});

export const mockAsks: OrderbookEntry[] = Array.from({ length: 15 }).map((_, i) => {
    const price = 81505 + i * 5;
    const size = Math.random() * 0.5;
    return {
        price,
        size,
        total: size * price,
        side: 'sell',
    };
});

export const mockTrades: Trade[] = Array.from({ length: 20 }).map((_, i) => ({
    id: i.toString(),
    price: 81500 + (Math.random() * 20 - 10),
    qty: Math.random() * 0.1,
    time: new Date().toLocaleTimeString(),
    side: Math.random() > 0.5 ? 'buy' : 'sell',
}));

export const mockUserOrders: UserOrder[] = [
    {
        id: '1',
        time: '12:30:45',
        pair: 'BTC/USDT',
        type: 'Limit',
        side: 'Buy',
        price: 81000,
        amount: 0.05,
        filled: 0,
        total: 4050,
        status: 'Open',
    },
    {
        id: '2',
        time: '11:15:20',
        pair: 'ETH/USDT',
        type: 'Limit',
        side: 'Sell',
        price: 3200,
        amount: 1.5,
        filled: 0.5,
        total: 4800,
        status: 'Open',
    },
];
