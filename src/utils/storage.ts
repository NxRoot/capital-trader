
const STORAGE_KEY = 'cpt_config'

export const DEFAULT_CONFIG = {
    username: "",
    password: "",
    apiKey: "",
    environment: "demo",
    epic: "BTCUSD",
    orderSize: "0.025",
    timeframe: "MINUTE",
    strategyCode: "type = 'BUY'; canOpen = false; canClose = false;",
    direction: "BUY",
    openGroups: [],
    closeGroups: [],
    openConnection: "AND",
    closeConnection: "AND",
};

export function loadConfig() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return DEFAULT_CONFIG
        return JSON.parse(raw)
    } catch {
        return DEFAULT_CONFIG
    }
}

export function saveConfig(cfg): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)) } catch {}
}

export function exportConfig(cfg): void {
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${cfg.epic}_${cfg.timeframe}_${cfg.direction}_${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

export function importConfig(): Promise<any | null> {
    return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json,application/json'
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return resolve(null)
            const reader = new FileReader()
            reader.onload = (ev) => {
                try {
                    const parsed = JSON.parse(ev.target?.result as string)
                    resolve({ ...DEFAULT_CONFIG, ...parsed } as any)
                } catch {
                    resolve(null)
                }
            }
            reader.readAsText(file)
        }
        input.oncancel = () => resolve(null)
        document.body.appendChild(input)
        input.click()
        document.body.removeChild(input)
    })
}
