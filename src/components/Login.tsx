import { CapitalLogin } from "@/utils/capital"
import { loadConfig, saveConfig } from "@/utils/storage"
import { useState } from "react"

const Spinner = () => <div className="w-4 h-4 border-2 border-zinc-100 border-t-transparent rounded-full animate-spin"></div>

export default function Login({ onLogin }: { onLogin: (cfg: any) => void }) {

  const [form, setForm] = useState<any>(loadConfig())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    setError(null)
    setLoading(true)
    try {
      const response = await CapitalLogin(form, form)
      if (response.error) {
        setError(JSON.stringify(response.error))
      } else {
        saveConfig(form)
        onLogin({ ...form, cst: response.cst, securityToken: response.securityToken, account: response.account })
      }
    } catch (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  const isValid = () => form?.username?.length > 0 && form?.password?.length > 0 && form?.apiKey?.length > 0

  return (
    <div className="flex flex-col h-screen w-screen gap-0 items-center justify-center px-4">
      <div className="flex flex-col items-center justify-center border border-zinc-800 p-4 gap-4 max-w-96 w-full">
        <div className="flex flex-col items-center justify-center w-full">
          <h1 className="text-xl font-medium tracking-tight ">Capital Trader</h1>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 w-full">
          <input value={form.username} onChange={(e) => set('username', e.target.value)} type="text" placeholder="Username" className="w-full p-2 px-3  border border-zinc-800 focus:ring-0 focus:outline-none" />
          <input value={form.apiKey} onChange={(e) => set('apiKey', e.target.value)} placeholder="API Key" className="w-full p-2 px-3  border border-zinc-800 focus:ring-0 focus:outline-none" />
          <input value={form.password} onChange={(e) => set('password', e.target.value)} type="password" placeholder="Password" className="w-full p-2 px-3  border border-zinc-800 focus:ring-0 focus:outline-none" />
          {/* <input value={form.aiKey} onChange={(e) => set('aiKey', e.target.value)} placeholder="Anthropic Key (Optional)" className="w-full p-2 px-3  border border-zinc-800 focus:ring-0 focus:outline-none" /> */}
          <select value={form.environment} onChange={(e) => set('environment', e.target.value)} className="w-full p-2 px-3  border border-zinc-800 focus:ring-0 focus:outline-none appearance-none cursor-pointer">
            <option value="demo" className="bg-zinc-900 hover:bg-zinc-900/50 ">Demo</option>
            <option value="live" className="bg-zinc-900 hover:bg-zinc-900/50">Live</option>
          </select>
          <button disabled={!isValid() || loading} onClick={submit} className="w-full p-2 h-11 border border-zinc-800 mt-2 hover:not-disabled:bg-zinc-900/50 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
            {loading ? <Spinner /> : <span>Login</span>}
          </button>
        </div>
      </div>
      <div className="text-sm text-red-500 h-10 py-4">{error}</div>
    </div>
  )
}
