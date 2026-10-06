import { Activity } from "lucide-react"
import { useEffect } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AnalysisDetail } from "@/components/history/AnalysisDetail"
import { AnalysisLookup } from "@/components/history/AnalysisLookup"
import { HistoryTable } from "@/components/history/HistoryTable"
import { useAnalysisStore } from "@/store/useAnalysisStore"

export function HistoryPage() {
  const authenticated = useAnalysisStore((state) => state.authenticated)
  const historyLoaded = useAnalysisStore((state) => state.historyLoaded)
  const historyBusy = useAnalysisStore((state) => state.historyBusy)
  const historyError = useAnalysisStore((state) => state.historyError)
  const refreshAnalysisHistory = useAnalysisStore((state) => state.refreshAnalysisHistory)
  const historyEntries = useAnalysisStore((state) => state.historyEntries)
  const historyTotal = useAnalysisStore((state) => state.historyTotal)
  const issueCount = historyEntries.reduce((total, entry) => total + entry.disease_count, 0)

  useEffect(() => {
    if (authenticated && !historyLoaded && !historyBusy && !historyError) void refreshAnalysisHistory()
  }, [authenticated, historyBusy, historyError, historyLoaded, refreshAnalysisHistory])

  return (
    <main className="page-main history-page">
      <section className="page-heading">
        <div className="eyebrow"><span className="eyebrow-line" /> YOUR FIELD RECORD</div>
        <h1>Field notes</h1>
        <p>Browse previous uploads and reopen a saved crop analysis whenever you need it.</p>
      </section>
      <Card className="results-card">
        <CardHeader className="section-card-header results-header">
          <div className="section-heading-row"><div className="section-heading-icon results-heading-icon"><Activity size={19} /></div><div><CardTitle>Saved analyses</CardTitle><CardDescription>Open a record by selecting it below or searching its image ID.</CardDescription></div></div>
          <Badge variant="outline" className="result-count-badge">{historyTotal} SAVED</Badge>
        </CardHeader>
        <CardContent className="field-notes-content">
          <AnalysisLookup />
          <div className="history-summary"><div><span>Saved analyses</span><strong>{historyTotal}</strong></div><div><span>Findings in recent uploads</span><strong className={issueCount ? "metric-alert" : ""}>{issueCount}</strong></div></div>
          <HistoryTable />
          <AnalysisDetail />
        </CardContent>
      </Card>
    </main>
  )
}
