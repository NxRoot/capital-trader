
/** Simulate config strategy. */
export function simulate(data = [], code: string, size = 0, marketStatus = (_: Date) => "open") {
    let cost = 0
    let profit = 0
    let drawdown = 0
    let order = false
    let result = []
    let hold = 0
    let back = 50
    let win = 0
    let loss = 0
    let error
    let type = "BUY"

    if (data) {
        // Create evaluator once before the loop, not per data point
        let evaluator: ((data: any, i: number, trend: number, cost: number, hold: number, profit: number) => [boolean, boolean, string]) | null = null
        try {
            evaluator = new Function('data', 'i', 'trend', 'cost', 'hold', 'profit', `
                let type = "BUY";
                let canOpen = false;
                let canClose = false;
                try {
                    ${code}
                } catch (err) {
                    return [false, false, type];
                }
                return [canOpen, canClose, type];
            `) as any
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

            let unrealized = 0
            if (order) {
                if (type.toUpperCase() === "SELL" || type.toUpperCase() === "SHORT") {
                    unrealized = (cost - data[i]['close']) * size
                } else {
                    unrealized = (data[i]['close'] - cost) * size
                }
            }

            if (evaluator) {
                try {
                    [canBuy, canSell, type] = evaluator(data, i, trend, cost, hold, unrealized) ?? [false, false, "BUY"]
                } catch (err) {
                    canBuy = false
                    canSell = false
                    type = "BUY"
                    if (!error) {
                        error = err instanceof Error ? err.message : String(err)
                    }
                }
            }

            if (marketStatus(new Date(data[i]['timestamp'])) === "closing") {
                canBuy = false
                canSell = true
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
                // For LONG (BUY): profit when price goes up: (sell_price - buy_price) * size
                // For SHORT (SELL): profit when price goes down: (sell_price - buy_price) * size
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
                })
                hold = 0
                if (reward > 0) win++
                else loss++
            }

            
            if (order && canSell) CLOSE_ORDER()
            if (!order && canBuy) OPEN_ORDER()

            // Drawdown calculation: for LONG, drawdown when price goes down
            // For SHORT, drawdown when price goes up
            if (order) {
                if (type.toUpperCase() === "SELL" || type.toUpperCase() === "SHORT") {
                    // SHORT: drawdown when price goes up (against our position)
                    if (data[i]['close'] > cost) {
                        dd = (data[i]['close'] - cost) * size
                    }
                } else {
                    // LONG: drawdown when price goes down (against our position)
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