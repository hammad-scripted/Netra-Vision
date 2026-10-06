import { useRef, type DragEvent } from "react"
import {
  AlertCircle,
  ArrowRight,
  CloudUpload,
  LoaderCircle,
  ScanLine,
  ShieldCheck,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAnalysisStore } from "@/store/useAnalysisStore"

export function UploadCard() {
  const selectedImages = useAnalysisStore((state) => state.selectedImages)
  const busy = useAnalysisStore((state) => state.busy)
  const dragging = useAnalysisStore((state) => state.dragging)
  const formError = useAnalysisStore((state) => state.formError)
  const setDragging = useAnalysisStore((state) => state.setDragging)
  const addFiles = useAnalysisStore((state) => state.addFiles)
  const removeSelectedImage = useAnalysisStore((state) => state.removeSelectedImage)
  const clearSelectedImages = useAnalysisStore((state) => state.clearSelectedImages)
  const analyzeSelectedImages = useAnalysisStore((state) => state.analyzeSelectedImages)
  const fileInput = useRef<HTMLInputElement>(null)

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files)
  }

  return (
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
  )
}
