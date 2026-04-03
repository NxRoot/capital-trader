# Capital Trader CLI

An automated trading bot for [Capital.com](https://capital.com) with AI-powered strategy generation via Claude or ChatGPT.

<img width="100%" height="100%" alt="dashboard" src="https://github.com/user-attachments/assets/8e64224c-7dd6-4038-8665-b33669eff8a1" />

## Features

- **Capital Live Trading** — Connects to Capital.com via REST API and WebSocket for real-time order execution
- **AI Strategy Generation** — Uses AI to generate, backtest, and optimize trading strategies from natural language
- **Backtesting Dashboard** — Simulates strategies on historical data and opens HTML with performance metrics
- **Demo & Live Support** — Switch between demo and live environments by editing configuration file
- **Extremely Flexible** — Runs on any device including Raspberry Pi, VPS, or low-power servers

## Requirements

- [Node.js](https://nodejs.org/en) 18+
- [Capital.com](https://capital.com) account with API key
- [Anthropic API key](https://console.anthropic.com) (for AI strategy generation)

## Installation

Install CLI
```perl
npm i -g capital-trader
```

## Configuration

Edit `~/.capital/config.json`

```json
{
  "username": "your-capital-username",
  "password": "your-capital-password",
  "apiKey": "your-capital-api-key",
  "anthropicKey": "sk-ant-...",
  "environment": "demo",
  "epic": "BTCUSD",
  "orderSize": "0.025",
  "timeframe": "MINUTE_15",
  "max": "1000",
  "tokens": "10000",
  "retries": "3"
}
```

| Key | Description | Example |
|-----|-------------|---------|
| `username` | Capital.com login email | `user@example.com` |
| `password` | Capital.com password | |
| `apiKey` | Capital.com API key | |
| `anthropicKey` | Anthropic Claude API key | `sk-ant-...` |
| `environment` | `"demo"` or `"live"` | `"demo"` |
| `epic` | Market identifier | `"BTCUSD"`, `"EURUSD"` |
| `orderSize` | Position size per trade | `"0.025"` |
| `timeframe` | Candle interval | `"MINUTE_15"`, `"MINUTE_5"` |
| `max` | Historical candles to fetch | `"1000"` |
| `tokens` | Max AI tokens to use | `"10000"` |
| `retries` | Max AI generation retries | `"3"` |


## Usage

```bash
# Start bot
capital

# Test strategy
capital test

# Get config path
capital config

# Set config value
capital set orderSize 0.005

# Reset strategy
capital clear
```

## AI Strategy Generation

Pass any natural language instruction to the CLI:

```bash
capital "make the strategy more conservative"
capital "only trade during strong trend conditions"
```

If the new strategy underperforms, it is automatically discarded. 

## Project Structure

```
src/
├── cli.js              # Entry point and command router
├── bot.js              # Live trading loop
├── ai.js               # AI strategy generation and validation
├── cfg.js              # Output config path and values
├── test.js             # Backtesting and dashboard generation
├── set.js              # Config setter
├── clear.js            # Strategy reset
└── utils/
    ├── capital.js      # Capital.com API client (REST + WebSocket)
    ├── strategy.js     # Strategy simulator and indicator calculations
    ├── generate.js     # Claude/OpenAI API calls
    ├── testing.js      # Backtesting engine
    └── constant.js     # Config loader and utilities
```

## Disclaimer

This software is for educational purposes. Automated trading carries significant financial risk. Always test thoroughly on a demo account before using real funds. Past backtest performance does not guarantee future results.

## &nbsp;
⭐ &nbsp;If you find this useful!
