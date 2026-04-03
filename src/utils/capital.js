const { WebSocket } = require('ws');

const CapitalURL = e => {
    if (e === "live") return "https://api-capital.backend-capital.com";
    return "https://demo-api-capital.backend-capital.com";
}

const headers = tokens => ({
    "Content-Type": "application/json",
    "X-CAP-API-KEY": tokens?.apiKey,
    ...(tokens?.cst ? { "CST": tokens?.cst } : {}),
    ...(tokens?.securityToken ? { "X-SECURITY-TOKEN": tokens?.securityToken } : {})
})

/**
 * Login to the Capital API and retrieve session tokens.
 * @returns {} An object containing the session tokens if successful, or an error if failed.
*/
const CapitalLogin = async (tokens, data) => {
    const request = (await fetch(CapitalURL(tokens?.environment) + "/api/v1/session", {
        method: "POST",
        headers: headers(tokens),
        body: JSON.stringify({ identifier: data?.username, password: data?.password })
    }));
    const cst = request.headers.get("cst") ?? request.headers["CST"];
    const securityToken = request.headers.get("x-security-token") ?? request.headers["X-SECURITY-TOKEN"];
    const res = await request.json();
    if (res?.errorCode) return { error: res };
    return { cst, securityToken, account: res }
}

/**
 * Get all open positions from Capital API.
 * @returns {} An object containing all open positions and their information.
*/
const CapitalPositions = async (tokens) => {
    const res = await (await fetch(CapitalURL(tokens?.environment) + "/api/v1/positions", { headers: headers(tokens) })).json();
    if (res?.errorCode) return { error: res };
    return { positions: res?.positions }
}

/**
 * Get market bar values from Capital API.
 * @returns {} An object containing all bars for a specific market.
*/
const CapitalPrices = async (tokens, data) => {
    const params = new URLSearchParams();
    if (data?.timeframe) params.append("resolution", data?.timeframe);
    if (data?.max) params.append("max", data?.max.toString());
    if (data?.from) params.append("from", data?.from);
    if (data?.to) params.append("to", data?.to);
    const res = await (await fetch(CapitalURL(tokens?.environment) + `/api/v1/prices/${data.epic}?` + params, { headers: headers(tokens) })).json();
    if (res?.errorCode) return { error: res };
    return { prices: res?.prices }
}

/**
 * Open a market position from Capital API.
 * @returns {} An object containing order details.
*/
const CapitalOpen = async (tokens, data) => {
    const order = await (await fetch(CapitalURL(tokens?.environment) + "/api/v1/positions", { method: "POST", headers: headers(tokens), body: JSON.stringify(data) })).json();
    const confirmation = await (await fetch(CapitalURL(tokens?.environment) + "/api/v1/confirms/" + order?.dealReference, { headers: headers(tokens) })).json();
    if (order?.errorCode) return { error: order };
    if (confirmation?.errorCode || confirmation?.status === 'DELETED') return { error: confirmation };
    return { order, dealId: confirmation?.affectedDeals?.[0]?.dealId, level: confirmation?.level }
}

/**
 * Close a market position from Capital API.
 * @returns {} An object containing order details.
*/
const CapitalClose = async (tokens, dealId) => {
    const order = await (await fetch(CapitalURL(tokens?.environment) + "/api/v1/positions/" + dealId, { method: "DELETE", headers: headers(tokens) })).json();
    const confirmation = await (await fetch(CapitalURL(tokens?.environment) + "/api/v1/confirms/" + order?.dealReference, { headers: headers(tokens) })).json();
    if (order?.errorCode) return { error: order };
    if (confirmation?.errorCode || confirmation?.status === 'DELETED') return { error: confirmation };
    return { order, dealId: confirmation?.affectedDeals?.[0]?.dealId, level: confirmation?.level }
}

/**
 * Stream market data from Capital API.
 * @returns {} A function to close the stream.
*/
const CapitalStream = async (tokens, data, onUpdate, onError) => {
    let heartbeatInterval = null;
    let lastTime = null;
    const ohlc = true;
    const destination = ohlc ? 'OHLCMarketData' : 'marketData';
    let client = new WebSocket('wss://api-streaming-capital.backend-capital.com/connect');
    client.on('open', () => {
        // console.log("Stream opened");
        client.send(JSON.stringify({
            destination: `${destination}.subscribe`,
            correlationId: Date.now().toString(),
            cst: tokens?.cst,
            securityToken: tokens?.securityToken,
            payload: {
                epics: [data?.epic],
                resolutions: [data?.timeframe],
            },
        }));
        heartbeatInterval = setInterval(() => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    destination: 'ping',
                    correlationId: Date.now().toString(),
                    cst: tokens?.cst,
                    securityToken: tokens?.securityToken,
                }));
            }
        }, 5000);
    });
    client.on('message', async (data) => {
        const payload = JSON.parse(data.toString());
        if (payload?.status === 'OK' && payload?.destination === (ohlc ? 'ohlc.event' : 'quote')) {
            if(!lastTime || payload?.payload?.t !== lastTime) {
                lastTime = payload?.payload?.t;
                await onUpdate?.(payload?.payload)
            }
        }
    });
    client.on('close', () => {
        // console.log("Stream closed");
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
    });
    client.on('error', (error)=> onError?.(error));
    return () => {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
        
        if (client) {
            if (client.readyState === WebSocket.OPEN) {
                const correlationId = Date.now().toString();
                client.send(JSON.stringify({
                    destination: `${destination}.unsubscribe`,
                    correlationId,
                    cst: tokens?.cst,
                    securityToken: tokens?.securityToken,
                    payload: {
                        epics: [data?.epic],
                        resolutions: [data?.timeframe],
                    },
                }));
            }
            client.close();
            client = null;
            lastTime = null;
        }
    }
}


module.exports = {
    CapitalLogin,
    CapitalPrices,
    CapitalPositions,
    CapitalOpen,
    CapitalClose,
    CapitalStream
}