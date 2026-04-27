import { indicators as indicatorsList } from 'klinecharts'

export const TIMEFRAME_OPTIONS = [
    { label: "1m", value: "MINUTE" },
    { label: "5m", value: "MINUTE_5" },
    { label: "15m", value: "MINUTE_15" },
    { label: "30m", value: "MINUTE_30" },
    { label: "1h", value: "HOUR" },
    { label: "4h", value: "HOUR_4" },
    { label: "1d", value: "DAY" },
    // { label: "1w", value: "WEEK" },
];

var str = {
    name: 'STR',
    figures: [
        {
            key: 'hh',
            title: 'HH (Higher High): ',
            type: 'circle',
            attrs: ({ coordinate }) => ({ x: coordinate.current.x, y: coordinate.current.hh, r: 2 }),
            styles: () => ({ color: '#22c55e' })
        },
        {
            key: 'hl',
            title: 'HL (Higher Low): ',
            type: 'circle',
            attrs: ({ coordinate }) => ({ x: coordinate.current.x, y: coordinate.current.hl, r: 2 }),
            styles: () => ({ color: '#3b82f6' })
        },
        {
            key: 'lh',
            title: 'LH (Lower High): ',
            type: 'circle',
            attrs: ({ coordinate }) => ({ x: coordinate.current.x, y: coordinate.current.lh, r: 2 }),
            styles: () => ({ color: '#f59e0b' })
        },
        {
            key: 'll',
            title: 'LL (Lower Low): ',
            type: 'circle',
            attrs: ({ coordinate }) => ({ x: coordinate.current.x, y: coordinate.current.ll, r: 2 }),
            styles: () => ({ color: '#ef4444' })
        },
        {
            key: 'hhLabel',
            type: 'text',
            attrs: ({ coordinate }) => ({ x: coordinate.current.x, y: coordinate.current.hhLabel - 15, text: 'HH', align: 'center' }),
            styles: () => ({ color: '#22c55e', size: 11, family: 'Monospace', weight: 'bold' })
        },
        {
            key: 'hlLabel',
            type: 'text',
            attrs: ({ coordinate }) => ({ x: coordinate.current.x, y: coordinate.current.hlLabel + 15, text: 'HL', align: 'center' }),
            styles: () => ({ color: '#3b82f6', size: 11, family: 'Monospace', weight: 'bold' })
        },
        {
            key: 'lhLabel',
            type: 'text',
            attrs: ({ coordinate }) => ({ x: coordinate.current.x, y: coordinate.current.lhLabel - 15, text: 'LH', align: 'center' }),
            styles: () => ({ color: '#f59e0b', size: 11, family: 'Monospace', weight: 'bold' })
        },
        {
            key: 'llLabel',
            type: 'text',
            attrs: ({ coordinate }) => ({ x: coordinate.current.x, y: coordinate.current.llLabel + 15, text: 'LL', align: 'center' }),
            styles: () => ({ color: '#ef4444', size: 11, family: 'Monospace', weight: 'bold' })
        },
    ],
    
    calcParams: [ 0.00115, 3, 30, 10, 100, 0.3 ],

    calc: (kLineDataList, { calcParams }) => {

        const [ reversalPct, minBarsFloor, minBarsCap, minBarsDefault, pivotLookback, gapFraction ] = calcParams

        const result = kLineDataList.map(() => ({}))
        let direction = 0
        let extremeIdx = null
        let extremePrice = null
        let lastHighPrice = null
        let lastLowPrice = null
        const pivotIndices = []

        const getDynamicMinBars = () => {
            if (pivotIndices.length < 2) return minBarsDefault
            let totalGap = 0
            for (let k = 1; k < pivotIndices.length; k++) {
                totalGap += pivotIndices[k] - pivotIndices[k - 1]
            }
            const avgGap = totalGap / (pivotIndices.length - 1)
            const dynamic = Math.floor(avgGap * gapFraction)
            return Math.min(minBarsCap, Math.max(minBarsFloor, dynamic))
        }

        const registerPivot = (idx) => {
            pivotIndices.push(idx)
            if (pivotIndices.length > pivotLookback) pivotIndices.shift()
        }

        const labelHigh = (idx, price) => {
            if (lastHighPrice === null || price > lastHighPrice) {
                result[idx].hh = price
                result[idx].hhLabel = price
            } else {
                result[idx].lh = price
                result[idx].lhLabel = price
            }
        }

        const labelLow = (idx, price) => {
            if (lastLowPrice === null || price < lastLowPrice) {
                result[idx].ll = price
                result[idx].llLabel = price
            } else {
                result[idx].hl = price
                result[idx].hlLabel = price
            }
        }

        for (let i = 0; i < kLineDataList.length; i++) {
            const close = Number(kLineDataList[i].close)

            if (extremeIdx === null) {
                extremeIdx = i
                extremePrice = close
                continue
            }

            if (direction === 0) {
                if (close > extremePrice) {
                    direction = 1
                    extremeIdx = i
                    extremePrice = close
                    labelHigh(i, close)
                } else if (close < extremePrice) {
                    direction = -1
                    extremeIdx = i
                    extremePrice = close
                    labelLow(i, close)
                }
                continue
            }

            const barsFromExtreme = i - extremeIdx
            const movePct = Math.abs(close - extremePrice) / extremePrice
            const minBars = getDynamicMinBars()

            if (direction === 1) {
                if (close > extremePrice) {
                    result[extremeIdx] = {}
                    extremeIdx = i
                    extremePrice = close
                    labelHigh(i, close)
                } else if (movePct >= reversalPct && barsFromExtreme >= minBars) {
                    registerPivot(extremeIdx)
                    lastHighPrice = extremePrice
                    direction = -1
                    extremeIdx = i
                    extremePrice = close
                    labelLow(i, close)
                }
            } else {
                if (close < extremePrice) {
                    result[extremeIdx] = {}
                    extremeIdx = i
                    extremePrice = close
                    labelLow(i, close)
                } else if (movePct >= reversalPct && barsFromExtreme >= minBars) {
                    registerPivot(extremeIdx)
                    lastLowPrice = extremePrice
                    direction = 1
                    extremeIdx = i
                    extremePrice = close
                    labelHigh(i, close)
                }
            }
        }

        return result
    }
}

