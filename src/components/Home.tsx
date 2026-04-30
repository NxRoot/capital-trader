import Chart from "@/components/Chart";
import { Conditions } from "@/components/Conditions";
import Drawer from "@/components/Drawer";
import Equity from "@/components/Equity";
import Indicators from "@/components/Indicators";
import Markets from "@/components/Markets";
import PushConfig from "@/components/Push";
import { toCandle, CapitalPrices, CapitalMarkets } from "@/utils/capital";
import { indicators as INDICATORS, TIMEFRAME_OPTIONS } from "@/utils/chart";
import { generateStrategyCode } from "@/utils/generate";
import { DEFAULT_CONFIG, exportConfig, importConfig, saveConfig } from "@/utils/storage";
import { useCallback, useEffect, useMemo, useState } from "react";

const cleanConfig = (config: any) => {
  delete config.account;
  delete config.cst;
  delete config.securityToken;
  return config;
}

export default function Home({ cfg }: { cfg: any }) {

  const [openGroups, setOpenGroups] = useState<any[]>(cfg.openGroups ?? []);
  const [closeGroups, setCloseGroups] = useState<any[]>(cfg.closeGroups ?? []);
  const [openConnection, setOpenConnection] = useState<"AND" | "OR">(cfg.openConnection ?? "AND");
  const [closeConnection, setCloseConnection] = useState<"AND" | "OR">(cfg.closeConnection ?? "AND");
  const [indicators, setIndicators] = useState<any[]>(cfg.indicators ?? INDICATORS);
  const [openingHours, setOpeningHours] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [config, setConfig] = useState<any>(cfg);
  const [candles, setCandles] = useState<any[]>([]);
  const [open, setOpen] = useState("");
  const [initial, setInitial] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);

  const fetchPrices = useCallback(async () => {
    try {
      const result = await CapitalPrices(config, config)
      const { marketDetails } = await CapitalMarkets(config, { epics: config?.epic })
      setOpeningHours(marketDetails?.[0]?.instrument?.openingHours)
      const c = (result?.prices || []).map(toCandle)
      setInitial(c)
      setCandles(c)
      setIdx(c.length)
    } catch (err) {
      console.error(err)
    }
  }, [config])

  const resetChanges = () => {
    editConfig({
      ...config,
      strategyCode: cfg?.strategyCode ?? DEFAULT_CONFIG.strategyCode,
      openGroups: cfg?.openGroups ?? DEFAULT_CONFIG.openGroups,
      closeGroups: cfg?.closeGroups ?? DEFAULT_CONFIG.closeGroups,
      openConnection: cfg?.openConnection ?? DEFAULT_CONFIG.openConnection,
      closeConnection: cfg?.closeConnection ?? DEFAULT_CONFIG.closeConnection
    })
    setOpenGroups(cfg?.openGroups ?? DEFAULT_CONFIG.openGroups)
    setCloseGroups(cfg?.closeGroups ?? DEFAULT_CONFIG.closeGroups)
    setOpenConnection(cfg?.openConnection ?? DEFAULT_CONFIG.openConnection)
    setCloseConnection(cfg?.closeConnection ?? DEFAULT_CONFIG.closeConnection)
  }

  const handleImportConfig = async () => {
    const c = await importConfig()
    delete c?.username
    delete c?.password
    delete c?.apiKey
    delete c?.environment
    editConfig(c)
    setOpenGroups(c?.openGroups ?? DEFAULT_CONFIG.openGroups)
    setCloseGroups(c?.closeGroups ?? DEFAULT_CONFIG.closeGroups)
    setOpenConnection(c?.openConnection ?? DEFAULT_CONFIG.openConnection)
    setCloseConnection(c?.closeConnection ?? DEFAULT_CONFIG.closeConnection)
  }

  const moveIndex = (n = 1) => {
    let i = idx + n
    if (candles.length + n >= initial.length) i = initial.length
    if (candles.length === 0) return
    setIdx(i)
    setCandles(initial.slice(0, i))
  }

  const editConfig = (cc) => {
    setConfig({ ...config, ...cc });
    saveConfig(cleanConfig({ ...config, ...cc }));
  }

  const handleExportConfig = () => { exportConfig(cleanConfig({ ...config, openGroups, closeGroups, openConnection, closeConnection })) }
  const saveChanges = () => { editConfig({ openGroups, closeGroups, openConnection, closeConnection }); setOpen(""); }

  useEffect(() => editConfig({ indicators: indicators.map(ind => ({ ...ind, figures: undefined })) }), [indicators])
  useEffect(() => { fetchPrices() }, [config?.epic, config?.timeframe])
  useEffect(() => { editConfig({ strategyCode: generateStrategyCode(openGroups, closeGroups, openConnection, closeConnection, config?.direction) }) }, [openGroups, closeGroups, openConnection, closeConnection, config?.direction])

  const metrics = useMemo(() => {
    // Calculate duration
    const start = new Date(stats?.result?.[0]?.time);
    const end = new Date(stats?.result?.[stats?.result?.length - 1]?.time);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = stats?.result?.length > 0 ? (diffMs / (1000 * 60 * 60))?.toFixed(2) : 0;

    // Parse strategy results
    const balance = parseFloat((config?.account?.accountInfo?.balance ?? 0).toFixed(2))
    const profit = parseFloat(stats?.profit?.toFixed(2))
    const drawdown = parseFloat(stats?.drawdown?.toFixed(2))
    const totalTrades = Math.floor(stats?.result?.length / 2)
    const finalBalance = parseFloat((balance + profit).toFixed(2))
    const roi = parseFloat(((finalBalance - balance) / balance * 100).toFixed(2))
    const winRate = stats?.result?.length > 0 ? parseFloat((stats?.win / totalTrades * 100).toFixed(2)) : 0;
    return { diffHours, balance, profit, drawdown, totalTrades, finalBalance, roi, winRate }
  }, [stats])

  return (
    <div className="flex-1 flex p-0 gap-0 h-full gap-0 tracking-wide">

      <div className="flex-1 flex flex-col h-full">
        <div className="flex min-h-12 max-h-12 items-center text-sm border-b border-zinc-800 p-0 font-medium w-full">
          <div className="flex items-center text-base border-r border-zinc-800 h-full px-5 hover:bg-zinc-900 cursor-pointer text-center select-none truncate min-w-14" onClick={() => setOpen("markets")}>
            {config.epic}
          </div>
          <div className="flex items-center border-r border-zinc-800 h-full px-2 gap-1">
            {TIMEFRAME_OPTIONS?.map((option) => (
              <div key={option.value} onClick={() => editConfig({ timeframe: option.value })} className={`px-2 py-1 opacity-70 hover:bg-zinc-800 hover:opacity-100 cursor-pointer rounded-0 select-none ${config.timeframe === option.value ? 'bg-zinc-800 opacity-100' : ''}`}>
                {option.label}
              </div>
            ))}
          </div>
          <div className="flex-1"></div>
          <div title="BackBack" className={`w-7 h-7 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 hover:opacity-100 cursor-pointer rounded-0 font-normal select-none ml-2`} onClick={() => moveIndex(-10)}>
            {"<<"}
          </div>
          <div title="Back" className={`w-7 h-7 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 hover:opacity-100 cursor-pointer rounded-0 font-normal select-none ml-2`} onClick={() => moveIndex(-1)}>
            {"<"}
          </div>
          <div title="Forward" className={`w-7 h-7 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 hover:opacity-100 cursor-pointer rounded-0 font-normal select-none ml-2`} onClick={() => moveIndex(1)}>
            {">"}
          </div>
          <div title="ForwardBack" className={`w-7 h-7 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 hover:opacity-100 cursor-pointer rounded-0 font-normal select-none ml-2`} onClick={() => moveIndex(10)}>
            {">>"}
          </div>
          <div title="Bot server" className={`w-7 h-7 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 hover:opacity-100 cursor-pointer rounded-0 font-normal select-none ml-2`} onClick={() => setOpen("push")}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-database-zap-icon lucide-database-zap"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5V19A9 3 0 0 0 15 21.84" /><path d="M21 5V8" /><path d="M21 12L18 17H22L19 22" /><path d="M3 12A9 3 0 0 0 14.59 14.87" /></svg>
          </div>
          <div title="Refresh" className={`w-7 h-7 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 hover:opacity-100 cursor-pointer rounded-0 font-normal select-none ml-2`} onClick={fetchPrices}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
          </div>
          <div className={`px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 hover:opacity-100 cursor-pointer rounded-0 font-normal select-none mx-2`} onClick={() => setOpen("indicators")}>
            Indicators
          </div>
        </div>
        <div className="flex-1 p-2 pr-3">
          <Chart data={candles} cfg={{ ...config, openingHours }} indicatorsList={indicators} onStatsChange={setStats} />
        </div>
      </div>

      <div className="w-82 flex-shrink-0 border-l border-zinc-800 flex flex-col overflow-hidden h-full">
        <div className="flex flex-1 text-sm items-center border-b border-zinc-800 justify-between min-h-12 max-h-12  p-3 pr-2">
          <div className="text-base font-medium">Strategy</div>
          <div className={`px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 hover:opacity-100 cursor-pointer rounded-0 text-md select-none`} onClick={() => setOpen("strategy")}>
            Edit
          </div>
        </div>
        <div className="overflow-auto h-full text-sm pb-20">

          <div className="flex items-center justify-between border-b border-zinc-800 p-3 cursor-pointer select-none select-none" onClick={() => editConfig({ direction: config?.direction === 'BUY' ? 'SELL' : 'BUY' })}>
            <div>Direction</div>
            <div className={`text-green-500 ${config?.direction === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>{config?.direction?.toUpperCase()}</div>
          </div>
          <div className="flex items-center justify-between border-b border-zinc-800 p-3 relative">
            <input type="number" className="absolute right-0 left-0 top-0 bottom-0 w-full text-right text-blue-400 pr-3 pl-25 focus:outline-none focus:ring-0 focus:border-none" value={config?.orderSize} onChange={(e) => editConfig({ orderSize: e.target.value })} />
            <div>Order Size</div>
          </div>
          <div className="flex items-center justify-between border-b border-zinc-800 p-3 select-none">
            <div>Balance</div>
            <div>{config?.account?.currencySymbol} {metrics?.balance?.toFixed(2)}</div>
          </div>
          <div className="flex border-b border-zinc-800 p-2 pb-1">
            {stats?.result?.length > 0 ? (
              <Equity trades={stats?.result ?? []} orderSize={parseFloat(config?.orderSize)} />
            ) : (
              <div className="flex items-center justify-center h-40 w-full text-zinc-400">No trades to show</div>
            )}
          </div>

          <div className="flex items-center justify-between border-b border-zinc-800 p-3 select-none">
            <div>Profit</div>
            <div className={`${metrics?.profit === 0 ? '' : (metrics?.profit > 0 ? 'text-green-500' : 'text-red-500')}`}>{config?.account?.currencySymbol} {metrics?.profit.toFixed(2)}</div>
          </div>
          <div className="flex items-center justify-between border-b border-zinc-800 p-3 select-none">
            <div>Drawdown</div>
            <div className={`${metrics?.drawdown === 0 ? '' : 'text-red-500'}`}>{config?.account?.currencySymbol} {(metrics?.drawdown).toFixed(2)}</div>
          </div>
          <div className="flex items-center justify-between border-b border-zinc-800 p-3 select-none">
            <div>Win Rate</div>
            <div className={`${metrics?.winRate > 0 ? (metrics?.winRate > 65 ? 'text-green-500' : 'text-yellow-500') : (metrics?.winRate === 0 ? "" : (metrics?.winRate > 20 ? 'text-yellow-500' : 'text-red-500'))}`}>{metrics?.winRate.toFixed(2)} %</div>
          </div>
          <div className="flex items-center justify-between border-b border-zinc-800 p-3 select-none">
            <div>Duration</div>
            <div>{metrics?.diffHours} h</div>
          </div>
          <div className="flex items-center justify-between border-b border-zinc-800 p-3 select-none">
            <div>ROI</div>
            <div className={`${!metrics?.roi ? '' : (metrics?.roi > 0 ? 'text-green-500' : 'text-red-500')}`}>{!metrics?.roi ? '0.00' : Number(metrics?.roi).toFixed(2)} %</div>
          </div>
          <div className="flex items-center justify-between border-b border-zinc-800 p-3 select-none bg-zinc-900/30">
            <div>Trades</div>
            <div>{stats?.win ?? 0} / {metrics?.totalTrades ?? 0}</div>
          </div>
          <div className="flex items-center justify-center flex-col gap-1 p-1">
            {stats?.result?.map((_, index: number) => {
              if (index % 2 === 0) {
                const open = stats?.result[index]
                const close = stats?.result[index + 1]
                const value = (open.direction === 'BUY' ? close?.close - open?.close : open?.close - close?.close) * Number(config?.orderSize)
                const color = value > 0 ? 'text-green-500' : 'text-red-500'
                if (close) return (
                  <div key={index} className="border-b border-zinc-900 text-[12px] text-zinc-300 p-2 py-2.5 flex items-center justify-between w-full gap-4">
                    <div className="text-center flex items-center justify-center gap-2">
                      <div>T{(index / 2) + 1}</div>
                      <div className="text-blue-400">{open?.close?.toFixed(2)}</div>
                      <div className="text-zinc-400">{"➧"}</div>
                      <div className={color}>{close?.close?.toFixed(2)}</div>
                    </div>
                    <div className={color}>{config?.account?.currencySymbol} {value?.toFixed(2)}</div>
                  </div>
                )
              }
            })}
          </div>
        </div>
      </div>

      {open === "indicators" ? (
        <Indicators
          indicatorsList={indicators}
          onClose={() => setOpen("")}
          setIndicators={setIndicators}
        />
      ) : null}

      {open === "markets" ? (
        <Markets
          tokens={config}
          selectedEpic={config.epic}
          onSelect={(epic) => editConfig({ epic })}
          onClose={() => setOpen("")}
        />
      ) : null}

      {open === "push" ? (
        <PushConfig
          config={cleanConfig({ ...config })}
          onSave={editConfig}
          onClose={() => setOpen("")}
          openGroups={openGroups}
          closeGroups={closeGroups}
          openConnection={openConnection}
          closeConnection={closeConnection}
        />
      ) : null}

      <Drawer open={open === "strategy"} onClose={() => setOpen("")}>
        <div className="flex items-center justify-between border-b border-zinc-800 p-3 pr-2.5 gap-6">
          <div className="font-medium pl-2 text-md">Strategy Editor</div>
          <div className="flex-1"></div>
          <div className="flex items-center justify-center gap-6">
            <div className={`text-sm select-none cursor-pointer hover:opacity-80`} onClick={handleImportConfig}>Import</div>
            <div className={`text-sm select-none cursor-pointer hover:opacity-80`} onClick={handleExportConfig}>Export</div>
          </div>
          <button onClick={() => setOpen("")} className="w-7 h-7 text-white text-sm  leading-none rounded-0 hover:bg-white/5 cursor-pointer mr-1">{"✕"}</button>
        </div>
        <div className="flex flex-col flex-1 p-4 overflow-y-auto relative">
          <Conditions
            openGroups={openGroups}
            closeGroups={closeGroups}
            openConnection={openConnection}
            closeConnection={closeConnection}
            onOpenConnectionChange={setOpenConnection}
            onCloseConnectionChange={setCloseConnection}
            onOpenGroupsChange={setOpenGroups}
            onCloseGroupsChange={setCloseGroups}
          />
        </div>
        <div className="flex items-center justify-between gap-3 p-4 px-3 border-t border-zinc-800">
          <button disabled={config?.strategyCode === cfg?.strategyCode} className="flex-1 rounded-0 cursor-pointer px-4 py-3 text-sm font-semibold bg-zinc-700 text-zinc-200 hover:bg-zinc-600 transition disabled:opacity-50 disabled:cursor-not-allowed" onClick={saveChanges}>Save Changes</button>
          <button disabled={config?.strategyCode === cfg?.strategyCode} className="flex-1 rounded-0 cursor-pointer px-4 py-3 text-sm font-semibold bg-zinc-700 text-zinc-200 hover:bg-zinc-600 transition disabled:opacity-50 disabled:cursor-not-allowed" onClick={resetChanges}>Reset Changes</button>
        </div>
      </Drawer>

    </div>
  )
}
