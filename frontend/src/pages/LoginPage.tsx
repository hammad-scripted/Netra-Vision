import { KeyRound, Leaf, LoaderCircle, ShieldCheck, UserRoundPlus } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useAnalysisStore } from "@/store/useAnalysisStore"

type AuthMode = "login" | "register"

export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login")
  const [identifier, setIdentifier] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const authenticated = useAnalysisStore((state) => state.authenticated)
  const authBusy = useAnalysisStore((state) => state.authBusy)
  const authError = useAnalysisStore((state) => state.authError)
  const signIn = useAnalysisStore((state) => state.signIn)
  const register = useAnalysisStore((state) => state.register)
  const location = useLocation()
  const navigate = useNavigate()
  const destination = (location.state as { from?: string } | null)?.from || "/"

  if (authenticated) return <Navigate to={destination} replace />

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const succeeded = mode === "register"
      ? await register(username, email, password)
      : await signIn(identifier, password)
    if (succeeded) navigate(destination, { replace: true })
  }

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setPassword("")
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand"><span className="brand-mark"><Leaf size={19} /></span><span className="brand-wordmark">netra<span>vision</span></span></div>
        <div className="login-icon">{mode === "register" ? <UserRoundPlus size={21} /> : <KeyRound size={21} />}</div>
        <div className="login-heading">
          <div className="eyebrow"><span className="eyebrow-line" /> SECURE WORKSPACE</div>
          <h1>{mode === "register" ? "Create your account" : "Welcome back"}</h1>
          <p>{mode === "register" ? "Create an account to analyze crop photos and keep your field notes private." : "Sign in with your username or email to open your crop workspace."}</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          {mode === "register" ? <>
            <label htmlFor="account-username">Username</label>
            <input id="account-username" type="text" autoComplete="username" minLength={3} maxLength={32} value={username} onChange={(event) => setUsername(event.currentTarget.value)} placeholder="Choose a username" required />
            <p className="field-hint">3 to 32 characters. Letters, numbers, spaces, dots, dashes, and underscores are allowed.</p>
            <label htmlFor="account-email">Email</label>
            <input id="account-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.currentTarget.value)} placeholder="you@example.com" required />
          </> : <>
            <label htmlFor="account-identifier">Username or email</label>
            <input id="account-identifier" type="text" autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.currentTarget.value)} placeholder="Your username or email" required />
          </>}
          <label htmlFor="account-password">Password</label>
          <input id="account-password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={mode === "register" ? 12 : undefined} maxLength={128} value={password} onChange={(event) => setPassword(event.currentTarget.value)} placeholder={mode === "register" ? "At least 12 characters" : "Enter your password"} required />
          {mode === "register" && <p className="field-hint" aria-live="polite">
            {password.length < 12
              ? `At least 12 characters (${password.length}/12 entered).`
              : `${password.length} characters entered.`}
          </p>}
          {authError && <div className="inline-alert" role="alert">{authError}</div>}
          <Button type="submit" className="login-submit" disabled={authBusy || (mode === "register" ? !username.trim() || !email.trim() || password.length < 12 : !identifier.trim() || !password)}>
            {authBusy ? <><LoaderCircle className="spin" /> {mode === "register" ? "Creating account" : "Signing in"}</> : mode === "register" ? "Create account" : "Sign in"}
          </Button>
        </form>
        <div className="login-mode-switch">
          {mode === "register" ? <>Already have an account? <button type="button" className="login-switch" onClick={() => switchMode("login")}>Sign in</button></> : <>New to Netra Vision? <button type="button" className="login-switch" onClick={() => switchMode("register")}>Create an account</button></>}
        </div>
        <p className="login-security"><ShieldCheck size={15} /> Passwords are stored as secure hashes. Your sign-in token stays in this browser session and expires automatically.</p>
      </section>
    </main>
  )
}