const names: any = [
    { name: "AVP", label: "Anchored Volume Profile" },
    { name: "MACD", label: "Moving Average Convergence/Divergence"  },
    { name: "RSI", label: "Relative Strength Index"  },
    { name: "MA", label: "Moving Average", main: true  },
    { name: "EMA", label: "Exponential Moving Average", main: true  },
    { name: "SMA", label: "Simple Moving Average", main: true  },
    { name: "CCI", label: "Commodity Channel Index" },
    { name: "BOLL", label: "Bollinger Bands", main: true },
    { name: "BBI", label: "Bull and Bear Index"  },
    { name: "KDJ", label: "Stochastic Index"  },
    { name: "BIAS", label: "Market Bias" },
    { name: "BRAR", label: "Emotion and Willingness" },
    { name: "DMI", label: "Directional Movement Indicator" },
    { name: "CR", label: "Current Ratio" },
    { name: "PSY", label: "Psychological Line" },
    { name: "DMA", label: "Displaced Moving Average" },
    { name: "TRIX", label: "Triple Exponential Average" },
    { name: "OBV", label: "On Balance Volume" },
    { name: "VR", label: "Volume Ratio" },
    { name: "VOL", label: "Volume" },
    { name: "WR", label: "Williams Percentage Range" },
    { name: "MTM", label: "Momentum Indicator" },
    { name: "EMV", label: "Ease of Movement Index" },
    { name: "SAR", label: "Parabolic Stop and Reverse", main: true },
    { name: "AO", label: "Awesome Oscillator" },
    { name: "ROC", label: "Rate Of Change" },
    { name: "PVT", label: "Price Volume Trend" },
    { name: "STR", label: "Support and Resistance", main: true },
]

export const indicators = [...indicatorsList, str]?.map(i => ({ 
    ...i, 
    label: names.find(n => n.name === i.name)?.label, 
    main: names.find(n => n.name === i.name)?.main 
}))

export function calculateIndicators(dataList, customIndicators = []) {
    const d = dataList.map(item => {
        const clean = {}
        for (const key in item) clean[key] = item[key] 
        return clean
    })
    for (const indicator of indicators) {
        const cus = (customIndicators || [])?.find(i => i.name === indicator.name)
        const res = indicator.calc(d, { ...indicator, calcParams: cus?.calcParams || indicator.calcParams });
        for (let index = 0; index < d.length; index++) {
            for (const key in res[index]) {
                d[index][`${indicator.name.toLowerCase()}_${key.toLowerCase()}`] = res[index][key];
            }
        }
    }
    return d
}

export const chartStyles = {
    candle: {
        type: "candle" as any,
        tooltip: {
            text: {
                size: 12,
                family: 'Monospace',
            },
        },
        priceMark: {
            last: {
                text: {
                    size: 12,
                    family: 'Monospace',
                }
            }
        },
    },
    separator: {
        size: 0,
    },
    grid: {
        horizontal: {
            color: '#202020',
        },
        vertical: {
            color: '#202020',
        },
    },
    crosshair: {
        vertical: {
            text: {
                size: 12,
                family: 'Monospace',
            }
        },
        horizontal: {
            text: {
                size: 12,
                family: 'Monospace',
            }
        }
    },
    xAxis: {
        axisLine: {
            show: false,
        },
        tickText: {
            family: 'Monospace',
            size: 12,
        },
    },
    yAxis: {
        axisLine: {
            show: false,
        },
        tickText: {
            family: 'Monospace',
            size: 12,
        },
    },
    overlay: {
        text: {
            size: 12,
            family: 'Monospace',
        }
    },
}

export const overlay = (buy = true, data: { timestamp, value, index }) => {
    const color = buy ? "green" : "red"
    return ({
        name: 'simpleAnnotation',
        extendData: data?.index,
        groupId: "tags",
        points: [data],
        styles: {
            polygon: { color },
            line: { color, size: 2 },
            rectText: {
                color: "white",
                borderColor: color,
                backgroundColor: color,
                size: 10,
                family: 'Monospace',
                weight: 'bold'
            }
        }
    })
}

export const setIndicators = (chart, ind) => {
    for (const indicator of (ind || indicators)) {
        if (indicator.visible) {
            const paneId = indicator.main ? "candle_pane" : "visible"
            chart?.createIndicator(indicator.name, true, { id: paneId })
            if (indicator.calcParams && indicator.calcParams.length > 0) {
                chart?.overrideIndicator({ name: indicator.name, calcParams: indicator.calcParams }, paneId)
            }
        }
    }
}

