const { simulate, toCandle } = require('./strategy');
const { CapitalLogin, CapitalPrices } = require('./capital');

const test = async (tokens, config, LOGIN) => {
    // Authentication
    const login = LOGIN ? LOGIN : await CapitalLogin(tokens, config)
    if (login.error || !login.cst || !login.securityToken) {
        console.error(`[LOGIN ERROR] -> ${JSON.stringify(login.error)}`)
        return process.exit(0)
    }

    // Set tokens
    tokens.cst = login?.cst
    tokens.securityToken = login?.securityToken

    // Get market prices
    const { prices } = await CapitalPrices(tokens, config)
    const candles = prices?.map(toCandle)

    // Simulate strategy
    const strategy = simulate(candles, config?.strategyCode, Number(config?.orderSize))

    // Calculate duration
    const start = new Date(strategy?.result?.[0]?.time);
    const end = new Date(strategy?.result?.[strategy?.result?.length - 1]?.time);
    const diffMs = end - start;
    const diffHours = strategy?.result?.length > 0 ? (diffMs / (1000 * 60 * 60))?.toFixed(2) : 0;

    // Parse strategy results
    const balance = parseFloat((login?.account?.accountInfo?.balance ?? 0).toFixed(2))
    const available = parseFloat((login?.account?.accountInfo?.available ?? 0).toFixed(2))
    const profit = parseFloat(strategy?.profit?.toFixed(2))
    const drawdown = parseFloat(strategy?.drawdown?.toFixed(2))
    const totalTrades = Math.floor(strategy?.result?.length / 2)
    const finalBalance = parseFloat((balance + profit).toFixed(2))
    const roi = parseFloat(((finalBalance - balance) / balance * 100).toFixed(2))
    const winRate = strategy?.result?.length > 0 ? parseFloat((strategy?.win / totalTrades * 100).toFixed(2)) : 0;

    return { profit, drawdown, roi, winRate, totalTrades, finalBalance, balance, available, diffHours, candles, login, strategy }
}

module.exports = { test }