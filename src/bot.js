process.removeAllListeners('warning');

const { CapitalLogin, CapitalPrices, CapitalOpen, CapitalClose, CapitalStream } = require('./utils/capital');
const { simulate, toCandle, streamToCandle } = require('./utils/strategy');
const { log, red, green, yellow, conf, delay } = require('./utils/constant');


// ##################################################
// #                 Global Variables               #
// ##################################################

const config = conf(["username", "password", "apiKey"])
const tokens = { apiKey: config?.apiKey }

let data = []
let open = null
let stream = null
let reauth = null
let started = false


// ##################################################
// #                    Functions                   #
// ##################################################

const openPosition = async (trade) => {
    const order = await CapitalOpen(tokens, { epic: config.epic, direction: trade.direction, size: Number(config.orderSize) });
    if (!order.error) {
        open = { direction: trade.direction, price: order?.level, dealId: order?.dealId }
        console.log(green(`[OPEN-${trade.direction}] ${order?.level?.toFixed(2)}`));
    }
    else {
        console.error(red(`[ERROR] ${JSON.stringify(order.error)}`))
    }
}

const closePosition = async () => {
    const order = await CapitalClose(tokens, open.dealId);
    if (!order.error) {
        console.log(yellow(`[CLOSE-${open.direction}] ${order?.level?.toFixed(2)}`));
        open = null
    }
    else {
        console.error(red(`[ERROR] ${JSON.stringify(order.error)}`))
    }
}


// ##################################################
// #                  Stream Loop                   #
// ##################################################

const onUpdate = async (payload) => {

    // Prevent duplicate candles
    if (payload?.t === data?.[data?.length - 1]?.timestamp) return;

    // Add new candle to data
    data.push(streamToCandle(payload))

    // Simulate strategy
    const strategy = simulate(data, config?.strategyCode, Number(config?.orderSize))

    // Check for trade
    const trade = strategy?.result?.find(r => r.time === data[data.length - 1]?.timestamp)

    if (trade) {
        if (!open) await openPosition(trade)
        else await closePosition()
    }
    else {
        console.log(log(`[HOLD] Looking for opportunity to ${open ? "close" : "open"} position...`));
    }

}


// ##################################################
// #                   Initialize                   #
// ##################################################

const main = async () => {

    // Close stream
    stream?.()
    clearInterval(reauth)

    // Reset tokens
    tokens.cst = ""
    tokens.securityToken = ""

    // Authentication
    const login = await CapitalLogin(tokens, config)
    if (login.error || !login.cst || !login.securityToken) {
        console.error(red(`[LOGIN ERROR] -> ${JSON.stringify(login.error)}`))
        return
    }

    // Set tokens
    tokens.cst = login?.cst
    tokens.securityToken = login?.securityToken
    tokens.apiKey = config?.apiKey

    // Get market prices
    const { prices, error } = await CapitalPrices(tokens, config)
    if (!prices || prices.length === 0 || error) {
        console.error(red(`[PRICES ERROR] -> ${error?.errorCode ? JSON.stringify(error) : "No prices data. Check your API connection or configuration."}`))
        return
    }

    // Map prices to candles
    if (!data?.length) data = prices?.map(toCandle)?.slice(0, -1)

    // Start stream
    stream = await CapitalStream(tokens, config, onUpdate, console.error)

    if (!started) {
        console.log("")
        console.log(`Size: ${Number(config?.orderSize)}`)
        console.log(`Epic: ${config?.epic}`)
        console.log(`Time: ${new Date().toLocaleTimeString()}`)
        console.log(`Currency: ${login?.account?.currencyIsoCode}`)
        console.log(`Timeframe: ${config?.timeframe}`)
        console.log(`Environment: ${config?.environment}`)
        console.log(`Total Balance: ${login?.account?.currencySymbol} ${(login?.account?.accountInfo?.balance ?? 0).toFixed(2)}`)
        console.log(`Available Balance: ${login?.account?.currencySymbol} ${(login?.account?.accountInfo?.available ?? 0).toFixed(2)}`)
        console.log("")
        started = true
    }

    // Reauthenticate in 8 minutes
    reauth = setInterval(async () => { await delay(3000); main() }, 8 * 60 * 1000)
}
main()

process.on('SIGINT', async () => { stream?.(); process.exit(0); });
process.on('SIGTERM', async () => { stream?.(); process.exit(0); });