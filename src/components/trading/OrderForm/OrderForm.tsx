import { useMemo, useState } from 'react';
import styles from './OrderForm.module.css';

interface OrderFormProps {
    price: number;
    onPriceChange: (price: number) => void;
}

const orderTabs = ['Spot', 'Convert'];
const orderTypes = ['limit', 'market', 'tpsl'] as const;
type OrderType = typeof orderTypes[number];

export function OrderForm({ price, onPriceChange }: OrderFormProps) {
    const [activeTab, setActiveTab] = useState(orderTabs[0]);
    const [side, setSide] = useState<'buy' | 'sell'>('buy');
    const [orderType, setOrderType] = useState<OrderType>('limit');
    const [quantity, setQuantity] = useState('');
    const [sliderValue, setSliderValue] = useState(0);
    const [enableTpSl, setEnableTpSl] = useState(false);
    const [postOnly, setPostOnly] = useState(false);

    const notional = useMemo(() => {
        const qty = parseFloat(quantity) || 0;
        return (qty * price).toFixed(2);
    }, [quantity, price]);

    const handleSlider = (value: number) => {
        setSliderValue(value);
        const qty = 0.5 * (value / 100);
        setQuantity(qty === 0 ? '' : qty.toFixed(4));
    };

    const handlePriceInput = (val: string) => {
        const next = parseFloat(val);
        if (!Number.isNaN(next)) {
            onPriceChange(next);
        } else if (val === '') {
            onPriceChange(0);
        }
    };

    return (
        <div className={styles.formRoot}>
            <div className={styles.tabRow}>
                {orderTabs.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className={styles.sideToggle}>
                {(['buy', 'sell'] as const).map((action) => (
                    <button
                        key={action}
                        type="button"
                        className={`${styles.sideButton} ${
                            side === action ? (action === 'buy' ? styles.sideButtonActiveBuy : styles.sideButtonActiveSell) : ''
                        }`}
                        onClick={() => setSide(action)}
                    >
                        {action}
                    </button>
                ))}
            </div>

            <div className={styles.orderTypeRow}>
                {orderTypes.map((type) => (
                    <button
                        key={type}
                        type="button"
                        className={`${styles.orderTypeButton} ${orderType === type ? styles.orderTypeActive : ''}`}
                        onClick={() => setOrderType(type)}
                    >
                        {type === 'tpsl' ? 'TP/SL' : type}
                    </button>
                ))}
            </div>

            <div className={styles.balanceRow}>
                <span>Saldo disponível</span>
                <span>14,250.50 USDT</span>
            </div>

            <div className={styles.inputBlock}>
                <span className={styles.inputLabel}>Preço</span>
                <div className={styles.inputGroup}>
                    <input
                        type="number"
                        value={price || ''}
                        onChange={(e) => handlePriceInput(e.target.value)}
                        className={styles.inputField}
                        placeholder="0.00"
                    />
                    <span className={styles.inputSuffix}>USDT</span>
                </div>
            </div>

            <div className={styles.inputBlock}>
                <span className={styles.inputLabel}>Quantidade</span>
                <div className={styles.inputGroup}>
                    <input
                        type="number"
                        value={quantity}
                        placeholder="0.0000"
                        onChange={(e) => setQuantity(e.target.value)}
                        className={styles.inputField}
                    />
                    <span className={styles.inputSuffix}>BTC</span>
                </div>
            </div>

            <div className={styles.sliderBlock}>
                <input
                    type="range"
                    min={0}
                    max={100}
                    value={sliderValue}
                    onChange={(e) => handleSlider(parseInt(e.target.value, 10))}
                    className={styles.rangeInput}
                />
                <div className={styles.rangeMarks}>
                    {[0, 25, 50, 75, 100].map((mark) => (
                        <span key={mark}>{mark}%</span>
                    ))}
                </div>
            </div>

            <div className={styles.inputBlock}>
                <span className={styles.inputLabel}>Valor da ordem</span>
                <div className={styles.inputGroup}>
                    <span className={styles.inputField}>{notional}</span>
                    <span className={styles.inputSuffix}>USDT</span>
                </div>
            </div>

            <div className={styles.checkboxRow}>
                <label>
                    <input type="checkbox" checked={enableTpSl} onChange={() => setEnableTpSl((prev) => !prev)} />
                    TP/SL
                </label>
                <label>
                    <input type="checkbox" checked={postOnly} onChange={() => setPostOnly((prev) => !prev)} />
                    Post-Only
                </label>
            </div>

            <div className={styles.footer}>
                <button type="button" className={`${styles.actionButton} ${styles.buyButton}`} onClick={() => setSide('buy')}>
                    Comprar
                </button>
                <button type="button" className={`${styles.actionButton} ${styles.sellButton}`} onClick={() => setSide('sell')}>
                    Vender
                </button>
            </div>
        </div>
    );
}

