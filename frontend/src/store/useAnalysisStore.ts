import { create } from "zustand"

import {
  analyzeImages,
  getAnalysisHistory,
  hasApiToken,
  checkApiHealth as fetchApiHealth,
  getApiInfo,
  getSavedAnalysis,
  setApiToken,
  ApiError,
  type AnalysisEntry,
  type ApiInfo,
  type CompletedAnalysis,
  type SavedAnalysisSummary,
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
let historyRequestId = 0

interface AnalysisStore {
  theme: Theme
  authenticated: boolean
  authBusy: boolean
  authError: string
  apiState: ApiState
  apiInfo: ApiInfo | null
  selectedImages: SelectedImage[]
  results: ResultEntry[]
  historyEntries: SavedAnalysisSummary[]
  historyTotal: number
  historyBusy: boolean
  historyLoaded: boolean
  historyError: string
  lookupId: string
  activeResult: CompletedAnalysis | null
  activePreview: string | undefined
  selectedImageId: string | null
  busy: boolean
  detailBusy: boolean
  dragging: boolean
  formError: string
  detailError: string
  toggleTheme: () => void
  signIn: (token: string) => Promise<boolean>
  signOut: () => void
  setDragging: (dragging: boolean) => void
  addFiles: (fileList: FileList | File[]) => void
  removeSelectedImage: (id: string) => void
  clearSelectedImages: () => void
  checkApiHealth: (signal?: AbortSignal) => Promise<void>
  fetchApiInfo: (signal?: AbortSignal) => Promise<void>
  refreshAnalysisHistory: (signal?: AbortSignal) => Promise<void>
  setLookupId: (imageId: string) => void
  openAnalysisById: (imageId: string, preview?: string) => Promise<void>
  analyzeSelectedImages: () => Promise<void>
  selectResult: (entry: ResultEntry) => Promise<void>
}

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  theme: getInitialTheme(),
  authenticated: hasApiToken(),
  authBusy: false,
  authError: "",
  apiState: "checking",
  apiInfo: null,
  selectedImages: [],
  results: [],
  historyEntries: [],
  historyTotal: 0,
  historyBusy: false,
  historyLoaded: false,
  historyError: "",
  lookupId: "",
  activeResult: null,
  activePreview: undefined,
  selectedImageId: null,
  busy: false,
  detailBusy: false,
  dragging: false,
  formError: "",
  detailError: "",

  toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
  signIn: async (token) => {
    const cleanToken = token.trim()
    if (!cleanToken) {
      set({ authError: "Enter your API access token." })
      return false
    }
    setApiToken(cleanToken)
    set({ authBusy: true, authError: "" })
    try {
      const response = await getAnalysisHistory()
      set({
        authenticated: true,
        authBusy: false,
        authError: "",
        historyEntries: response.results,
        historyTotal: response.total,
        historyLoaded: true,
        historyError: "",
      })
      return true
    } catch (error) {
      setApiToken(null)
      set({
        authenticated: false,
        authBusy: false,
        authError: error instanceof Error ? error.message : "Sign in failed.",
      })
      return false
    }
  },
  signOut: () => {
    historyRequestId += 1
    detailRequestId += 1
    setApiToken(null)
    set({
      authenticated: false,
      authError: "",
      historyEntries: [],
      historyTotal: 0,
      historyLoaded: false,
      historyError: "",
      selectedImages: [],
      results: [],
      busy: false,
      detailBusy: false,
      formError: "",
      lookupId: "",
      activeResult: null,
      activePreview: undefined,
      selectedImageId: null,
      detailError: "",
    })
  },
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
      if (!signal?.aborted) {
        set({ apiState: "online" })
        if (!get().apiInfo) void get().fetchApiInfo(signal)
        if (get().authenticated && !get().historyLoaded && !get().historyBusy) {
          void get().refreshAnalysisHistory(signal)
        }
      }
    } catch {
      if (!signal?.aborted) set({ apiState: "offline" })
    }
  },

  fetchApiInfo: async (signal) => {
    try {
      const apiInfo = await getApiInfo(signal)
      if (!signal?.aborted) set({ apiInfo })
    } catch {
      if (!signal?.aborted) set({ apiInfo: null })
    }
  },

  refreshAnalysisHistory: async (signal) => {
    const requestId = ++historyRequestId
    set({ historyBusy: true, historyError: "" })
    try {
      const response = await getAnalysisHistory(100, signal)
      if (requestId === historyRequestId && !signal?.aborted) {
        set({
          historyEntries: response.results,
          historyTotal: response.total,
          historyLoaded: true,
        })
      }
    } catch (error) {
      if (requestId === historyRequestId && !signal?.aborted) {
        if (error instanceof ApiError && error.status === 401) {
          setApiToken(null)
          set({ authenticated: false })
        }
        set({
          historyError: error instanceof Error ? error.message : "Could not load previous uploads.",
          historyLoaded: false,
        })
      }
    } finally {
      if (requestId === historyRequestId) set({ historyBusy: false })
    }
  },

  setLookupId: (lookupId) => set({ lookupId, detailError: "" }),

  openAnalysisById: async (value, preview) => {
    const imageId = value.trim()
    if (!imageId) {
      set({ detailError: "Enter an image ID to open its saved analysis." })
      return
    }

    const requestId = ++detailRequestId
    set({
      lookupId: imageId,
      selectedImageId: imageId,
      activePreview: preview,
      activeResult: null,
      detailBusy: true,
      detailError: "",
    })

    try {
      const result = await getSavedAnalysis(imageId)
      if (requestId === detailRequestId) set({ activeResult: result })
    } catch (error) {
      if (requestId === detailRequestId) {
        if (error instanceof ApiError && error.status === 401) {
          setApiToken(null)
          set({ authenticated: false })
        }
        set({
          activeResult: null,
          detailError: error instanceof Error ? error.message : "Could not load this analysis.",
        })
      }
    } finally {
      if (requestId === detailRequestId) set({ detailBusy: false })
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
      void get().refreshAnalysisHistory()

      const firstCompleted = nextResults.find(
        (entry): entry is CompletedAnalysis & { preview?: string } => entry.success,
      )
      if (firstCompleted) void get().selectResult(firstCompleted)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setApiToken(null)
        set({ authenticated: false })
      }
      set({ formError: error instanceof Error ? error.message : "Analysis failed. Please try again." })
    } finally {
      set({ busy: false })
    }
  },

  selectResult: async (entry) => {
    if (!entry.success) return
    await get().openAnalysisById(entry.image_id, entry.preview)
  },
}))
