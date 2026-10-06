import { ArrowRight, ChevronRight, Leaf, LogIn, LogOut, Moon, Sun } from "lucide-react"
import { useEffect, useRef } from "react"
import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { API_BASE_URL } from "@/lib/api"
import { AnalyzePage } from "@/pages/AnalyzePage"
import { HistoryPage } from "@/pages/HistoryPage"
import { LoginPage } from "@/pages/LoginPage"
import { useAnalysisStore } from "@/store/useAnalysisStore"

function AppFrame() {
  const theme = useAnalysisStore((state) => state.theme)
  const apiState = useAnalysisStore((state) => state.apiState)
  const apiInfo = useAnalysisStore((state) => state.apiInfo)
  const authenticated = useAnalysisStore((state) => state.authenticated)
  const selectedImages = useAnalysisStore((state) => state.selectedImages)
  const results = useAnalysisStore((state) => state.results)
  const activePreview = useAnalysisStore((state) => state.activePreview)
  const toggleTheme = useAnalysisStore((state) => state.toggleTheme)
  const checkApiHealth = useAnalysisStore((state) => state.checkApiHealth)
  const signOut = useAnalysisStore((state) => state.signOut)
  const objectUrls = useRef(new Set<string>())
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { window.localStorage.setItem("netra-theme", theme) } catch { /* Theme still works for this session. */ }
  }, [theme])

  useEffect(() => {
    const controller = new AbortController()
    void checkApiHealth(controller.signal)
    const interval = window.setInterval(() => void checkApiHealth(controller.signal), 30000)
    return () => {
      controller.abort()
      window.clearInterval(interval)
    }
  }, [checkApiHealth])

  useEffect(() => {
    const retainedUrls = new Set([
      ...selectedImages.map((image) => image.preview),
      ...results.flatMap((entry) => entry.success && entry.preview ? [entry.preview] : []),
      ...(activePreview ? [activePreview] : []),
    ])
    retainedUrls.forEach((url) => objectUrls.current.add(url))
    objectUrls.current.forEach((url) => {
      if (!retainedUrls.has(url)) {
        URL.revokeObjectURL(url)
        objectUrls.current.delete(url)
      }
    })
  }, [activePreview, results, selectedImages])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [location.pathname])

  const apiRoutes = apiInfo ? [
    { route: "GET /", description: "Read the API name, version, and available route descriptions." },
    ...Object.entries(apiInfo.endpoint).map(([route, description]) => ({ route, description })),
  ] : []

  return (
    <div className="app-shell">
      <div className="site-width">
        <header className="topbar">
          <NavLink className="brand" to={authenticated ? "/" : "/login"} aria-label="Netra Vision home">
            <span className="brand-mark"><Leaf size={19} strokeWidth={2.2} /></span>
            <span className="brand-wordmark">netra<span>vision</span></span>
          </NavLink>
          {authenticated && <nav className="main-navigation" aria-label="Main navigation">
              <NavLink to="/" end className={({ isActive }) => `navigation-link${isActive ? " navigation-link-active" : ""}`}>Analyze</NavLink>
              <NavLink to="/history" className={({ isActive }) => `navigation-link${isActive ? " navigation-link-active" : ""}`}>Field Notes</NavLink>
          </nav>}
          <div className="topbar-actions">
            <div className={`api-status api-status-${apiState}`} title="API connection status"><span className="status-dot" /><span>{apiState === "checking" ? "Connecting" : apiState === "online" ? "API online" : "API offline"}</span></div>
            {authenticated ? (
              <Button variant="outline" size="sm" className="session-button" aria-label="Sign out" onClick={() => { signOut(); navigate("/login") }}><LogOut /> Sign out</Button>
            ) : (
              location.pathname !== "/login" && <Button variant="outline" size="sm" className="session-button" onClick={() => navigate("/login")}><LogIn /> Sign in</Button>
            )}
            <Button variant="outline" size="icon" className="theme-toggle" aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} onClick={toggleTheme}>
              {theme === "light" ? <Moon /> : <Sun />}
            </Button>
          </div>
        </header>

        <Outlet />

        <footer className="footer">
          <span>© {new Date().getFullYear()} Netra Vision</span>
          <span className="footer-center"><span className={`footer-status-dot footer-status-${apiState}`} />{apiState === "online" ? "Connected to your analysis workspace" : apiState === "checking" ? "Checking analysis workspace" : "API connection unavailable"}</span>
          <div className="footer-actions">
            <details className="api-overview">
              <summary>API endpoints <ChevronRight size={13} /></summary>
              <div className="api-overview-panel">
                <div className="api-overview-heading"><strong>{apiInfo?.app ?? "Netra Vision API"}</strong>{apiInfo && <span>v{apiInfo.version}</span>}</div>
                {apiInfo ? <>
                  <p className="api-overview-message">{apiInfo.message}</p>
                  <ul className="api-route-list">{apiRoutes.map(({ route, description }) => {
                    const [method, ...path] = route.split(" ")
                    return <li key={route}><div className="api-route-name"><span className={`api-method api-method-${method.toLowerCase()}`}>{method}</span><code>{path.join(" ")}</code></div><p>{description}</p></li>
                  })}</ul>
                </> : <p className="api-overview-message">{apiState === "offline" ? "API information is unavailable while the server is offline." : "Loading API information…"}</p>}
                <div className="api-doc-links"><a href={`${API_BASE_URL}/docs`} target="_blank" rel="noreferrer">Swagger docs <ArrowRight size={13} /></a><a href={`${API_BASE_URL}/redoc`} target="_blank" rel="noreferrer">ReDoc <ArrowRight size={13} /></a></div>
              </div>
            </details>
            <a href={`${API_BASE_URL}/docs`} target="_blank" rel="noreferrer">API docs <ArrowRight size={13} /></a>
          </div>
        </footer>
      </div>
    </div>
  )
}

function RequireAuthentication() {
  const authenticated = useAnalysisStore((state) => state.authenticated)
  const location = useLocation()
  if (!authenticated) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  return <Outlet />
}

function RedirectWhenAuthenticated() {
  const authenticated = useAnalysisStore((state) => state.authenticated)
  return authenticated ? <Navigate to="/" replace /> : <LoginPage />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppFrame />}>
          <Route path="/login" element={<RedirectWhenAuthenticated />} />
          <Route element={<RequireAuthentication />}>
            <Route index element={<AnalyzePage />} />
            <Route path="history" element={<HistoryPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
