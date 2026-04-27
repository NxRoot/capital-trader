import { useState } from 'react'
import Home from '@/components/Home'
import Login from '@/components/Login'

function App() {
  const [config, setConfig] = useState<any>(null)

  if (!config?.cst || !config?.securityToken) {
    return <Login onLogin={setConfig} />
  }
  return <Home cfg={config} />
}

export default App
