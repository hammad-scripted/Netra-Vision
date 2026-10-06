import { ChevronRight, FileImage, LoaderCircle, RefreshCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAnalysisStore } from "@/store/useAnalysisStore"

function isHealthyStatus(value: string) {
  return /healthy|normal|good/i.test(value)
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || "Date unavailable"
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date)
}

export function HistoryTable() {
  const historyEntries = useAnalysisStore((state) => state.historyEntries)
  const historyTotal = useAnalysisStore((state) => state.historyTotal)
  const historyBusy = useAnalysisStore((state) => state.historyBusy)
  const historyError = useAnalysisStore((state) => state.historyError)
  const detailBusy = useAnalysisStore((state) => state.detailBusy)
  const selectedImageId = useAnalysisStore((state) => state.selectedImageId)
  const refreshAnalysisHistory = useAnalysisStore((state) => state.refreshAnalysisHistory)
  const openAnalysisById = useAnalysisStore((state) => state.openAnalysisById)

  const openAnalysis = async (imageId: string) => {
    await openAnalysisById(imageId)
    window.requestAnimationFrame(() => {
      document.getElementById("analysis-detail")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    })
  }

  return (
    <>
      <div className="history-table-toolbar">
        <div>
          <h3>Previous uploads</h3>
          <p>{historyTotal > historyEntries.length ? `Showing the latest ${historyEntries.length} of ${historyTotal} saved analyses` : "Most recent saved analyses"}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refreshAnalysisHistory()} disabled={historyBusy}>
          <RefreshCw className={historyBusy ? "spin" : ""} /> Refresh
        </Button>
      </div>

      {historyError && <div className="inline-alert history-alert" role="alert">{historyError}</div>}

      <div className="history-table-shell">
        {historyBusy && historyEntries.length === 0 ? (
          <div className="history-state"><LoaderCircle className="spin" size={19} /> Loading saved analyses…</div>
        ) : historyEntries.length === 0 ? (
          <div className="history-state history-empty"><FileImage size={20} /><span>No previous uploads yet. Completed analyses will appear here.</span></div>
        ) : (
          <div className="history-table-scroll">
            <table className="history-table">
              <thead><tr>
                <th scope="col">Image and crop</th><th scope="col">Health</th><th scope="col">Findings</th>
                <th scope="col">Uploaded</th><th scope="col">Image ID</th><th scope="col"><span className="visually-hidden">Open analysis</span></th>
              </tr></thead>
              <tbody>
                {historyEntries.map((entry) => (
                  <tr className={selectedImageId === entry.image_id ? "history-row-active" : ""} key={entry.image_id}>
                    <td><div className="history-image-cell"><strong>{entry.crop_type || entry.filename}</strong><span>{entry.filename}{entry.growth_stage ? ` · ${entry.growth_stage}` : ""}</span></div></td>
                    <td><Badge variant={isHealthyStatus(entry.health_status) ? "success" : "warning"}>{entry.health_status || "Unknown"}</Badge></td>
                    <td><span className={entry.disease_count ? "history-findings history-findings-alert" : "history-findings"}>{entry.disease_count}</span></td>
                    <td><time dateTime={entry.created_at}>{formatDate(entry.created_at)}</time></td>
                    <td><code className="history-image-id" title={entry.image_id}>{entry.image_id}</code></td>
                    <td><Button variant="outline" size="sm" className="history-open-button" onClick={() => void openAnalysis(entry.image_id)} disabled={detailBusy} aria-label={`Open analysis ${entry.image_id}`}>Open <ChevronRight /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
