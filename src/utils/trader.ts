import { CapitalOpen, CapitalClose, CapitalLogin, CapitalMarkets, CapitalPrices, CapitalStream, toCandle, getMarketStatus } from "@/utils/capital";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { calculateIndicators } from "@/utils/chart";
import { simulate } from "@/utils/strategy";
import { homedir } from "os";
import { join } from "path";

// Function to create a delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Config directory and path
const configDir = join(homedir(), '.capital');
const configPath = join(configDir, 'config.json');

// Function to load configuration from a JSON file
const conf = () => {
    if (!existsSync(configPath)) {
        if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true });
        copyFileSync(join(__dirname, '..', '..', 'config.json'), configPath);
    }
    return JSON.parse(readFileSync(configPath, 'utf-8'));
}

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

        this.config = conf();
        this.tokens = { apiKey: this.config?.apiKey };

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

    setConfig(config: any) {
        this.config = config;
        writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    }

    async openPosition(trade) {
        const order = await CapitalOpen(this.tokens, { epic: this.config.epic, direction: trade.direction, size: Number(this.config.orderSize) });
        if (!order.error && order?.dealId && trade?.direction) {
            this.open = { direction: trade.direction, price: order?.level, dealId: order?.dealId };
            this.log(`[OPEN-${trade?.direction}] Price: ${order?.level?.toFixed(4)}`);
        } else {
            this.log(`[ERROR] ${JSON.stringify(order.error)}`);
        }
    }

    async closePosition(price) {
        const order = await CapitalClose(this.tokens, this.open?.dealId);
        if (!order.error) {
            const currentPrice = price * Number(this.config.orderSize);
            const openPrice = this.open.price * Number(this.config.orderSize);
            const profit = this.open?.direction === "BUY" ? currentPrice - openPrice : openPrice - currentPrice;
            this.log(`[CLOSE-${this.open?.direction}] Price: ${price?.toFixed(4)} | Profit: ${profit?.toFixed(2)}`);
            this.open = null;
        } else {
            this.log(`[ERROR] ${JSON.stringify(order.error)}`);
        }
    }

    async onUpdate(payload) {

        // Sync last candle
        if (payload?.timestamp === this.data?.[this.data?.length - 1]?.timestamp) {
            return this.log(`[HOLD] Same timestamp, syncing...`);
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

        // Check for trade
        const trade = simulation?.result?.find((t) => t?.time === indicators?.[indicators?.length - 1]?.timestamp);

        // Open position
        if (trade?.type === "BUY" && !this.open?.dealId) await this.openPosition(trade);

        // Close position
        else if (trade?.type === "SELL" && this.open?.dealId) await this.closePosition(price); 
        
        // Hold position
        else this.log(`[HOLD] Looking to ${this.open?.dealId ? "CLOSE" : "OPEN"} trade...`);
    }

    async start() {
        if (!this.config?.apiKey || !this.config?.username || !this.config?.password) {
            return;
        }

        this.log(`[START] Starting bot...`);

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

            // Get market details
            const { marketDetails } = await CapitalMarkets(this.tokens, { epics: this.config?.epic });
            this.openingHours = marketDetails?.[0]?.instrument?.openingHours;

            // Check if market is open
            if (getMarketStatus(new Date(), this.openingHours, 5) !== "open") {
                this.log(`MARKET CLOSED for '${this.config?.epic}'`);
                this.log(this.openingHours);
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