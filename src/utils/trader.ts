import { CapitalOpen, CapitalClose, CapitalLogin, CapitalMarkets, CapitalPrices, CapitalStream, toCandle, getMarketStatus } from "@/utils/capital";
import { calculateIndicators } from "@/utils/chart";
import { simulate } from "@/utils/strategy";

// Function to create a delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export class TradingBot {
    static instance = null;
    config: any;
    tokens: any;
    data: any[];
    logs: any[];
    open: any;
    stream: any;
    reauth: any;
    openingHours: any;


    static getInstance(): TradingBot {
        if (!TradingBot.instance) {
            TradingBot.instance = new TradingBot();
        }
        return TradingBot.instance;
    }


    constructor() {
        if (TradingBot.instance) {
            return TradingBot.instance;
        }

        this.logs = [];
        this.data = [];
        this.open = null;
        this.stream = null;
        this.reauth = null;
        this.openingHours = null;

        TradingBot.instance = this;
    }


    log(text: string) {
        console.log(`${new Date().toLocaleTimeString()}`, text)
        this.logs.push({ timestamp: new Date().getTime(), text })
    }


    async openPosition(trade) {
        const order = await CapitalOpen(this.tokens, { epic: this.config.epic, direction: trade.direction, size: Number(this.config.orderSize) });
        if (!order.error && order?.dealId && trade?.direction) {
            this.open = { direction: trade.direction, price: order?.level, dealId: order?.dealId };
            this.log(`[OPEN-${trade?.direction}] Price: ${order?.level?.toFixed(4)} | Size: ${Number(this.config.orderSize)}`);
        } else {
            this.log(`[ERROR] ${JSON.stringify(order.error)}`);
        }
    }


    async closePosition(price) {
        const order = await CapitalClose(this.tokens, this.open?.dealId);
        if (!order.error) {
            const p = order?.level || price;
            const currentPrice = p * Number(this.config.orderSize);
            const openPrice = this.open.price * Number(this.config.orderSize);
            const profit = this.open?.direction === "BUY" ? currentPrice - openPrice : openPrice - currentPrice;
            this.log(`[CLOSE-${this.open?.direction}] Price: ${p?.toFixed(4)} | Profit: ${profit?.toFixed(2)}`);
            this.open = null;
        } else {
            this.log(`[ERROR] ${JSON.stringify(order.error)}`);
        }
    }


    async onUpdate(payload) {

        // Sync last candle
        if (payload?.timestamp === this.data?.[this.data?.length - 1]?.timestamp) {
            this.data[this.data.length - 1]!.close = payload?.close;
            this.data[this.data.length - 1]!.high = payload?.high;
            this.data[this.data.length - 1]!.low = payload?.low;
            return
        }

        // Add new candle
        this.data.push(payload);

        // Get market status
        const status = getMarketStatus(new Date(), this.openingHours, 5);
        const price = this.data[this.data.length - 1]?.close;

        // Close position if open
        if (this.open?.dealId) {
            if (status === "closing") {
                this.log(`[HOLD] Market closing soon, closing position...`);
                await this.closePosition(price);
                return;
            }
        }

        // Wait for market to open
        if (status !== "open") return this.log(`[HOLD] Waiting for market to open...`);

        // Calculate indicators
        const indicators = calculateIndicators(this.data, this.config?.indicators);

        // Simulate strategy
        const simulation = simulate(indicators, this.config?.strategyCode, this.config?.orderSize, (date) => getMarketStatus(date, this.openingHours, 5));

        // Check for trades
        const [first, second] = simulation?.result?.filter((t) => t?.time === indicators?.[indicators?.length - 1]?.timestamp);

        // Open position
        if (first?.type === "BUY" && !this.open?.dealId) await this.openPosition(first);

        // Close position
        if (first?.type === "SELL" && this.open?.dealId) await this.closePosition(price);

        // Revenge position
        if (second?.type === "BUY" && !this.open?.dealId) await this.openPosition(first);
        
        // Hold position
        else this.log(`[HOLD] Looking to ${this.open?.dealId ? "CLOSE" : "OPEN"} trade...`);
    }


    async start() {

        if (!this.config?.apiKey || !this.config?.username || !this.config?.password) {
            return;
        }

        // Close stream
        this.stream?.();
        clearTimeout(this.reauth);

        // Reset tokens
        this.tokens.cst = "";
        this.tokens.securityToken = "";

        // Authentication
        const login = await CapitalLogin(this.tokens, this.config);
        if (login.error || !login.cst || !login.securityToken) {
            this.log(`[LOGIN ERROR] -> ${JSON.stringify(login.error)}`);
            return;
        }

        // Set tokens
        this.tokens.cst = login?.cst;
        this.tokens.securityToken = login?.securityToken;
        this.tokens.apiKey = this.config?.apiKey;

        if (!this.data?.length) {

            // Reset logs
            this.logs = [];

            // Get market details
            const { marketDetails } = await CapitalMarkets(this.tokens, { epics: this.config?.epic });
            this.openingHours = marketDetails?.[0]?.instrument?.openingHours;

            // Check if market is open
            if (getMarketStatus(new Date(), this.openingHours, 5) !== "open") {
                this.log(`MARKET CLOSED for '${this.config?.epic}'`);
                return;
            }

            // Get market prices
            const { prices, error } = await CapitalPrices(this.tokens, this.config);
            if (!prices || prices.length === 0 || error) {
                this.log(`[PRICES ERROR] -> ${JSON.stringify(error)}`);
                return;
            }

            // Map prices to candles
            this.data = prices.map(toCandle);

            // Log startup information
            this.log(`[START] Size: ${Number(this.config?.orderSize)}`)
            this.log(`[START] Epic: ${this.config?.epic}`)
            this.log(`[START] Timeframe: ${this.config?.timeframe}`)
            this.log(`[START] Environment: ${this.config?.environment}`)
            this.log(`[START] Syncing candles...`)

        }

        // Start stream
        this.stream = await CapitalStream(this.tokens, this.config, this.onUpdate.bind(this), console.error);

        // Reauthenticate in 8 minutes
        this.reauth = setTimeout(async () => { await delay(3000); this.start(); }, 8 * 60 * 1000);
    }


    stop() {
        this.log(`[STOP] Stopping bot...`);
        this.stream?.();
        clearTimeout(this.reauth);
        this.open = null;
        this.data = [];
    }
}

export default TradingBot;