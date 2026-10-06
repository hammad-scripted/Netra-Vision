import { create } from "zustand"

import {
  analyzeImages,
  checkApiHealth as fetchApiHealth,
  getSavedAnalysis,
  type AnalysisEntry,
  type CompletedAnalysis,
} from "@/lib/api"

export type Theme = "light" | "dark"
export type ApiState = "checking" | "online" | "offline"
export type SelectedImage = { id: string; file: File; preview: string }
export type ResultEntry = AnalysisEntry & { preview?: string }

const MAX_IMAGES = 10
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png"])

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light"
  try {
    const savedTheme = window.localStorage.getItem("netra-theme")
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  } catch {
    return "light"
  }
}

let detailRequestId = 0

interface AnalysisStore {
  theme: Theme
  apiState: ApiState
  selectedImages: SelectedImage[]
  results: ResultEntry[]
  activeResult: CompletedAnalysis | null
  activePreview: string | undefined
  selectedImageId: string | null
  busy: boolean
  detailBusy: boolean
  dragging: boolean
  formError: string
  detailError: string
  toggleTheme: () => void
  setDragging: (dragging: boolean) => void
  addFiles: (fileList: FileList | File[]) => void
  removeSelectedImage: (id: string) => void
  clearSelectedImages: () => void
  checkApiHealth: (signal?: AbortSignal) => Promise<void>
  analyzeSelectedImages: () => Promise<void>
  selectResult: (entry: ResultEntry) => Promise<void>
}

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  theme: getInitialTheme(),
  apiState: "checking",
  selectedImages: [],
  results: [],
  activeResult: null,
  activePreview: undefined,
  selectedImageId: null,
  busy: false,
  detailBusy: false,
  dragging: false,
  formError: "",
  detailError: "",

  toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
  setDragging: (dragging) => set({ dragging }),

  addFiles: (fileList) => {
    const { selectedImages } = get()
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

    const additions = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
    }))

    set({
      selectedImages: [...selectedImages, ...additions],
      formError: errors[0] ?? "",
    })
  },

  removeSelectedImage: (id) => set((state) => ({
    selectedImages: state.selectedImages.filter((image) => image.id !== id),
  })),

  clearSelectedImages: () => set({ selectedImages: [], formError: "" }),

  checkApiHealth: async (signal) => {
    try {
      await fetchApiHealth(signal)
      if (!signal?.aborted) set({ apiState: "online" })
    } catch {
      if (!signal?.aborted) set({ apiState: "offline" })
    }
  },

  analyzeSelectedImages: async () => {
    const { selectedImages, busy } = get()
    if (!selectedImages.length || busy) return

    const imagesToAnalyze = selectedImages
    set({
      busy: true,
      formError: "",
      detailError: "",
      detailBusy: false,
      activeResult: null,
      selectedImageId: null,
      activePreview: undefined,
    })
    detailRequestId += 1

    try {
      const response = await analyzeImages(imagesToAnalyze.map((image) => image.file))
      const nextResults = response.results.map((entry, index) => ({
        ...entry,
        preview: imagesToAnalyze[index]?.preview,
      })) as ResultEntry[]
      set({ results: nextResults })

      const firstCompleted = nextResults.find(
        (entry): entry is CompletedAnalysis & { preview?: string } => entry.success,
      )
      if (firstCompleted) void get().selectResult(firstCompleted)
    } catch (error) {
      set({ formError: error instanceof Error ? error.message : "Analysis failed. Please try again." })
    } finally {
      set({ busy: false })
    }
  },

  selectResult: async (entry) => {
    if (!entry.success) return
    const requestId = ++detailRequestId
    set({
      selectedImageId: entry.image_id,
      activePreview: entry.preview,
      detailBusy: true,
      detailError: "",
    })

    try {
      const result = await getSavedAnalysis(entry.image_id)
      if (requestId === detailRequestId) set({ activeResult: result })
    } catch (error) {
      if (requestId === detailRequestId) {
        set({
          activeResult: null,
          detailError: error instanceof Error ? error.message : "Could not load this analysis.",
        })
      }
    } finally {
      if (requestId === detailRequestId) set({ detailBusy: false })
    }
  },
}))
