import { getToken } from "../storage/tokenStorage";
import type {
  AuthResult,
  Bet,
  BetWithFeedback,
  Category,
  DashboardResponse,
  PublicUser,
  TimeDnaEntry,
} from "./types";
import type { Confidence } from "@betu/shared";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}, requireAuth = true): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (requireAuth) {
    const token = await getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = (body as { message?: string | string[] } | null)?.message;
    throw new ApiError(
      Array.isArray(message) ? message.join(", ") : message ?? response.statusText,
      response.status,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const authApi = {
  guest: () => request<AuthResult>("/auth/guest", { method: "POST" }, false),
  register: (dto: { email: string; password: string; displayName?: string }) =>
    request<AuthResult>("/auth/register", { method: "POST", body: JSON.stringify(dto) }, false),
  login: (dto: { email: string; password: string }) =>
    request<AuthResult>("/auth/login", { method: "POST", body: JSON.stringify(dto) }, false),
  linkEmail: (dto: { email: string; password: string; displayName?: string }) =>
    request<AuthResult>("/auth/link-email", { method: "PATCH", body: JSON.stringify(dto) }),
};

export const categoriesApi = {
  list: () => request<Category[]>("/categories"),
  create: (dto: { name: string; icon?: string }) =>
    request<Category>("/categories", { method: "POST", body: JSON.stringify(dto) }),
};

export const betsApi = {
  create: (dto: { title: string; categoryId: string; predictedSeconds: number }) =>
    request<Bet>("/bets", { method: "POST", body: JSON.stringify(dto) }),
  list: (query?: { range?: "today" | "week" | "month" | "all"; categoryId?: string }) => {
    const params = new URLSearchParams();
    if (query?.range) params.set("range", query.range);
    if (query?.categoryId) params.set("categoryId", query.categoryId);
    const qs = params.toString();
    return request<Bet[]>(`/bets${qs ? `?${qs}` : ""}`);
  },
  get: (id: string) => request<Bet>(`/bets/${id}`),
  start: (id: string) => request<Bet>(`/bets/${id}/start`, { method: "POST" }),
  pause: (id: string) => request<Bet>(`/bets/${id}/pause`, { method: "POST" }),
  resume: (id: string) => request<Bet>(`/bets/${id}/resume`, { method: "POST" }),
  finish: (id: string) => request<BetWithFeedback>(`/bets/${id}/finish`, { method: "POST" }),
  abandon: (id: string) => request<Bet>(`/bets/${id}/abandon`, { method: "POST" }),
};

export const analyticsApi = {
  dashboard: () => request<DashboardResponse>("/analytics/dashboard"),
  timeDna: () => request<TimeDnaEntry[]>("/analytics/time-dna"),
  timeIq: () => request<{ score: number; tier: string }>("/analytics/time-iq"),
};

export type { PublicUser, Confidence };
