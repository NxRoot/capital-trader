# Capital Trader

An automated trading bot for [Capital.com](https://capital.com) with chart, indicators and strategy builder.

<img width="100%" height="100%" alt="dashboard" src="https://i.ibb.co/BH8kQ7nb/Captura-de-ecr-2026-04-24-191839.png" />

## Features

- **Capital Live Trading** — Connects to Capital.com via REST API and WebSocket for real-time order execution
- **Strategy Dashboard** — Create your own strategies using a conditional trade system with chart and indicators
- **Extremely Flexible** — Runs on any device with a terminal including Raspberry Pi, VPS, or low-power servers

## Requirements

- [Node.js](https://nodejs.org/en) 18+
- [Capital.com](https://capital.com) account with API key

## Installation

```perl
npm i -g capital-trader
```

## Usage (Terminal)

1 - Start the bot and open dashboard

```py
capital
```


>
> The URL displayed in your terminal can be opened in any device in the same network




2 - Create a new strategy using editor

<img width="35%" height="100%" alt="dashboard" src="https://i.ibb.co/svBMLPJM/Captura-de-ecr-2026-04-26-043346.png" />

3 - Start live trading using Bot Server 

<img width="35%" height="100%" alt="dashboard" src="https://i.ibb.co/WvjwZ9kh/Captura-de-ecr-2026-04-26-234041.png" />


## Disclaimer

Automated trading carries significant financial risk. Always test thoroughly on a demo account before using real funds. Past backtest performance does not guarantee future results. The strategy results using HIGHLOW indicator are not 100% accurate because high lows are calculated from future data, if you use it in live trading it might trigger signals earlier.

## &nbsp;
⭐ &nbsp;If you find this useful!
