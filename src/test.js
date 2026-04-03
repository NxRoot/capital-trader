process.removeAllListeners('warning');

const { test } = require('./utils/testing');
const { writeFileSync, unlinkSync } = require('fs');
const { exec } = require('child_process');
const { join } = require('path');
const { conf, delay, configDir } = require('./utils/constant');


// ##################################################
// #                 Global Variables               #
// ##################################################

const config = conf(["username", "password", "apiKey"])
const tokens = { apiKey: config?.apiKey }


// ##################################################
// #                   Initialize                   #
// ##################################################

const main = async () => {

    const { profit, drawdown, roi, winRate, totalTrades, finalBalance, balance, available, diffHours, candles, login, strategy } = await test(tokens, config)

    console.log("")
    console.log("Strategy Results")
    console.log("----------------------------")
    console.log("Candles:", candles?.length)
    console.log("Environment:", config?.environment)
    console.log("Currency:", login?.account?.currencyIsoCode)
    console.log("Total Balance:", balance)
    console.log("Available Balance:", available)
    console.log("----------------------------")
    console.log("Epic:", config?.epic)
    console.log("Timeframe:", config?.timeframe)
    console.log("Order Size:", Number(config?.orderSize))
    console.log("----------------------------")
    console.log("Trades:", strategy?.win, "/", totalTrades)
    console.log("Duration:", diffHours + "h")
    console.log("Win Rate:", winRate + "%")
    console.log("----------------------------")
    console.log("Balance:", finalBalance)
    console.log("Profit:", profit)
    console.log("Drawdown:", drawdown)
    console.log("ROI:", roi + "%")
    // console.log("----------------------------")

    // for(let i = 0; i < strategy?.result?.length; i++) {
    //     if(i % 2 === 0) {
    //         const open = strategy?.result[i]
    //         const close = strategy?.result[i + 1]
    //         console.log(`${new Date(open?.time).toLocaleString()} | ${open?.close?.toFixed(2)} -> ${close?.close?.toFixed(2)} | PROFIT: ${close?.reward?.toFixed(2)}`)
    //     }
    // }

    console.log("")

    if (strategy?.result?.length <= 0) {
        console.log("No trades were made. Please try again with a different strategy.\n")
        return process.exit(1)
    }

    // --- Build dashboard data ---
    const trades = []
    let cumPnl = 0
    const equityCurve = [{ time: strategy?.result?.[0]?.time ?? Date.now(), value: 0 }]

    for (let i = 0; i < strategy?.result?.length; i++) {
        if (i % 2 === 0) {
            const open = strategy?.result[i]
            const close = strategy?.result[i + 1]
            if (!close) continue
            const tradePnl = parseFloat((close?.reward ?? 0).toFixed(4))
            cumPnl = parseFloat((cumPnl + tradePnl).toFixed(4))
            trades.push({
                index: trades.length + 1,
                direction: open?.direction,
                openTime: open?.time,
                closeTime: close?.time,
                openPrice: open?.close,
                closePrice: close?.close,
                profit: tradePnl,
                cumPnl,
            })
            equityCurve.push({ time: close?.time, value: cumPnl })
        }
    }

    const dashboardData = {
        meta: {
            candles: candles?.length,
            environment: config?.environment,
            currency: login?.account?.currencyIsoCode,
            epic: config?.epic,
            timeframe: config?.timeframe,
            orderSize: config?.orderSize,
            generatedAt: new Date().toISOString(),
        },
        account: { balance, available, finalBalance },
        metrics: { profit, drawdown, roi, winRate, totalTrades, wins: strategy?.win, diffHours },
        trades,
        equityCurve,
        candles,
    }

    const html = generateDashboard(dashboardData)
    const outPath = join(configDir, 'dashboard.html')
    writeFileSync(outPath, html)

    const openCmd = process.platform === 'win32'
        ? `start "" "${outPath}"`
        : process.platform === 'darwin'
            ? `open "${outPath}"`
            : `xdg-open "${outPath}"`
    exec(openCmd)

    await delay(1000)

    unlinkSync(outPath)
}


// ##################################################
// #                 HTML Dashboard                 #
// ##################################################

