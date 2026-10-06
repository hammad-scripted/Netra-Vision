import { Activity, ArrowRight, CheckCircle2, Leaf, ScanLine, Sparkles, Sprout } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { UploadCard } from "@/components/upload/UploadCard"
import { useAnalysisStore } from "@/store/useAnalysisStore"

export function AnalyzePage() {
  const results = useAnalysisStore((state) => state.results)
  const openAnalysisById = useAnalysisStore((state) => state.openAnalysisById)
  const navigate = useNavigate()
  const succeeded = results.filter((result) => result.success)

  const viewResult = (imageId: string) => {
    void openAnalysisById(imageId)
    navigate("/history")
  }

  return (
    <main className="page-main">
      <section className="hero-section" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> FIELD INTELLIGENCE, MADE SIMPLE</div>
          <h1 id="hero-title">A clearer view<br />of <em>every crop.</em></h1>
          <p className="hero-description">See what your plants are telling you. Add a field photo for a thoughtful read on crop health, growth, and visible signs of stress.</p>
          <div className="hero-proof"><span className="proof-icon"><CheckCircle2 size={14} /></span><span>Built for the details that matter in the field</span></div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-sun" />
          <div className="art-leaf leaf-one"><Leaf size={56} strokeWidth={1.25} /></div><div className="art-leaf leaf-two"><Leaf size={42} strokeWidth={1.25} /></div><div className="art-leaf leaf-three"><Leaf size={34} strokeWidth={1.25} /></div><div className="art-stem" />
          <div className="art-note"><span><Sparkles size={13} /></span> Thoughtful crop insights</div><div className="art-index">01 <span>/</span> 03</div>
        </div>
      </section>

      <section className="workspace-grid" aria-label="Crop analysis workspace">
        <UploadCard />
        <section className="card recent-card">
          <header className="section-card-header"><div className="section-heading-row"><div className="section-heading-icon results-heading-icon"><Activity size={19} /></div><div><h2>Latest analysis</h2><p>Your current session’s results, ready to revisit.</p></div></div><Badge variant="outline" className="result-count-badge">{succeeded.length} READY</Badge></header>
          <div className="recent-results-content">
            {succeeded.length === 0 ? <div className="recent-empty"><ScanLine size={22} /><strong>Your results will appear here</strong><span>Analyze a field photo to see a crop health summary and open its full field note.</span></div> : (
              <div className="recent-result-list">
                {succeeded.map((result) => (
                  <button className="recent-result" type="button" key={result.image_id} onClick={() => viewResult(result.image_id)}>
                    {result.preview ? <img src={result.preview} alt="" /> : <span className="recent-result-placeholder"><Sprout size={18} /></span>}
                    <span className="recent-result-copy"><strong>{result.analysis.crop_type || result.filename}</strong><small>{result.filename} · {result.analysis.health_status || "Status unavailable"}</small><code>{result.image_id}</code></span>
                    <ArrowRight size={16} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </section>

      <section className="trust-row" aria-label="How Netra Vision works">
        <div className="trust-item"><span className="trust-icon"><ScanLine size={17} /></span><span><b>Look closer</b><small>Start with a clear crop photo</small></span></div><span className="trust-separator"><ArrowRight size={14} /></span>
        <div className="trust-item"><span className="trust-icon"><Sparkles size={17} /></span><span><b>Get context</b><small>See growth and visible symptoms</small></span></div><span className="trust-separator"><ArrowRight size={14} /></span>
        <div className="trust-item"><span className="trust-icon"><Sprout size={17} /></span><span><b>Choose a next step</b><small>Use practical, cautious guidance</small></span></div><div className="trust-note"><CheckCircle2 size={15} /> Made for field use</div>
      </section>
    </main>
  )
}
