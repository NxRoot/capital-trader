import { overlay, chartStyles, calculateIndicators, setIndicators, indicators } from '@/utils/chart.ts';
import { init, dispose, Chart as KChart, registerIndicator } from 'klinecharts'
import { getMarketStatus } from '@/utils/capital.ts';
import { simulate } from '@/utils/strategy.ts';
import { useEffect, useRef } from 'react';

const Chart: React.FC<{ data: any[], cfg: any, indicatorsList: any[], onStatsChange: (stats: any) => void }> = ({ data, cfg, indicatorsList, onStatsChange }) => {

    const chart = useRef<KChart | null>(null)

    const refresh = () => {
        const arr = calculateIndicators(data, indicatorsList)
        const res = simulate(arr, cfg.strategyCode, Number(cfg.orderSize), (date: Date) => getMarketStatus(date, cfg.openingHours, 5))
        chart.current?.removeOverlay()
        if (res.result.length > 0) {
            let i = 0
            for (let index = 0; index < res.result.length; index++) {
                if (index % 2 === 0) {
                    i++
                    const open = res.result[index]
                    const close = res.result[index + 1]
                    if (open) chart.current?.createOverlay(overlay(open.direction === "BUY", { timestamp: open.time, value: open.close, index: i }))
                    if (close) chart.current?.createOverlay(overlay(open.direction === "SELL", { timestamp: close.time, value: close.close, index: i }))
                }
            }
        }
        onStatsChange(res)
    }

    useEffect(() => {

        registerIndicator(indicators?.find(ind => ind.name === 'STR'))
        chart.current = init('kchart')
        chart.current?.setStyles('dark')
        chart.current?.setStyles(chartStyles)

        const onResize = () => chart.current?.resize()
        window.addEventListener("resize", onResize)

        return () => {
            dispose('kchart')
            window.removeEventListener("resize", onResize)
        }
    }, [])

    useEffect(() => {
        if (!chart.current || !data.length) return
        indicators.forEach(ind => {
            chart.current?.removeIndicator("candle_pane", ind.name)
            chart.current?.removeIndicator("visible", ind.name)
            chart.current?.removeIndicator("xaxis_pane", ind.name)
        })
        setIndicators(chart.current, indicatorsList)
    }, [indicatorsList, data])

    useEffect(() => {
        if (chart.current && data.length > 0) {
            chart.current.applyNewData(data, true, refresh)
        }
    }, [data])

    useEffect(() => { refresh() }, [cfg?.strategyCode, cfg?.orderSize, cfg?.direction, JSON.stringify(indicatorsList)])

    return <div id="kchart" style={{ width: "100%", height: "100%" }} />
}

export default Chart;