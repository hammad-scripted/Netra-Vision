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

export interface AccountProfile {
  id: string
  username: string
  email: string
  created_at: string
}

export interface AuthResponse {
  access_token: string
  token_type: "bearer"
  expires_in: number
  user: AccountProfile
}

const API_TOKEN_KEY = "netra-access-token"
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

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000" : window.location.origin))
  .replace(/\/$/, "")

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const detail: unknown = data?.detail
    if (typeof detail === "string") throw new ApiError(detail, response.status)
    if (Array.isArray(detail)) {
      const messages = detail.flatMap((entry: unknown) => {
        if (typeof entry !== "object" || entry === null) return []
        const issue = entry as { loc?: unknown; msg?: unknown }
        const path = Array.isArray(issue.loc)
          ? issue.loc.filter((part): part is string => typeof part === "string" && !["body", "query", "path"].includes(part))
          : []
        const message = typeof issue.msg === "string" ? issue.msg : "Invalid value"
        return [path.length ? `${path.join(".")}: ${message}` : message]
      })
      if (messages.length) throw new ApiError(messages.join("; "), response.status)
    }
    throw new ApiError("The request could not be completed.", response.status)
  }
  return data as T
}

export async function checkApiHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`, { signal })
  return parseResponse<HealthResponse>(response)
}

export async function getApiInfo(signal?: AbortSignal): Promise<ApiInfo> {
  const response = await fetch(`${API_BASE_URL}/api/info`, { signal })
  return parseResponse<ApiInfo>(response)
}

export async function createAccount(username: string, email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  })
  return parseResponse<AuthResponse>(response)
}

export async function loginWithPassword(identifier: string, password: string): Promise<AuthResponse> {
  const credentials = new URLSearchParams({ username: identifier, password })
  const response = await fetch(`${API_BASE_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: credentials,
  })
  return parseResponse<AuthResponse>(response)
}

export async function getCurrentAccount(): Promise<AccountProfile> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, authenticatedRequest())
  return parseResponse<AccountProfile>(response)
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

export async function getSavedAnalysisImage(imageId: string): Promise<string> {
  const response = await fetch(
    `${API_BASE_URL}/analyze_image/image/${encodeURIComponent(imageId)}`,
    authenticatedRequest(),
  )
  if (!response.ok) return parseResponse<string>(response)
  return URL.createObjectURL(await response.blob())
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
