import { AlertCircle, CheckCircle2, FileImage, LoaderCircle, Sparkles, Sprout } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { useAnalysisStore } from "@/store/useAnalysisStore"

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

export function AnalysisDetail() {
  const detailBusy = useAnalysisStore((state) => state.detailBusy)
  const detailError = useAnalysisStore((state) => state.detailError)
  const activeResult = useAnalysisStore((state) => state.activeResult)
  const activePreview = useAnalysisStore((state) => state.activePreview)
  const analysis = activeResult?.analysis
  const diseases = Array.isArray(analysis?.diseases) ? analysis.diseases : []
  const healthy = /healthy|normal|good/i.test(analysis?.health_status || "")

  if (detailBusy) return <div id="analysis-detail" className="detail-loading"><LoaderCircle className="spin" size={18} /> Loading the saved analysis…</div>
  if (!activeResult || !analysis) {
    return detailError ? null : <div id="analysis-detail" className="detail-placeholder"><FileImage size={19} /><span>Choose a previous upload or enter its image ID to read the full field note.</span></div>
  }

  return (
    <div id="analysis-detail" className="analysis-detail">
      <div className="detail-section-heading">
        <div><span>ANALYSIS DETAIL</span><h3>{analysis.crop_type || "Crop analysis"}</h3></div>
        <Badge variant={healthy ? "success" : "warning"} className="health-badge"><span className="health-dot" />{analysis.health_status || "Status unavailable"}</Badge>
      </div>
      <div className="detail-record-meta">
        <div><span>IMAGE ID</span><code>{activeResult.image_id}</code></div><span>{activeResult.filename}</span><time dateTime={activeResult.created_at}>{formatDate(activeResult.created_at)}</time>
      </div>
      <div className="detail-topline">
        <div className="detail-crop-image">{activePreview ? <img src={activePreview} alt={`${analysis.crop_type || "Crop"} photo`} /> : <Sprout size={23} />}</div>
        <div className="detail-crop-copy"><span className="detail-kicker">Growth stage</span><h4>{analysis.growth_stage || "Not clear from this image"}</h4></div>
      </div>
      <div className="field-observation"><div className="field-observation-icon"><Sparkles size={17} /></div><div><span>FIELD OBSERVATION</span><p>{analysis.additional_notes || "No additional observations were noted."}</p></div></div>
      <div className="disease-heading"><h4>Visible concerns</h4><Badge variant="outline">{diseases.length} {diseases.length === 1 ? "finding" : "findings"}</Badge></div>
      {diseases.length === 0 ? (
        <div className="no-concerns"><CheckCircle2 size={18} /><span>No visible disease concerns in this photo.</span></div>
      ) : (
        <div className="disease-list">
          {diseases.map((disease, index) => (
            <article className="disease-item" key={`${disease.name}-${index}`}>
              <div className="disease-title-row"><span className="disease-mark"><AlertCircle size={16} /></span><h5>{disease.name || "Finding"}</h5><Badge variant={severityVariant(disease.severity || "")}>{disease.severity || "Unrated"}</Badge></div>
              <p>{disease.description || "No description provided."}</p>
              {disease.recommendations && <div className="recommendation"><span>Suggested next step</span><p>{disease.recommendations}</p></div>}
            </article>
          ))}
        </div>
      )}
      <div className="detail-disclaimer"><span className="circle-help" aria-hidden="true">i</span> Visual guidance is a starting point. Confirm uncertain symptoms with a local agronomist.</div>
    </div>
  )
}
