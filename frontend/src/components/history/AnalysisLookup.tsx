import { AlertCircle, LoaderCircle, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAnalysisStore } from "@/store/useAnalysisStore"

export function AnalysisLookup() {
  const lookupId = useAnalysisStore((state) => state.lookupId)
  const detailBusy = useAnalysisStore((state) => state.detailBusy)
  const detailError = useAnalysisStore((state) => state.detailError)
  const setLookupId = useAnalysisStore((state) => state.setLookupId)
  const openAnalysisById = useAnalysisStore((state) => state.openAnalysisById)

  return (
    <>
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
    </>
  )
}
