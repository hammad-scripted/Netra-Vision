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
  ScanLine,
  Sparkles,
  Sprout,
  Sun,
  Trash2,
  X,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  analyzeImages,
  checkApiHealth,
  getSavedAnalysis,
  type AnalysisEntry,
  type CompletedAnalysis,
} from "@/lib/api"

type Theme = "light" | "dark"
type ApiState = "checking" | "online" | "offline"
type SelectedImage = { id: string; file: File; preview: string }
type ResultEntry = AnalysisEntry & { preview?: string }

const MAX_IMAGES = 10
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png"])

function getInitialTheme(): Theme {
  const savedTheme = window.localStorage.getItem("netra-theme")
  if (savedTheme === "light" || savedTheme === "dark") return savedTheme
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function isHealthyStatus(value: string) {
  return /healthy|normal|good/i.test(value)
}

function severityVariant(severity: string) {
  if (/severe|high/i.test(severity)) return "danger" as const
  if (/moderate|mild|medium/i.test(severity)) return "warning" as const
  return "outline" as const
}

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [apiState, setApiState] = useState<ApiState>("checking")
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([])
  const [results, setResults] = useState<ResultEntry[]>([])
  const [activeResult, setActiveResult] = useState<CompletedAnalysis | null>(null)
  const [activePreview, setActivePreview] = useState<string | undefined>()
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [detailBusy, setDetailBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [formError, setFormError] = useState("")
  const [detailError, setDetailError] = useState("")
  const fileInput = useRef<HTMLInputElement>(null)
  const objectUrls = useRef(new Set<string>())

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem("netra-theme", theme)
  }, [theme])

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const refreshHealth = async () => {
      try {
        await checkApiHealth(controller.signal)
        if (active) setApiState("online")
      } catch {
        if (active) setApiState("offline")
      }
    }
    void refreshHealth()
    const interval = window.setInterval(() => void refreshHealth(), 30000)
    return () => {
      active = false
      controller.abort()
      window.clearInterval(interval)
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    const availableSlots = MAX_IMAGES - selectedImages.length
    const accepted: File[] = []
    const errors: string[] = []

    for (const file of files) {
      const extensionLooksSupported = /\.(jpe?g|png)$/i.test(file.name)
      if (!ACCEPTED_TYPES.has(file.type) && !(!file.type && extensionLooksSupported)) {
        errors.push(`${file.name}: choose a JPEG or PNG image.`)
      } else if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: the file is larger than 10 MB.`)
      } else if (accepted.length >= availableSlots) {
        errors.push(`You can analyze up to ${MAX_IMAGES} images at a time.`)
      } else {
        accepted.push(file)
      }
    }

    const additions = accepted.map((file) => {
      const preview = URL.createObjectURL(file)
      objectUrls.current.add(preview)
      return { id: crypto.randomUUID(), file, preview }
    })
    if (additions.length) setSelectedImages((current) => [...current, ...additions])
    setFormError(errors[0] ?? "")
  }, [selectedImages.length])

  const removeSelected = (id: string) => {
    setSelectedImages((current) => {
      const image = current.find((item) => item.id === id)
      if (image) {
        URL.revokeObjectURL(image.preview)
        objectUrls.current.delete(image.preview)
      }
      return current.filter((item) => item.id !== id)
    })
  }

  const selectResult = async (entry: ResultEntry) => {
    if (!entry.success) return
    setSelectedImageId(entry.image_id)
    setActivePreview(entry.preview)
    setDetailBusy(true)
    setDetailError("")
    try {
      setActiveResult(await getSavedAnalysis(entry.image_id))
    } catch (error) {
      setActiveResult(null)
      setDetailError(error instanceof Error ? error.message : "Could not load this analysis.")
    } finally {
      setDetailBusy(false)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedImages.length || busy) return
    setBusy(true)
    setFormError("")
    setDetailError("")
    setActiveResult(null)
    setSelectedImageId(null)
    try {
      const response = await analyzeImages(selectedImages.map((item) => item.file))
      const nextResults = response.results.map((entry, index) => ({
        ...entry,
        preview: selectedImages[index]?.preview,
      })) as ResultEntry[]
      setResults(nextResults)
      const firstCompleted = nextResults.find((entry): entry is CompletedAnalysis & { preview?: string } => entry.success)
      if (firstCompleted) void selectResult(firstCompleted)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Analysis failed. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files)
  }

  const completedCount = results.filter((entry) => entry.success).length
  const issueCount = results.reduce(
    (total, entry) => total + (entry.success ? entry.analysis.diseases.length : 0),
    0,
  )
  const hasResults = results.length > 0
  const healthy = activeResult ? isHealthyStatus(activeResult.analysis.health_status) : false

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
              onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
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
                    if (event.currentTarget === event.target) setDragging(false)
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
                      <button className="text-button" type="button" onClick={() => {
                        selectedImages.forEach((image) => {
                          URL.revokeObjectURL(image.preview)
                          objectUrls.current.delete(image.preview)
                        })
                        setSelectedImages([])
                        setFormError("")
                      }}>Clear all</button>
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
                            onClick={(event) => { event.stopPropagation(); removeSelected(image.id) }}
                          ><X size={16} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {formError && <div className="inline-alert" role="alert"><AlertCircle size={16} />{formError}</div>}

                <div className="upload-footer">
                  <p><ShieldCheck size={15} /> Your photos are handled securely.</p>
                  <Button className="analyze-button" onClick={handleAnalyze} disabled={!selectedImages.length || busy}>
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
                    <CardDescription>{hasResults ? "A closer look at your latest crop check." : "Your crop insights will show up here."}</CardDescription>
                  </div>
                </div>
                {hasResults && <Badge variant="outline" className="result-count-badge">{completedCount} {completedCount === 1 ? "ANALYSIS" : "ANALYSES"}</Badge>}
              </CardHeader>
              <CardContent>
                {!hasResults ? (
                  <div className="empty-state">
                    <div className="empty-illustration">
                      <span className="empty-sun" />
                      <Sprout className="empty-sprout" size={47} strokeWidth={1.3} />
                      <span className="empty-ground" />
                    </div>
                    <h3>Good things grow<br />from a closer look.</h3>
                    <p>Upload a photo to see a clear summary of crop health, growth stage, and visible concerns.</p>
                    <div className="empty-footnote"><FileImage size={15} /> Your first field note starts with a photo</div>
                  </div>
                ) : (
                  <div className="results-content">
                    <div className="summary-strip">
                      <div className="summary-metric"><span>Photos read</span><strong>{completedCount}<small> / {results.length}</small></strong></div>
                      <div className="summary-divider" />
                      <div className="summary-metric"><span>Visible concerns</span><strong className={issueCount ? "metric-alert" : ""}>{issueCount}</strong></div>
                      <div className="summary-decoration"><Leaf size={20} /></div>
                    </div>

                    <div className="result-list-heading"><span>ANALYSIS HISTORY</span><span>SELECT TO OPEN <ChevronRight size={12} /></span></div>
                    <div className="result-list">
                      {results.map((entry, index) => (
                        entry.success ? (
                          <button
                            type="button"
                            key={`${entry.image_id}-${index}`}
                            className={`result-row ${selectedImageId === entry.image_id ? "result-row-active" : ""}`}
                            onClick={() => void selectResult(entry)}
                          >
                            <span className="result-thumb">
                              {entry.preview ? <img src={entry.preview} alt="" /> : <Leaf size={17} />}
                            </span>
                            <span className="result-row-copy">
                              <span className="result-row-title">{entry.analysis.crop_type || entry.filename}</span>
                              <span className="result-row-meta">{entry.filename} <i /> {entry.analysis.growth_stage}</span>
                            </span>
                            <Badge variant={isHealthyStatus(entry.analysis.health_status) ? "success" : "warning"} className="row-status-badge">
                              {entry.analysis.health_status}
                            </Badge>
                            <ChevronRight className="result-chevron" size={16} />
                          </button>
                        ) : (
                          <div className="result-row result-row-failed" key={`failed-${index}`}>
                            <span className="result-thumb failed-thumb"><AlertCircle size={16} /></span>
                            <span className="result-row-copy">
                              <span className="result-row-title">{entry.filename}</span>
                              <span className="result-row-meta result-error-text">{entry.error}</span>
                            </span>
                            <Badge variant="danger" className="row-status-badge">Needs retry</Badge>
                          </div>
                        )
                      ))}
                    </div>

                    {detailBusy ? (
                      <div className="detail-loading"><LoaderCircle className="spin" size={18} /> Opening saved field note…</div>
                    ) : detailError ? (
                      <div className="inline-alert detail-alert" role="alert"><AlertCircle size={16} />{detailError}</div>
                    ) : activeResult ? (
                      <div className="analysis-detail">
                        <div className="detail-divider"><span /> CROP READOUT <span /></div>
                        <div className="detail-topline">
                          <div className="detail-crop-image">
                            {activePreview ? <img src={activePreview} alt={`${activeResult.analysis.crop_type} crop`} /> : <Sprout size={23} />}
                          </div>
                          <div className="detail-crop-copy">
                            <span className="detail-kicker">{activeResult.analysis.growth_stage || "Growth stage not clear"}</span>
                            <h3>{activeResult.analysis.crop_type || "Crop identified"}</h3>
                          </div>
                          <Badge variant={healthy ? "success" : "warning"} className="health-badge">
                            <span className="health-dot" />{activeResult.analysis.health_status}
                          </Badge>
                        </div>

                        <div className="field-observation">
                          <div className="field-observation-icon"><Sparkles size={16} /></div>
                          <div><span>FIELD OBSERVATION</span><p>{activeResult.analysis.additional_notes || "No additional observations were noted."}</p></div>
                        </div>

                        <div className="disease-heading">
                          <h4>Visible concerns</h4>
                          <Badge variant="outline">{activeResult.analysis.diseases.length} {activeResult.analysis.diseases.length === 1 ? "finding" : "findings"}</Badge>
                        </div>
                        {activeResult.analysis.diseases.length === 0 ? (
                          <div className="no-concerns"><CheckCircle2 size={17} /><span>No visible disease concerns in this photo.</span></div>
                        ) : (
                          <div className="disease-list">
                            {activeResult.analysis.diseases.map((disease, diseaseIndex) => (
                              <article className="disease-item" key={`${disease.name}-${diseaseIndex}`}>
                                <div className="disease-title-row">
                                  <span className="disease-mark"><AlertCircle size={15} /></span>
                                  <h5>{disease.name}</h5>
                                  <Badge variant={severityVariant(disease.severity)}>{disease.severity}</Badge>
                                </div>
                                <p>{disease.description}</p>
                                {disease.recommendations && <div className="recommendation"><span>Suggested next step</span><p>{disease.recommendations}</p></div>}
                              </article>
                            ))}
                          </div>
                        )}
                        <div className="detail-disclaimer"><CircleHelpIcon /> Visual guidance is a starting point. Confirm uncertain symptoms with a local agronomist.</div>
                      </div>
                    ) : (
                      <div className="detail-placeholder"><span>Select an analysis to open its saved field note.</span></div>
                    )}
                  </div>
                )}
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
          <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">API docs <ArrowRight size={13} /></a>
        </footer>
      </div>
    </div>
  )
}

function CircleHelpIcon() {
  return <span className="circle-help" aria-hidden="true">i</span>
}

export default App
