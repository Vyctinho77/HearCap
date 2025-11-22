import { useState } from 'react';
import { mockUserOrders, UserOrder } from '../../../data/mockData';
import styles from './OrderManagement.module.css';

const tabs = ['open', 'positions', 'orders', 'trades'] as const;

export function OrderManagement() {
    const [activeTab, setActiveTab] = useState<typeof tabs[number]>('open');

    const renderTable = () => {
        if (mockUserOrders.length === 0) {
            return (
                <div className={styles.emptyState}>
                    <span>📭</span>
                    <p>Sem dados</p>
                </div>
            );
        }

        return (
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Pair</th>
                            <th>Type</th>
                            <th>Side</th>
                            <th>Price</th>
                            <th>Amount</th>
                            <th>Filled</th>
                            <th>Total</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {mockUserOrders.map((order: UserOrder) => (
                            <tr key={order.id}>
                                <td>{order.time}</td>
                                <td>{order.pair}</td>
                                <td>{order.type}</td>
                                <td className={order.side === 'Buy' ? styles.sideBuy : styles.sideSell}>{order.side}</td>
                                <td>{order.price.toLocaleString()}</td>
                                <td>{order.amount}</td>
                                <td>{order.filled}</td>
                                <td>{order.total.toLocaleString()}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <button className={styles.actionButton}>Cancel</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className={styles.panel}>
            <div className={styles.tabRow}>
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        className={`${styles.tabButton} ${activeTab === tab ? styles.tabButtonActive : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'open' && 'Open Orders (0)'}
                        {tab === 'positions' && 'Positions (0)'}
                        {tab === 'orders' && 'Order History'}
                        {tab === 'trades' && 'Trade History'}
                    </button>
                ))}
            </div>
            {renderTable()}
        </div>
    );
}
