import {
  Activity,
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CloudUpload,
  FileImage,
  Leaf,
  LoaderCircle,
  Moon,
  RefreshCw,
  Search,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Sprout,
  Sun,
  X,
} from "lucide-react"
import { useEffect, useRef, type DragEvent } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { API_BASE_URL } from "@/lib/api"
import { useAnalysisStore } from "@/store/useAnalysisStore"

function isHealthyStatus(value: string) {
  return /healthy|normal|good/i.test(value)
}

function severityVariant(severity: string) {
  if (/severe|high/i.test(severity)) return "danger" as const
  if (/moderate|mild|medium/i.test(severity)) return "warning" as const
  return "outline" as const
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || "Date unavailable"
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date)
}

function App() {
  const theme = useAnalysisStore((state) => state.theme)
  const apiState = useAnalysisStore((state) => state.apiState)
  const apiInfo = useAnalysisStore((state) => state.apiInfo)
  const selectedImages = useAnalysisStore((state) => state.selectedImages)
  const results = useAnalysisStore((state) => state.results)
  const historyEntries = useAnalysisStore((state) => state.historyEntries)
  const historyTotal = useAnalysisStore((state) => state.historyTotal)
  const historyBusy = useAnalysisStore((state) => state.historyBusy)
  const historyError = useAnalysisStore((state) => state.historyError)
  const lookupId = useAnalysisStore((state) => state.lookupId)
  const activeResult = useAnalysisStore((state) => state.activeResult)
  const activePreview = useAnalysisStore((state) => state.activePreview)
  const selectedImageId = useAnalysisStore((state) => state.selectedImageId)
  const busy = useAnalysisStore((state) => state.busy)
  const detailBusy = useAnalysisStore((state) => state.detailBusy)
  const dragging = useAnalysisStore((state) => state.dragging)
  const formError = useAnalysisStore((state) => state.formError)
  const detailError = useAnalysisStore((state) => state.detailError)
  const toggleTheme = useAnalysisStore((state) => state.toggleTheme)
  const setDragging = useAnalysisStore((state) => state.setDragging)
  const addFiles = useAnalysisStore((state) => state.addFiles)
  const removeSelectedImage = useAnalysisStore((state) => state.removeSelectedImage)
  const clearSelectedImages = useAnalysisStore((state) => state.clearSelectedImages)
  const checkApiHealth = useAnalysisStore((state) => state.checkApiHealth)
  const refreshAnalysisHistory = useAnalysisStore((state) => state.refreshAnalysisHistory)
  const setLookupId = useAnalysisStore((state) => state.setLookupId)
  const openAnalysisById = useAnalysisStore((state) => state.openAnalysisById)
  const analyzeSelectedImages = useAnalysisStore((state) => state.analyzeSelectedImages)
  const fileInput = useRef<HTMLInputElement>(null)
  const objectUrls = useRef(new Set<string>())

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem("netra-theme", theme)
  }, [theme])

  useEffect(() => {
    const controller = new AbortController()
    void checkApiHealth(controller.signal)
    const interval = window.setInterval(() => void checkApiHealth(controller.signal), 30000)
    return () => {
      controller.abort()
      window.clearInterval(interval)
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url))
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

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files)
  }

  const issueCount = historyEntries.reduce((total, entry) => total + entry.disease_count, 0)
  const healthy = activeResult ? isHealthyStatus(activeResult.analysis.health_status) : false
  const activeAnalysis = activeResult?.analysis
  const activeDiseases = Array.isArray(activeAnalysis?.diseases) ? activeAnalysis.diseases : []
  const apiRoutes = apiInfo ? [
    { route: "GET /", description: "Read the API name, version, and available route descriptions." },
    ...Object.entries(apiInfo.endpoint).map(([route, description]) => ({ route, description })),
  ] : []

  return (
    <div className="app-shell">
      <div className="site-width">
        <header className="topbar">
          <a className="brand" href="#top" aria-label="Netra Vision home">
            <span className="brand-mark"><Leaf size={19} strokeWidth={2.2} /></span>
            <span className="brand-wordmark">netra<span>vision</span></span>
          </a>
          <div className="topbar-actions">
            <div className={`api-status api-status-${apiState}`} title="API connection status">
              <span className="status-dot" />
              <span>{apiState === "checking" ? "Connecting" : apiState === "online" ? "API online" : "API offline"}</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="theme-toggle"
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              onClick={toggleTheme}
            >
              {theme === "light" ? <Moon /> : <Sun />}
            </Button>
          </div>
        </header>

        <main id="top">
          <section className="hero-section" aria-labelledby="hero-title">
            <div className="hero-copy">
              <div className="eyebrow"><span className="eyebrow-line" /> FIELD INTELLIGENCE, MADE SIMPLE</div>
              <h1 id="hero-title">A clearer view<br />of <em>every crop.</em></h1>
              <p className="hero-description">
                See what your plants are telling you. Add a field photo for a thoughtful read on crop health, growth, and visible signs of stress.
              </p>
              <div className="hero-proof">
                <span className="proof-icon"><Check size={14} /></span>
                <span>Built for the details that matter in the field</span>
              </div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="art-orbit orbit-one" />
              <div className="art-orbit orbit-two" />
              <div className="art-sun" />
              <div className="art-leaf leaf-one"><Leaf size={56} strokeWidth={1.25} /></div>
              <div className="art-leaf leaf-two"><Leaf size={42} strokeWidth={1.25} /></div>
              <div className="art-leaf leaf-three"><Leaf size={34} strokeWidth={1.25} /></div>
              <div className="art-stem" />
              <div className="art-note"><span><Sparkles size={13} /></span> Thoughtful crop insights</div>
              <div className="art-index">01 <span>/</span> 03</div>
            </div>
          </section>

          <section className="workspace-grid" aria-label="Crop analysis workspace">
            <Card className="upload-card">
              <CardHeader className="section-card-header">
                <div className="section-heading-row">
                  <div className="section-heading-icon upload-heading-icon"><ScanLine size={19} /></div>
                  <div>
                    <CardTitle>Start a crop check</CardTitle>
                    <CardDescription>Add one photo or a small batch from your field.</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="limit-badge">UP TO 10</Badge>
              </CardHeader>
              <CardContent>
                <div
                  className={`dropzone ${dragging ? "dropzone-active" : ""} ${selectedImages.length ? "dropzone-compact" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-label="Choose JPEG or PNG crop photos, or drop them here"
                  onClick={() => fileInput.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      fileInput.current?.click()
                    }
                  }}
                  onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
                  onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
                  onDragLeave={(event) => {
                    const nextTarget = event.relatedTarget
                    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) setDragging(false)
                  }}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInput}
                    className="visually-hidden"
                    type="file"
                    accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                    multiple
                    onChange={(event) => {
                      if (event.currentTarget.files) addFiles(event.currentTarget.files)
                      event.currentTarget.value = ""
                    }}
                  />
                  <span className="dropzone-icon"><CloudUpload size={22} strokeWidth={1.8} /></span>
                  <span className="dropzone-title">Drop your field photos here</span>
                  <span className="dropzone-subtitle">or <span className="browse-link">browse files</span> on your device</span>
                  <span className="dropzone-format">JPEG or PNG <i /> Max 10 MB each</span>
                </div>

                {selectedImages.length > 0 && (
                  <div className="selected-files-block">
                    <div className="selected-files-heading">
                      <span>Selected photos <b>{selectedImages.length}</b></span>
                      <button className="text-button" type="button" onClick={clearSelectedImages}>Clear all</button>
                    </div>
                    <div className="selected-file-list">
                      {selectedImages.map((image) => (
                        <div className="selected-file" key={image.id}>
                          <img src={image.preview} alt="" />
                          <div className="selected-file-info">
                            <span className="selected-file-name">{image.file.name}</span>
                            <span className="selected-file-size">{(image.file.size / (1024 * 1024)).toFixed(2)} MB</span>
                          </div>
                          <button
                            className="icon-button remove-file"
                            type="button"
                            aria-label={`Remove ${image.file.name}`}
                            onClick={(event) => { event.stopPropagation(); removeSelectedImage(image.id) }}
                          ><X size={16} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {formError && <div className="inline-alert" role="alert"><AlertCircle size={16} />{formError}</div>}

                <div className="upload-footer">
                  <p><ShieldCheck size={15} /> Your photos are handled securely.</p>
                  <Button className="analyze-button" onClick={analyzeSelectedImages} disabled={!selectedImages.length || busy}>
                    {busy ? <><LoaderCircle className="spin" /> Reading your photos</> : <><ScanLine /> Analyze {selectedImages.length || "crop"} {selectedImages.length === 1 ? "photo" : "photos"}<ArrowRight className="button-arrow" /></>}
                  </Button>
                </div>
                {busy && (
                  <div className="progress-track" role="progressbar" aria-label="Analysis in progress">
                    <span className="progress-indeterminate" />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="results-card">
              <CardHeader className="section-card-header results-header">
                <div className="section-heading-row">
                  <div className="section-heading-icon results-heading-icon"><Activity size={19} /></div>
                  <div>
                    <CardTitle>Field notes</CardTitle>
                    <CardDescription>Browse earlier uploads or open a saved analysis by image ID.</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="result-count-badge">{historyTotal} SAVED</Badge>
              </CardHeader>
              <CardContent className="field-notes-content">
                <form className="analysis-lookup" onSubmit={(event) => {
                  event.preventDefault()
                  void openAnalysisById(lookupId)
                }}>
                  <label htmlFor="analysis-image-id">Get an analysis by image ID</label>
                  <div className="lookup-controls">
                    <input
                      id="analysis-image-id"
                      type="search"
                      autoComplete="off"
                      spellCheck={false}
                      value={lookupId}
                      onChange={(event) => setLookupId(event.currentTarget.value)}
                      placeholder="Paste a saved image ID"
                    />
                    <Button type="submit" disabled={!lookupId.trim() || detailBusy}>
                      {detailBusy ? <LoaderCircle className="spin" /> : <Search />}
                      {detailBusy ? "Loading" : "Get analysis"}
                    </Button>
                  </div>
                  <p>Open a row below or paste an ID from an earlier upload.</p>
                </form>

                {detailError && <div className="inline-alert lookup-alert" role="alert"><AlertCircle size={16} />{detailError}</div>}

                <div className="history-summary">
                  <div><span>Saved analyses</span><strong>{historyTotal}</strong></div>
                  <div><span>Findings in recent uploads</span><strong className={issueCount ? "metric-alert" : ""}>{issueCount}</strong></div>
                </div>

                <div className="history-table-toolbar">
                  <div>
                    <h3>Previous uploads</h3>
                    <p>{historyTotal > historyEntries.length ? "Showing the latest " + historyEntries.length + " of " + historyTotal + " saved analyses" : "Most recent saved analyses"}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => void refreshAnalysisHistory()} disabled={historyBusy}>
                    <RefreshCw className={historyBusy ? "spin" : ""} /> Refresh
                  </Button>
                </div>

                {historyError && <div className="inline-alert history-alert" role="alert"><AlertCircle size={16} />{historyError}</div>}

                <div className="history-table-shell">
                  {historyBusy && historyEntries.length === 0 ? (
                    <div className="history-state"><LoaderCircle className="spin" size={19} /> Loading saved analyses…</div>
                  ) : historyEntries.length === 0 ? (
                    <div className="history-state history-empty">
                      <FileImage size={20} />
                      <span>No previous uploads yet. Completed analyses will appear here.</span>
                    </div>
                  ) : (
                    <div className="history-table-scroll">
                      <table className="history-table">
                        <thead>
                          <tr>
                            <th scope="col">Image and crop</th>
                            <th scope="col">Health</th>
                            <th scope="col">Findings</th>
                            <th scope="col">Uploaded</th>
                            <th scope="col">Image ID</th>
                            <th scope="col"><span className="visually-hidden">Open analysis</span></th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyEntries.map((entry) => (
                            <tr className={selectedImageId === entry.image_id ? "history-row-active" : ""} key={entry.image_id}>
                              <td>
                                <div className="history-image-cell">
                                  <strong>{entry.crop_type || entry.filename}</strong>
                                  <span>{entry.filename}{entry.growth_stage ? " · " + entry.growth_stage : ""}</span>
                                </div>
                              </td>
                              <td><Badge variant={isHealthyStatus(entry.health_status) ? "success" : "warning"}>{entry.health_status || "Unknown"}</Badge></td>
                              <td><span className={entry.disease_count ? "history-findings history-findings-alert" : "history-findings"}>{entry.disease_count}</span></td>
                              <td><time dateTime={entry.created_at}>{formatDate(entry.created_at)}</time></td>
                              <td><code className="history-image-id" title={entry.image_id}>{entry.image_id}</code></td>
                              <td>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="history-open-button"
                                  onClick={() => void openAnalysisById(entry.image_id)}
                                  disabled={detailBusy}
                                  aria-label={"Open analysis " + entry.image_id}
                                >
                                  Open <ChevronRight />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {detailBusy ? (
                  <div className="detail-loading"><LoaderCircle className="spin" size={18} /> Loading the saved analysis…</div>
                ) : activeResult && activeAnalysis ? (
                  <div className="analysis-detail">
                    <div className="detail-section-heading">
                      <div>
                        <span>ANALYSIS DETAIL</span>
                        <h3>{activeAnalysis.crop_type || "Crop analysis"}</h3>
                      </div>
                      <Badge variant={healthy ? "success" : "warning"} className="health-badge">
                        <span className="health-dot" />{activeAnalysis.health_status || "Status unavailable"}
                      </Badge>
                    </div>
                    <div className="detail-record-meta">
                      <div><span>IMAGE ID</span><code>{activeResult.image_id}</code></div>
                      <span>{activeResult.filename}</span>
                      <time dateTime={activeResult.created_at}>{formatDate(activeResult.created_at)}</time>
                    </div>
                    <div className="detail-topline">
                      <div className="detail-crop-image">
                        {activePreview ? <img src={activePreview} alt={(activeAnalysis.crop_type || "Crop") + " photo"} /> : <Sprout size={23} />}
                      </div>
                      <div className="detail-crop-copy">
                        <span className="detail-kicker">Growth stage</span>
                        <h4>{activeAnalysis.growth_stage || "Not clear from this image"}</h4>
                      </div>
                    </div>
                    <div className="field-observation">
                      <div className="field-observation-icon"><Sparkles size={17} /></div>
                      <div><span>FIELD OBSERVATION</span><p>{activeAnalysis.additional_notes || "No additional observations were noted."}</p></div>
                    </div>
                    <div className="disease-heading">
                      <h4>Visible concerns</h4>
                      <Badge variant="outline">{activeDiseases.length} {activeDiseases.length === 1 ? "finding" : "findings"}</Badge>
                    </div>
                    {activeDiseases.length === 0 ? (
                      <div className="no-concerns"><CheckCircle2 size={18} /><span>No visible disease concerns in this photo.</span></div>
                    ) : (
                      <div className="disease-list">
                        {activeDiseases.map((disease, diseaseIndex) => (
                          <article className="disease-item" key={disease.name + "-" + diseaseIndex}>
                            <div className="disease-title-row">
                              <span className="disease-mark"><AlertCircle size={16} /></span>
                              <h5>{disease.name || "Finding"}</h5>
                              <Badge variant={severityVariant(disease.severity || "")}>{disease.severity || "Unrated"}</Badge>
                            </div>
                            <p>{disease.description || "No description provided."}</p>
                            {disease.recommendations && <div className="recommendation"><span>Suggested next step</span><p>{disease.recommendations}</p></div>}
                          </article>
                        ))}
                      </div>
                    )}
                    <div className="detail-disclaimer"><CircleHelpIcon /> Visual guidance is a starting point. Confirm uncertain symptoms with a local agronomist.</div>
                  </div>
                ) : !detailError ? (
                  <div className="detail-placeholder"><FileImage size={19} /><span>Choose a previous upload or enter its image ID to read the full field note.</span></div>
                ) : null}
              </CardContent>
            </Card>
          </section>

          <section className="trust-row" aria-label="How Netra Vision works">
            <div className="trust-item"><span className="trust-icon"><ScanLine size={17} /></span><span><b>Look closer</b><small>Start with a clear crop photo</small></span></div>
            <span className="trust-separator"><ArrowRight size={14} /></span>
            <div className="trust-item"><span className="trust-icon"><Sparkles size={17} /></span><span><b>Get context</b><small>See growth and visible symptoms</small></span></div>
            <span className="trust-separator"><ArrowRight size={14} /></span>
            <div className="trust-item"><span className="trust-icon"><Sprout size={17} /></span><span><b>Choose a next step</b><small>Use practical, cautious guidance</small></span></div>
            <div className="trust-note"><CheckCircle2 size={15} /> Made for field use</div>
          </section>
        </main>

        <footer className="footer">
          <span>© {new Date().getFullYear()} Netra Vision</span>
          <span className="footer-center"><span className={`footer-status-dot footer-status-${apiState}`} />{apiState === "online" ? "Connected to your analysis workspace" : apiState === "checking" ? "Checking analysis workspace" : "API connection unavailable"}</span>
          <div className="footer-actions">
            <details className="api-overview">
              <summary>API endpoints <ChevronRight size={13} /></summary>
              <div className="api-overview-panel">
                <div className="api-overview-heading">
                  <strong>{apiInfo?.app ?? "Netra Vision API"}</strong>
                  {apiInfo && <span>v{apiInfo.version}</span>}
                </div>
                {apiInfo ? (
                  <>
                    <p className="api-overview-message">{apiInfo.message}</p>
                    <ul className="api-route-list">
                      {apiRoutes.map(({ route, description }) => {
                        const [method, ...path] = route.split(" ")
                        return (
                          <li key={route}>
                            <div className="api-route-name">
                              <span className={`api-method api-method-${method.toLowerCase()}`}>{method}</span>
                              <code>{path.join(" ")}</code>
                            </div>
                            <p>{description}</p>
                          </li>
                        )
                      })}
                    </ul>
                  </>
                ) : (
                  <p className="api-overview-message">{apiState === "offline" ? "API information is unavailable while the server is offline." : "Loading API information…"}</p>
                )}
                <div className="api-doc-links">
                  <a href={`${API_BASE_URL}/docs`} target="_blank" rel="noreferrer">Swagger docs <ArrowRight size={13} /></a>
                  <a href={`${API_BASE_URL}/redoc`} target="_blank" rel="noreferrer">ReDoc <ArrowRight size={13} /></a>
                </div>
              </div>
            </details>
            <a href={`${API_BASE_URL}/docs`} target="_blank" rel="noreferrer">API docs <ArrowRight size={13} /></a>
          </div>
        </footer>
      </div>
    </div>
  )
}

function CircleHelpIcon() {
  return <span className="circle-help" aria-hidden="true">i</span>
}

export default App
