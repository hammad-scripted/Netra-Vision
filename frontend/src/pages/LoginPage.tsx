import { KeyRound, Leaf, LoaderCircle, ShieldCheck } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useAnalysisStore } from "@/store/useAnalysisStore"

export function LoginPage() {
  const [token, setToken] = useState("")
  const authenticated = useAnalysisStore((state) => state.authenticated)
  const authBusy = useAnalysisStore((state) => state.authBusy)
  const authError = useAnalysisStore((state) => state.authError)
  const signIn = useAnalysisStore((state) => state.signIn)
  const location = useLocation()
  const navigate = useNavigate()
  const destination = (location.state as { from?: string } | null)?.from || "/"

  if (authenticated) return <Navigate to={destination} replace />

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (await signIn(token)) navigate(destination, { replace: true })
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand"><span className="brand-mark"><Leaf size={19} /></span><span className="brand-wordmark">netra<span>vision</span></span></div>
        <div className="login-icon"><KeyRound size={21} /></div>
        <div className="login-heading"><div className="eyebrow"><span className="eyebrow-line" /> SECURE WORKSPACE</div><h1>Sign in to Netra Vision</h1><p>Use your API access token to open saved analyses and analyze new crop photos.</p></div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="api-token">API access token</label>
          <input id="api-token" type="password" autoComplete="current-password" value={token} onChange={(event) => setToken(event.currentTarget.value)} placeholder="Paste your access token" required />
          {authError && <div className="inline-alert" role="alert">{authError}</div>}
          <Button type="submit" className="login-submit" disabled={authBusy || !token.trim()}>{authBusy ? <><LoaderCircle className="spin" /> Checking token</> : "Continue securely"}</Button>
        </form>
        <p className="login-security"><ShieldCheck size={15} /> Your token stays in this browser tab’s session and is cleared when you sign out.</p>
      </section>
    </main>
  )
}
