/** Capital prices to candle object. */
function toCandle(candle) {
    const pick = (price) => price?.bid ?? price?.lastTraded ?? 0;
    return {
        open: pick(candle.openPrice),
        high: pick(candle.highPrice),
        low: pick(candle.lowPrice),
        close: pick(candle.closePrice),
        volume: candle?.lastTradedVolume,
        timestamp: new Date(candle.snapshotTime).getTime(),
    };
}

/** Capital stream to candle object. */
function streamToCandle(candle) {
    return {
        open: candle?.o,
        high: candle?.h,
        low: candle?.l,
        close: candle?.c,
        volume: candle?.lastTradedVolume,
        timestamp: candle?.t,
    };
}

/** Simulate config strategy. */
function simulate(data = [], code, size = 0) {
    let cost = 0
    let profit = 0
    let drawdown = 0
    let order = false
    let result = []
    let hold = 0
    let back = 50
    let win = 0
    let error
    let type = "BUY"

    if (data) {
        let evaluator = null
        try {
            evaluator = new Function('data', 'i', 'trend', 'cost', 'hold', `
                let type = "BUY";
                let canOpen = false;
                let canClose = false;
                try {
                    ${code}
                } catch (err) {
                    return [false, false, type];
                }
                return [canOpen, canClose, type];
            `)
        } catch (err) {
            error = err instanceof Error ? err.message : String(err)
            evaluator = null
        }

        for (let c in data) {
            let reward = 0.0
            let dd = 0.0
            let i = Number(c)
            let canBuy = false
            let canSell = false
            let trend = data[i - back]?.['close'] > data[i]['close'] ? 1 : 0

            if (evaluator) {
                try {
                    [canBuy, canSell, type] = evaluator(data, i, trend, cost, hold) ?? [false, false, "BUY"]
                } catch (err) {
                    canBuy = false
                    canSell = false
                    type = "BUY"
                    if (!error) {
                        error = err instanceof Error ? err.message : String(err)
                    }
                }
            }

            const OPEN_ORDER = () => {
                cost = data[i]['close']
                order = true
                result.push({
                    "type": "BUY",
                    "direction": type.toUpperCase(),
                    "close": data[i]['close'],
                    "time": data[i]['timestamp'],
                })
            }

            const CLOSE_ORDER = () => {
                if (type.toUpperCase() === "SELL" || type.toUpperCase() === "SHORT") {
                    reward = (cost - data[i]['close']) * size
                } else {
                    reward = (data[i]['close'] - cost) * size
                }
                order = false
                result.push({
                    "type": "SELL",
                    "direction": type.toUpperCase(),
                    "close": data[i]['close'],
                    "time": data[i]['timestamp'],
                    "reward": reward
                })
                hold = 0
                if (reward > 0) win++
            }

            if (!order && canBuy) OPEN_ORDER()
            else if (order && canSell) CLOSE_ORDER()

            if (order) {
                if (type.toUpperCase() === "SELL" || type.toUpperCase() === "SHORT") {
                    if (data[i]['close'] > cost) {
                        dd = (data[i]['close'] - cost) * size
                    }
                } else {
                    if (data[i]['close'] < cost) {
                        dd = (cost - data[i]['close']) * size
                    }
                }
            }

            if (order) hold++
            profit += reward
            if (dd > drawdown) drawdown = dd
           
        }

        return {
            result,
            profit,
            type: type.toUpperCase(),
            drawdown,
            error,
            win
        }
    }
}

module.exports = { simulate, toCandle, streamToCandle }