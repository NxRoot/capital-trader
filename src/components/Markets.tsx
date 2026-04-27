import React, { useState, useEffect, useRef } from 'react';
import { CapitalMarkets } from '@/utils/capital';
import { createPortal } from 'react-dom';

interface MarketsProps {
    tokens: any;
    selectedEpic: string;
    onSelect: (epic: string, name: string) => void;
    onClose: () => void;
}

const Markets: React.FC<MarketsProps> = ({ tokens, selectedEpic, onSelect, onClose }) => {
    const [query, setQuery] = useState<string>('us');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => { inputRef.current?.focus(); }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!query.trim()) {
            setResults([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');

        debounceRef.current = setTimeout(async () => {
            try {
                const response = await CapitalMarkets(tokens, { searchTerm: query.trim() });
                if (response.error) {
                    setError('Failed to search markets. Please try again.');
                    setResults([]);
                } else {
                    setResults((response.markets as any[]) ?? []);
                }
            } catch {
                setError('Failed to search markets. Please try again.');
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 400);

        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query]);

    const handleSelect = (epic: string, name: string) => {
        onSelect(epic, name);
        onClose();
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 " onClick={onClose}>
            <div className="w-full max-w-lg bg-zinc-900 border border-[#272727] my-auto rounded-0 shadow-2xl p-4 space-y-2 max-h-full flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-zinc-300">Search Markets</h2>
                    <button onClick={onClose} className="w-7 h-7 text-white text-sm leading-none rounded-0 hover:bg-white/5 cursor-pointer">{"✕"}</button>
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    onChange={(e) => setQuery(e.target.value || "us")}
                    placeholder="Search markets… e.g. BTC, Gold, Tesla"
                    className="w-full p-2 px-3  border border-zinc-800 focus:ring-0 focus:outline-none bg-zinc-800"
                />

                {error && (
                    <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-0 px-3 py-2">
                        {error}
                    </p>
                )}

                <div className="h-102 overflow-y-auto flex flex-col gap-[4px] pr-1 -mr-1">
                    {loading && (
                        <div className="text-sm text-zinc-500 text-center py-6">Searching…</div>
                    )}
                    {!loading && query && results.length === 0 && !error && (
                        <div className="text-sm text-zinc-500 text-center py-6">No markets found</div>
                    )}
                    {!loading && !query && (
                        <div className="text-sm text-zinc-600 text-center py-6">Type to search for a market</div>
                    )}
                    {query && !loading && results.length > 0 && results.map((m: any) => {
                        const epic = m.epic ?? m.instrumentName;
                        const name = m.instrumentName ?? m.epic;
                        return (
                            <button
                                key={epic}
                                onClick={() => handleSelect(epic, name)}
                                className="w-full flex items-center justify-between p-2.5 px-3 text-sm text-zinc-500 text-center bg-zinc-800/50 border-b border-zinc-900 cursor-pointer hover:bg-zinc-800 hover:text-zinc-100"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className={`font-normal tracking-wide text-sm ${m.epic === selectedEpic ? 'text-green-500' : 'text-zinc-100'}`}>
                                        {epic}
                                    </div>
                                    <div className="text-xs text-zinc-500">{name}</div>
                                </div>
                                {m.instrumentType && (
                                    <span className="text-xs text-zinc-500">
                                        {m.instrumentType}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    , document.body);
}

export default Markets;
