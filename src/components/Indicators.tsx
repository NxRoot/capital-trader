import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { indicators } from '@/utils/chart';

interface IndicatorsProps {
    onClose: () => void;
    setIndicators: React.Dispatch<React.SetStateAction<any[]>>;
    indicatorsList: any[];
}

interface IndicatorSettingsProps {
    indicator: { name: string; label: string; calcParams: number[] };
    onUpdateCalcParam: (index: number, value: number) => void;
    onClose: () => void;
    onSave: () => void;
    onReset: () => void;
}

const IndicatorSettings: React.FC<IndicatorSettingsProps> = ({ indicator, onUpdateCalcParam, onClose, onSave, onReset }) => {
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/70" onClick={onClose}>
            <div className="w-full max-w-xs bg-zinc-900 border border-[#272727] my-auto rounded-0 shadow-2xl p-4 space-y-2 max-h-full flex flex-col overflow-hidden " onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-zinc-300">{indicator.name}</h2>
                    <button onClick={onClose} className="w-7 h-7 text-white text-sm  leading-none rounded-0 hover:bg-white/5 cursor-pointer">{"✕"}</button>
                </div>
                <div className="space-y-3">
                    <div className="text-sm text-zinc-400">
                        {indicator.label}
                    </div>
                    <div className="space-y-2 px-1 py-1">
                        {indicator.calcParams.map((param, index) => (
                            <div key={index} className="flex items-center gap-0">
                                <label className="text-sm text-slate-300 w-20">
                                    Param {index + 1}
                                </label>
                                <input
                                    type="number"
                                    value={param}
                                    onChange={(e) => onUpdateCalcParam(index, Number(e.target.value))}
                                    className="flex-1 rounded-0 border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-between gap-4 pt-3 pr-1">
                    <button className="flex-1 rounded-0 text-sm cursor-pointer px-3 py-2 text-sm font-semibold bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed" onClick={onSave}>Save</button>
                    <button className="flex-1 rounded-0 text-sm cursor-pointer px-3 py-2 text-sm font-semibold bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed" onClick={onReset}>Reset</button>
                </div>
            </div>
        </div>
        , document.body);
}

const Indicators: React.FC<IndicatorsProps> = ({ onClose, setIndicators, indicatorsList }) => {
    const [settingsIndicator, setSettingsIndicator] = useState<{ name: string; label: string; calcParams: number[] } | null>(null);

    // Toggle the visibility of the indicator
    const toggleIndicator = (indicatorName: string) => {
        setIndicators(prev => prev.map(ind => ind.name === indicatorName ? { ...ind, visible: !ind.visible } : ind ))
    }

    // Update the calculation parameters for the selected indicator
    const updateCalcParam = (index: number, value: number) => {
        if (!settingsIndicator) return
        const newParams = [...settingsIndicator.calcParams]
        newParams[index] = value
        setSettingsIndicator({ ...settingsIndicator, calcParams: newParams })
    }

    // Save the settings for the selected indicator	
    const saveSettings = () => {
        if (!settingsIndicator) return alert("No indicator selected")
        setIndicators(prev => prev.map(ind => ind.name === settingsIndicator.name ? { ...ind, calcParams: settingsIndicator.calcParams } : ind))
        setSettingsIndicator(null)
    }

    // Reset the settings for the selected indicator
    const resetSettings = () => {
        setIndicators(prev => prev.map(ind => ind.name === settingsIndicator?.name ? { ...ind, calcParams: indicators.find(i => i.name === ind.name)?.calcParams ?? [] } : ind))
        setSettingsIndicator(null)
    }

    // Reset the indicators to the default state
    const resetIndicators = () => {
        setIndicators(indicators)
        setSettingsIndicator(null)
        onClose?.()
    }

    return createPortal(
        <>
            <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 " onClick={onClose}>
                <div className="w-full max-w-lg bg-zinc-900 border border-[#272727] my-auto rounded-0 shadow-2xl p-4 space-y-3 max-h-full flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-zinc-300">Indicators</h2>
                        <div className="flex items-center gap-2">
                            <button className="rounded-0 text-lg px-2 py-1 text-sm  hover:bg-zinc-800 hover:text-zinc-300 text-zinc-400 transition cursor-pointer" onClick={resetIndicators}>Reset</button>
                            <button onClick={onClose} className="w-7 h-7 text-white text-sm  leading-none rounded-0 hover:bg-white/5 cursor-pointer">{"✕"}</button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1 overflow-y-auto h-126 pr-1 -mr-1">
                        {indicatorsList?.sort((a, b) => a.name.localeCompare(b.name)).map((indicator) => {
                            const isSelected = indicator.visible ?? false
                            return (
                                <div
                                    key={indicator.name}
                                    className="flex items-center justify-between rounded-0 bg-zinc-800/50 p-2 px-3 hover:bg-zinc-800 cursor-pointer select-none"
                                    onClick={() => toggleIndicator(indicator.name)}
                                >
                                    <div className="flex items-center gap-3 flex-1 ">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <div className={`font-normal tracking-wide text-sm ${isSelected ? "text-green-500" : "text-zinc-100"}`}>
                                                    {indicator.name}
                                                </div>
                                                {(() => {
                                                    const currentParams = indicator.calcParams ?? []
                                                    return currentParams.length > 0 && (
                                                        <div className={`text-sm ${isSelected ? "text-green-500/70" : "text-zinc-500"}`}>
                                                            {currentParams.join(", ")}
                                                        </div>
                                                    )
                                                })()}
                                            </div>
                                            <div className={`text-xs ${isSelected ? "text-green-500/70" : "text-zinc-500"}`}>
                                                {indicator.label}
                                            </div>

                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setSettingsIndicator(indicator) }}
                                        className={`rounded-0 text-lg p-1.5 text-sm  hover:bg-zinc-700 hover:text-zinc-300 text-zinc-400 transition cursor-pointer ${!indicator?.calcParams ? "opacity-20 cursor-not-allowed" : "opacity-100"}`}
                                        title="Configure Parameters"
                                        disabled={!indicator?.calcParams}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={1.5}
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                            />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
            {settingsIndicator && (
                <IndicatorSettings
                    indicator={settingsIndicator}
                    onClose={() => setSettingsIndicator(null)}
                    onUpdateCalcParam={updateCalcParam}
                    onSave={saveSettings}
                    onReset={resetSettings}
                />
            )}
        </>
        , document.body);
}

export default Indicators;
