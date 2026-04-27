import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface PushProps {
    config: any;
    onSave: (config: any) => void;
    onClose: () => void;
    openGroups: any[];
    closeGroups: any[];
    openConnection: "AND" | "OR";
    closeConnection: "AND" | "OR";
}

const PushConfig: React.FC<PushProps> = ({ config, onSave, onClose, openGroups, closeGroups, openConnection, closeConnection }) => {
    const [loading, setLoading] = useState("");
    const [logs, setLogs] = useState([]);

    const pushToServer = async () => {
        if (loading) return;
        setLoading("push");
        try {
            const result = await fetch("/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...config, openGroups, closeGroups, openConnection, closeConnection }, null, 2)
            })
            if (!result.ok) { 
                alert("Failed to push config to server"); 
            }else {
                onSave(config);
                onClose();
            }
        } catch (err) {
            console.error(err)
            const message = err instanceof Error ? err.message : String(err)
            alert("Failed to push config to server:\nError: " + message)
        }
        setLoading("");
    }

    const getConfigFromServer = async () => {
        if (loading) return;
        setLoading("get");
        try {
            const result = await fetch("/config")
            if (!result.ok) { 
                alert("Failed to get config from server"); 
            }else {
                const data = await result.json();
                if(data?.config) onSave(data?.config);
                onClose();
            }
        }
        catch (err) {
            console.error(err)
            const message = err instanceof Error ? err.message : String(err)
            alert("Failed to get config from server:\nError: " + message)
        }
        setLoading("");
    }

    const stopServer = async () => {
        if (loading) return;
        setLoading("stop");
        try {
            const result = await fetch("/api/stop")
            if (!result.ok) { 
                alert("Failed to stop server"); 
            }else {
                getLogsFromServer();
            }
        }
        catch (err) {
            console.error(err)
            const message = err instanceof Error ? err.message : String(err)
            alert("Failed to stop server:\nError: " + message)
        }
        setLoading("");
    }

    const startServer = async () => {
        if (loading) return;
        setLoading("start");
        try {
            const result = await fetch("/api/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config, null, 2)
            })
            if (!result.ok) { 
                alert("Failed to start server"); 
            }else {
                getLogsFromServer();
            }
        }
        catch (err) {
            console.error(err)
            const message = err instanceof Error ? err.message : String(err)
            alert("Failed to start server:\nError: " + message)
        }
        setLoading("");
    }

    const getLogsFromServer = async () => {
        if (loading) return;
        setLoading("getLogs");
        try {
            const result = await fetch("/api/logs")
            if (!result.ok) { 
                alert("Failed to get logs from server"); 
            }else {
                const data = await result.json();
                if(data?.data) setLogs(data?.data);
            }
        }
        catch (err) {
            console.error(err)
            const message = err instanceof Error ? err.message : String(err)
            alert("Failed to get logs from server:\nError: " + message)
        }
        setLoading("");
    }

    useEffect(() => {
        getLogsFromServer();
    }, []);

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/70" onClick={onClose}>
            <div className="w-full max-w-lg bg-zinc-900 border border-[#272727] my-auto rounded-0 shadow-2xl p-4 space-y-2 max-h-full flex flex-col overflow-hidden " onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-zinc-300">Bot Server</h2>
                    <button onClick={onClose} className="w-7 h-7 text-white text-sm  leading-none rounded-0 hover:bg-white/5 cursor-pointer">{"✕"}</button>
                </div>
                <div className="space-y-3">
                    <div className="text-sm text-zinc-400">
                        Send action to server bot
                    </div>
                    <div className="flex items-center gap-2">
                    {/* <button disabled={loading !== ""} className="flex-1 w-full h-10 rounded-0 flex items-center justify-center text-sm cursor-pointer px-3 py-2 text-sm font-semibold bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed" onClick={getConfigFromServer}>
                        {loading === "get" ? <div className="w-4 h-4 border-2 border-zinc-100 border-t-transparent rounded-full animate-spin"></div> : <span>GET</span>}
                    </button>
                    <button disabled={loading !== ""} className="flex-1 w-full h-10 rounded-0 flex items-center justify-center text-sm cursor-pointer px-3 py-2 text-sm font-semibold bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed" onClick={pushToServer}>
                        {loading === "push" ? <div className="w-4 h-4 border-2 border-zinc-100 border-t-transparent rounded-full animate-spin"></div> : <span>POST</span>}
                    </button> */}
                    <button disabled={loading !== ""} className="flex-1 w-full h-10 rounded-0 flex items-center justify-center text-sm cursor-pointer px-3 py-2 text-sm font-semibold bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed" onClick={stopServer}>
                        {loading === "stop" ? <div className="w-4 h-4 border-2 border-zinc-100 border-t-transparent rounded-full animate-spin"></div> : <span>STOP</span>}
                    </button>
                    <button disabled={loading !== ""} className="flex-1 w-full h-10 rounded-0 flex items-center justify-center text-sm cursor-pointer px-3 py-2 text-sm font-semibold bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed" onClick={startServer}>
                        {loading === "start" ? <div className="w-4 h-4 border-2 border-zinc-100 border-t-transparent rounded-full animate-spin"></div> : <span>START</span>}
                    </button>
                    </div>
                </div>

                <div className="pt-2 space-y-2 flex flex-col min-h-0">
                    {/* <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className={`inline-block w-2 h-2 rounded-full bg-emerald-500`}></span>
                            <span className="text-sm font-semibold text-zinc-300">Console</span>
                        </div>
                        <button className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer px-2 py-1 hover:bg-white/5">Clear</button>
                    </div> */}

                    <div className="bg-black border border-[#272727] h-72 overflow-y-auto font-mono text-[11px] p-2 leading-relaxed">
                        {logs.length === 0 ? (
                            <div className="text-zinc-600">Waiting for messages...</div>
                        ) : logs.map(entry => (
                            <div key={entry.timestamp} className="whitespace-pre-wrap break-all">
                                <span className="text-zinc-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                                <span className="ml-2 text-zinc-200">{entry.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
            </div>
        </div>
        , document.body);
}

export default PushConfig;