function generateDashboard(data) {
    const { meta, account, metrics, trades, equityCurve, candles } = data

    // Build markers for lightweight-charts
    let index = 0;
    const markers = []
    for (const trade of trades) {
        const isBuy = trade.direction === 'BUY'
        const isShort = trade.direction === 'SELL' || trade.direction === 'SHORT'
        const isWin = trade.profit >= 0
        index++;
        // Open marker
        markers.push({
            time: Math.floor(trade.openTime / 1000),
            position: isBuy ? 'belowBar' : 'aboveBar',
            color: isBuy ? '#00e676' : '#ff1744',
            shape: isBuy ? 'arrowUp' : 'arrowDown',
            text: index.toString(),
            size: 1,
        })

        // Close marker
        markers.push({
            time: Math.floor(trade.closeTime / 1000),
            position: isWin ? 'aboveBar' : 'belowBar',
            color: isWin ? '#00e676' : '#ff1744',
            shape: isWin ? 'circle' : 'square',
            text: isWin ? '✓' : '✗',
            size: 1,
        })
    }
    markers.sort((a, b) => a.time - b.time)

    // Candle data for lightweight-charts (seconds)
    const chartCandles = candles.map(c => ({
        time: Math.floor(c.timestamp / 1000),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume ?? 0,
    })).sort((a, b) => a.time - b.time)

    // Deduplicate by time (keep last)
    const candleMap = new Map()
    for (const c of chartCandles) candleMap.set(c.time, c)
    const dedupedCandles = Array.from(candleMap.values()).sort((a, b) => a.time - b.time)

    // Equity curve for Chart.js
    const eqLabels = equityCurve.map(p => new Date(p.time).toLocaleString())
    const eqValues = equityCurve.map(p => p.value)

    const dataJson = JSON.stringify({ markers, candles: dedupedCandles, eqLabels, eqValues })

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Strategy Dashboard — ${meta.epic} ${meta.timeframe}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0d1117; color: #e6edf3; font-family: 'Segoe UI', system-ui, sans-serif; font-size: 14px; }
  a { color: inherit; text-decoration: none; }

  .header {
    padding: 16px 24px 16px;
    border-bottom: 1px solid #21262d;
    display: flex;
    align-items: baseline;
    gap: 12px;
    flex-wrap: wrap;
  }
  .header h1 { font-size: 20px; font-weight: 600; color: #e6edf3; }
  .header .sub { color: #8b949e; font-size: 13px; }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    background: #161b22;
    border: 1px solid #30363d;
    color: #8b949e;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .badge.live { border-color: #ef5350; color: #ef5350; }
  .badge.demo { border-color: #26a69a; color: #26a69a; }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1px;
    background: #21262d;
    border-bottom: 1px solid #21262d;
  }
  .stat {
    background: #0d1117;
    padding: 16px 20px;
  }
  .stat .label { font-size: 11px; color: #8b949e; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
  .stat .value { font-size: 22px; font-weight: 700; line-height: 1; }
  .stat .sub { font-size: 11px; color: #8b949e; margin-top: 4px; }
  .green { color: #26a69a; }
  .red { color: #ef5350; }
  .neutral { color: #e6edf3; }

  .section { padding: 20px 24px 0; }
  .section-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #8b949e;
    margin-bottom: 12px;
  }

  .charts-row {
    display: flex;
    gap: 12px;
    align-items: stretch;
  }
  .chart-col { display: flex; flex-direction: column; }
  .chart-col.main { flex: 3; min-width: 0; }
  .chart-col.equity { flex: 1; min-width: 0; }

  #chart-container {
    flex: 1;
    min-height: 320px;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid #21262d;
  }

  #equity-container {
    flex: 1;
    min-height: 200px;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid #21262d;
    background: #161b22;
    position: relative;
  }
  #equity-canvas { width: 100% !important; height: 100% !important; }

  .trades-section { padding: 20px 24px 40px; overflow-x: auto; }

  @media (max-width: 640px) {
    .chart-col.equity .section-title { margin-bottom: 10px; }
    .chart-col.equity > div[style*="height:28px"] { display: none; }

    .header { padding: 14px 16px 12px; }
    .section { padding: 14px 16px 0; }
    .trades-section { padding: 14px 16px 32px; }
    .meta-row { padding: 10px 16px; }

    .charts-row { flex-direction: column; }
    .chart-col.main { flex: none; }
    .chart-col.equity { flex: none; }

    #chart-container { min-height: 260px; }
    #equity-container { min-height: 160px; }

    table { font-size: 12px; }
    thead th, tbody td { padding: 7px 8px; }
  }
  .trades-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .trades-count { font-size: 12px; color: #8b949e; }

  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead th {
    text-align: left;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #8b949e;
    border-bottom: 1px solid #21262d;
    white-space: nowrap;
  }
  tbody tr { border-bottom: 1px solid #161b22; transition: background 0.1s; }
  tbody tr:hover { background: #161b22; }
  tbody td { padding: 9px 12px; white-space: nowrap; }
  .dir-buy { color: #00e676; font-weight: 600; }
  .dir-sell { color: #ff1744; font-weight: 600; }
  .pnl-pos { color: #26a69a; }
  .pnl-neg { color: #ef5350; }
  .mono { font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace; }

  .legend {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }
  .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #8b949e; }
  .legend-dot {
    width: 10px; height: 10px; border-radius: 50%;
    display: inline-block;
  }
  .legend-square {
    width: 10px; height: 10px;
    display: inline-block;
  }
  .legend-arrow-up { color: #00e676; font-size: 14px; line-height: 1; }
  .legend-arrow-dn { color: #ff1744; font-size: 14px; line-height: 1; }

  .meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    padding: 12px 24px;
    border-top: 1px solid #21262d;
    background: #0d1117;
  }
  .meta-item { font-size: 12px; color: #8b949e; }
  .meta-item span { color: #e6edf3; margin-left: 4px; }
</style>
</head>
<body>

<div class="header">
  <h1>Strategy Dashboard</h1>
  <div class="sub">${meta.epic} &nbsp;·&nbsp; ${meta.timeframe} &nbsp;·&nbsp; ${new Date(meta.generatedAt).toLocaleString()}</div>
  <span class="badge ${meta.environment === 'live' ? 'live' : 'demo'}">${meta.environment}</span>
</div>

<div class="stats">
  <div class="stat">
    <div class="label">Net Profit</div>
    <div class="value ${metrics.profit >= 0 ? 'green' : 'red'}">${metrics.profit >= 0 ? '+' : ''}${metrics.profit.toFixed(2)} <span style="font-size:13px;font-weight:400">${meta.currency}</span></div>
    <div class="sub">Final balance: ${account.finalBalance.toFixed(2)}</div>
  </div>
  <div class="stat">
    <div class="label">ROI</div>
    <div class="value ${metrics.roi >= 0 ? 'green' : 'red'}">${metrics.roi >= 0 ? '+' : ''}${metrics.roi}%</div>
    <div class="sub">On ${account.balance.toFixed(2)} ${meta.currency}</div>
  </div>
  <div class="stat">
    <div class="label">Win Rate</div>
    <div class="value neutral">${isNaN(metrics.winRate) ? '—' : metrics.winRate + '%'}</div>
    <div class="sub">${metrics.wins} wins / ${metrics.totalTrades} trades</div>
  </div>
  <div class="stat">
    <div class="label">Max Drawdown</div>
    <div class="value red">-${metrics.drawdown.toFixed(2)} <span style="font-size:13px;font-weight:400">${meta.currency}</span></div>
    <div class="sub">Worst open loss</div>
  </div>
  <div class="stat">
    <div class="label">Duration</div>
    <div class="value neutral">${metrics.diffHours}h</div>
    <div class="sub">${meta.candles} candles</div>
  </div>
  <div class="stat">
    <div class="label">Order Size</div>
    <div class="value neutral">${meta.orderSize}</div>
    <div class="sub">${meta.epic}</div>
  </div>
</div>

<div class="section">
  <div class="charts-row">
    <div class="chart-col main">
      <div class="section-title">Price Chart</div>
      <div class="legend">
        <div class="legend-item"><span class="legend-arrow-up">▲</span> BUY open</div>
        <div class="legend-item"><span class="legend-arrow-dn">▼</span> SELL open</div>
        <div class="legend-item"><span class="legend-dot" style="background:#00e676"></span> Close (profit)</div>
        <div class="legend-item"><span class="legend-square" style="background:#ff1744"></span> Close (loss)</div>
      </div>
      <div id="chart-container"></div>
    </div>
    <div class="chart-col equity">
      <div class="section-title">Equity Curve</div>
      <div style="height:28px"></div>
      <div id="equity-container">
        <canvas id="equity-canvas"></canvas>
      </div>
    </div>
  </div>
</div>

<div class="trades-section">
  <div class="trades-header">
    <div class="section-title" style="margin-bottom:0">Trade Log</div>
    <div class="trades-count">${metrics.totalTrades} trades &nbsp;·&nbsp; ${metrics.wins} wins &nbsp;·&nbsp; ${metrics.totalTrades - metrics.wins} losses</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Direction</th>
        <th>Open Time</th>
        <th>Close Time</th>
        <th>Open Price</th>
        <th>Close Price</th>
        <th>P&amp;L (${meta.currency})</th>
        <th>Cum. P&amp;L</th>
      </tr>
    </thead>
    <tbody id="trade-tbody">
    </tbody>
  </table>
</div>

<div class="meta-row">
  <div class="meta-item">Environment:<span>${meta.environment}</span></div>
  <div class="meta-item">Currency:<span>${meta.currency}</span></div>
  <div class="meta-item">Balance:<span>${account.balance} ${meta.currency}</span></div>
  <div class="meta-item">Available:<span>${account.available} ${meta.currency}</span></div>
  <div class="meta-item">Generated:<span>${new Date(meta.generatedAt).toLocaleString()}</span></div>
</div>

<script src="https://unpkg.com/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script>
const DASH = ${dataJson};
const TRADES = ${JSON.stringify(trades)};

// ── Candlestick chart ──────────────────────────────────────────────
(function() {
  const container = document.getElementById('chart-container');
  const chart = LightweightCharts.createChart(container, {
    layout: {
      background: { type: 'solid', color: '#161b22' },
      textColor: '#8b949e',
    },
    grid: {
      vertLines: { color: '#21262d' },
      horzLines: { color: '#21262d' },
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
      vertLine: { color: '#8b949e', width: 1, style: 3 },
      horzLine: { color: '#8b949e', width: 1, style: 3 },
    },
    rightPriceScale: { borderColor: '#30363d' },
    timeScale: { borderColor: '#30363d', timeVisible: true, secondsVisible: false },
    width: container.clientWidth,
    height: container.clientHeight,
  });

  const series = chart.addCandlestickSeries({
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderUpColor: '#26a69a',
    borderDownColor: '#ef5350',
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
  });

  series.setData(DASH.candles);

  if (DASH.markers.length > 0) {
    series.setMarkers(DASH.markers);
  }

  // Volume series
  const volSeries = chart.addHistogramSeries({
    color: '#26a69a',
    priceFormat: { type: 'volume' },
    priceScaleId: 'volume',
    scaleMargins: { top: 0.85, bottom: 0 },
  });
  chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
  const volData = ${JSON.stringify(dedupedCandles.map(c => ({
        time: c.time,
        value: c.volume ?? 0,
        color: c.close >= c.open ? '#26a69a44' : '#ef535044',
    })))};
  volSeries.setData(volData);

  chart.timeScale().fitContent();

  const ro = new ResizeObserver(() => {
    chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
  });
  ro.observe(container);
})();

// ── Equity curve ──────────────────────────────────────────────────
(function() {
  const ctx = document.getElementById('equity-canvas').getContext('2d');
  const values = DASH.eqValues;
  const borderColor = values[values.length - 1] >= 0 ? '#26a69a' : '#ef5350';
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: DASH.eqLabels,
      datasets: [{
        data: values,
        borderColor,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: borderColor,
        fill: true,
        backgroundColor: (ctx) => {
          const grad = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
          grad.addColorStop(0, borderColor + '44');
          grad.addColorStop(1, borderColor + '00');
          return grad;
        },
        tension: 0.3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: '#161b22',
          borderColor: '#30363d',
          borderWidth: 1,
          titleColor: '#8b949e',
          bodyColor: '#e6edf3',
          callbacks: {
            label: (ctx) => ' P&L: ' + (ctx.raw >= 0 ? '+' : '') + ctx.raw.toFixed(4),
          },
        },
      },
      scales: {
        x: {
          display: false,
          ticks: { maxTicksLimit: 8, color: '#8b949e', font: { size: 11 } },
          grid: { color: '#21262d' },
        },
        y: {
          ticks: { color: '#8b949e', font: { size: 11 } },
          grid: { color: '#21262d' },
          border: { color: '#30363d' },
        },
      },
    },
  });
})();

// ── Trade table ───────────────────────────────────────────────────
(function() {
  const tbody = document.getElementById('trade-tbody');
  for (const t of TRADES) {
    const isWin = t.profit >= 0;
    const isBuy = t.direction === 'BUY';
    const row = document.createElement('tr');
    row.innerHTML = \`
      <td class="mono" style="color:#8b949e">\${t.index}</td>
      <td class="\${isBuy ? 'dir-buy' : 'dir-sell'}">\${isBuy ? '▲ BUY' : ('▼ ' + t.direction)}</td>
      <td style="color:#8b949e">\${new Date(t.openTime).toLocaleString()}</td>
      <td style="color:#8b949e">\${new Date(t.closeTime).toLocaleString()}</td>
      <td class="mono">\${t.openPrice.toFixed(4)}</td>
      <td class="mono">\${t.closePrice.toFixed(4)}</td>
      <td class="mono \${isWin ? 'pnl-pos' : 'pnl-neg'}">\${isWin ? '+' : ''}\${t.profit.toFixed(4)}</td>
      <td class="mono \${t.cumPnl >= 0 ? 'pnl-pos' : 'pnl-neg'}">\${t.cumPnl >= 0 ? '+' : ''}\${t.cumPnl.toFixed(4)}</td>
    \`;
    tbody.appendChild(row);
  }
})();
</script>
</body>
</html>`
}

main()