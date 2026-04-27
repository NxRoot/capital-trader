
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


/** Capital prices to candle object. */
export function toCandle(candle) {
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
        timestamp: new Date(candle?.t).getTime(),
    };
}

/** Get market status from opening hours. */
export const getMarketStatus = (now, hours, minutes = 10) => {
    if (!hours) return "closed";
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayKey = days[now.getDay()];
    const todayHours = hours[dayKey] || [];
    for (const range of todayHours) {
        const [startStr, endStr] = range.split(' - ');
        const [sh, sm] = startStr.split(':').map(Number);
        const [eh, em] = endStr.split(':').map(Number);
        const startMin = sh * 60 + sm;
        const endMin = (eh === 0 && em === 0) ? 1440 : eh * 60 + em;
        // Open / closing
        if (currentMinutes >= startMin && currentMinutes < endMin) {
            if (endMin - currentMinutes <= minutes) return "closing";
            return "open";
        }
        // Opening soon
        if (currentMinutes < startMin && (startMin - currentMinutes) <= minutes) {
            return "opening";
        }
    }
    return "closed";
};


/** Login to the Capital API and retrieve session tokens. */
export const CapitalLogin = async (tokens, data) => {
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


/** Get all markets or a single market from Capital API. */
export const CapitalMarkets = async (tokens, data: { searchTerm?: string, epics?: string }) => {
    const params = new URLSearchParams();
    if (data?.searchTerm) params.append("searchTerm", data?.searchTerm);
    if (data?.epics) params.append("epics", data?.epics);
    const res = await (await fetch(CapitalURL(tokens?.environment) + "/api/v1/markets?" + params, { headers: headers(tokens) })).json();
    if (res?.errorCode) return { error: res };
    return res;
};


/** Get market bar values from Capital API. */
export const CapitalPrices = async (tokens, data) => {
    const params = new URLSearchParams();
    params.append("max", data?.max || "1000");
    if (data?.timeframe) params.append("resolution", data?.timeframe);
    if (data?.from) params.append("from", data?.from);
    if (data?.to) params.append("to", data?.to);
    const res = await (await fetch(CapitalURL(tokens?.environment) + `/api/v1/prices/${data.epic}?` + params, { headers: headers(tokens) })).json();
    if (res?.errorCode) return { error: res };
    return { prices: res?.prices }
}


/** Open a market position from Capital API. */
export const CapitalOpen = async (tokens, data) => {
    const order = await (await fetch(CapitalURL(tokens?.environment) + "/api/v1/positions", { method: "POST", headers: headers(tokens), body: JSON.stringify(data) })).json();
    const confirmation = await (await fetch(CapitalURL(tokens?.environment) + "/api/v1/confirms/" + order?.dealReference, { headers: headers(tokens) })).json();
    if (order?.errorCode) return { error: order };
    if (confirmation?.errorCode || confirmation?.status === 'DELETED') return { error: confirmation };
    return { order, dealId: confirmation?.affectedDeals?.[0]?.dealId, level: confirmation?.level }
}


/** Close a market position from Capital API. */
export const CapitalClose = async (tokens, dealId) => {
    const order = await (await fetch(CapitalURL(tokens?.environment) + "/api/v1/positions/" + dealId, { method: "DELETE", headers: headers(tokens) })).json();
    const confirmation = await (await fetch(CapitalURL(tokens?.environment) + "/api/v1/confirms/" + order?.dealReference, { headers: headers(tokens) })).json();
    if (order?.errorCode) return { error: order };
    if (confirmation?.errorCode || confirmation?.status === 'DELETED') return { error: confirmation };
    return { order, dealId: confirmation?.affectedDeals?.[0]?.dealId, level: confirmation?.level }
}


/** Stream market data from Capital API. */
export const CapitalStream = async (tokens, data, onUpdate, onError) => {
    let heartbeatInterval = null;
    let lastTime = null;
    const ohlc = true;
    const destination = ohlc ? 'OHLCMarketData' : 'marketData';
    let client = new WebSocket('wss://api-streaming-capital.backend-capital.com/connect');
    client.onopen = () => {
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
    };
    client.onmessage = async (event) => {
        const payload = JSON.parse(event.data.toString());
        if (payload?.status === 'OK' && payload?.destination === (ohlc ? 'ohlc.event' : 'quote')) {
            if(!lastTime || payload?.payload?.t !== lastTime) {
                lastTime = payload?.payload?.t;
                await onUpdate?.(streamToCandle(payload?.payload))
            }
        }
    };
    client.onclose = () => {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
    };
    client.onerror = onError;
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
