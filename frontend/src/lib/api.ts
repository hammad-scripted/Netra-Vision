export interface DiseaseFinding {
  name: string
  severity: string
  recommendations: string
  description: string
}

export interface CropAnalysis {
  health_status: string
  growth_stage: string
  crop_type: string
  diseases: DiseaseFinding[]
  additional_notes: string
}

export interface CompletedAnalysis {
  success: true
  image_id: string
  filename: string
  created_at: string
  analysis: CropAnalysis
}

export interface FailedAnalysis {
  success: false
  filename: string
  error: string
}

export type AnalysisEntry = CompletedAnalysis | FailedAnalysis

export interface BatchAnalysisResponse {
  total: number
  succeeded: number
  failed: number
  results: AnalysisEntry[]
}

export interface SavedAnalysisSummary {
  image_id: string
  filename: string
  created_at: string
  crop_type: string
  growth_stage: string
  health_status: string
  disease_count: number
}

export interface AnalysisHistoryResponse {
  total: number
  results: SavedAnalysisSummary[]
}

export interface HealthResponse {
  status: string
  service: string
}

export interface ApiInfo {
  message: string
  app: string
  version: string
  endpoint: Record<string, string>
}

const API_TOKEN_KEY = "netra-api-token"
let memoryToken: string | null = null

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = "ApiError"
  }
}

export function hasApiToken(): boolean {
  return Boolean(getApiToken())
}

export function getApiToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage.getItem(API_TOKEN_KEY) || memoryToken
  } catch {
    return memoryToken
  }
}

export function setApiToken(token: string | null): void {
  if (typeof window === "undefined") return
  memoryToken = token
  try {
    if (token) window.sessionStorage.setItem(API_TOKEN_KEY, token)
    else window.sessionStorage.removeItem(API_TOKEN_KEY)
  } catch {
    // Keep the active browser session usable if storage is disabled.
  }
}

function authenticatedRequest(init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers)
  const token = getApiToken()
  if (token) headers.set("Authorization", `Bearer ${token}`)
  return { ...init, headers }
}

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000")
  .replace(/\/$/, "")

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = typeof data?.detail === "string" ? data.detail : "The request could not be completed."
    throw new ApiError(detail, response.status)
  }
  return data as T
}

export async function checkApiHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`, { signal })
  return parseResponse<HealthResponse>(response)
}

export async function getApiInfo(signal?: AbortSignal): Promise<ApiInfo> {
  const response = await fetch(`${API_BASE_URL}/`, { signal })
  return parseResponse<ApiInfo>(response)
}

export async function analyzeImages(files: File[]): Promise<BatchAnalysisResponse> {
  const formData = new FormData()
  const isSingle = files.length === 1
  const fieldName = isSingle ? "file" : "files"
  for (const file of files) formData.append(fieldName, file)

  const response = await fetch(
    `${API_BASE_URL}/analyze_image/${isSingle ? "image" : "batch"}`,
    authenticatedRequest({ method: "POST", body: formData }),
  )

  if (!response.ok) return parseResponse<BatchAnalysisResponse>(response)
  const data = await response.json()
  if (isSingle) {
    return {
      total: 1,
      succeeded: 1,
      failed: 0,
      results: [data as CompletedAnalysis],
    }
  }
  return data as BatchAnalysisResponse
}

export async function getSavedAnalysis(imageId: string): Promise<CompletedAnalysis> {
  const response = await fetch(
    `${API_BASE_URL}/analyze_image/${encodeURIComponent(imageId)}`,
    authenticatedRequest(),
  )
  return parseResponse<CompletedAnalysis>(response)
}

export async function getAnalysisHistory(
  limit = 100,
  signal?: AbortSignal,
): Promise<AnalysisHistoryResponse> {
  const response = await fetch(
    `${API_BASE_URL}/analyze_image/history?limit=${encodeURIComponent(limit)}`,
    authenticatedRequest({ signal }),
  )
  return parseResponse<AnalysisHistoryResponse>(response)
}
