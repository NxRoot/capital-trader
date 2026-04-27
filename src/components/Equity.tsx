import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

interface EquityChartProps {
  trades: any[]
  orderSize: number
  isDark?: boolean
}

function buildEquityPoints(trades: any[], orderSize: number) {
  const points: number[] = [0]
  let cumProfit = 0
  let openEntry: any | null = null

  for (const trade of trades) {
    if (trade.type === 'BUY') {
      openEntry = trade
    } else if (trade.type === 'SELL' && openEntry) {
      let reward: number
      if (trade.direction === 'SELL' || trade.direction === 'SHORT') {
        reward = (openEntry.close - trade.close) * orderSize
      } else {
        reward = (trade.close - openEntry.close) * orderSize
      }
      cumProfit += reward
      points.push(cumProfit)
      openEntry = null
    }
  }
  return points
}

export default function Equity({ trades, orderSize, isDark = true }: EquityChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  // Destroy on unmount
  useEffect(() => {
    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [])

  // Create or update chart
  useEffect(() => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return

    const equityPoints = buildEquityPoints(trades, orderSize)
    const labels = equityPoints.map((_, i) => (i === 0 ? 'Start' : `T${i}`))
    const isPositive = (equityPoints[equityPoints.length - 1] ?? 0) >= 0

    const textColor = isDark ? '#666666' : '#888888'
    const gridColor = isDark ? '#1a1a1a' : '#f0f0f0'
    const lineColor = isPositive ? '#22c55e' : '#ef4444'
    const fillColor = isPositive ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)'

    if (chartRef.current) {
      // Update existing chart data without recreating
      const ds = chartRef.current.data.datasets[0] as any
      chartRef.current.data.labels = labels
      ds.data = equityPoints
      ds.borderColor = lineColor
      ds.backgroundColor = fillColor
      chartRef.current.update('none')
      return
    }

    chartRef.current = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Equity',
            data: equityPoints,
            borderColor: lineColor,
            backgroundColor: fillColor,
            borderWidth: 1.5,
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 3,
          },
        ],
      },
      options: {
        // Disable Chart.js responsive resizing — we manage sizing ourselves
        responsive: false,
        maintainAspectRatio: false,
        animation: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
            borderColor: isDark ? '#272727' : '#e0e0e0',
            borderWidth: 1,
            titleColor: textColor,
            bodyColor: isDark ? '#f0f0f0' : '#0a0a0a',
            padding: 8,
            callbacks: {
              label: (ctx) => {
                const y = ctx.parsed.y ?? 0
                return ` ${y >= 0 ? '+' : ''}${y.toFixed(2)}`
              },
            },
          },
        },
        scales: {
          x: { display: false },
          y: {
            grid: { color: gridColor },
            border: { display: false },
            ticks: {
              color: textColor,
              font: { size: 10 },
              maxTicksLimit: 5,
              callback: (v) => `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(0)}`,
            },
          },
        },
      },
    })
  }, [trades, orderSize, isDark])

  return (
    <div ref={wrapperRef} className="w-full h-full relative overflow-hidden">
      <canvas ref={canvasRef} />
    </div>
  )
}
