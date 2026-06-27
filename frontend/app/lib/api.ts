/**
 * Backend API client — fetch wrappers for all endpoints.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

import type { AnalysisResponse, AnalysisResult } from "./types";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const resp = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!resp.ok) {
      const error = await resp.json().catch(() => ({ detail: resp.statusText }));
      throw new Error(error.detail || `API error: ${resp.status}`);
    }

    return resp.json();
  }

  async createAnalysis(repoUrl: string): Promise<AnalysisResponse> {
    return this.request<AnalysisResponse>("/api/analysis", {
      method: "POST",
      body: JSON.stringify({ repo_url: repoUrl }),
    });
  }

  async getAnalysis(analysisId: string): Promise<AnalysisResult> {
    return this.request<AnalysisResult>(`/api/analysis/${analysisId}`);
  }

  async listReports(): Promise<{ reports: Array<Record<string, unknown>> }> {
    return this.request("/api/reports");
  }

  async getReport(analysisId: string): Promise<AnalysisResult> {
    return this.request<AnalysisResult>(`/api/reports/${analysisId}`);
  }

  async healthCheck(): Promise<{ status: string }> {
    return this.request("/health");
  }

  getStreamUrl(analysisId: string): string {
    return `${this.baseUrl}/api/analysis/${analysisId}/stream`;
  }
}

export const api = new ApiClient();
export default api;
