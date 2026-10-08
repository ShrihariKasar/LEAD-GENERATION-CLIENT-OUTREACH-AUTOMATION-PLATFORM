import {
  AuthResponse, Workspace, User, ICPProfile, Lead, DecisionTrace,
  Conversation, Message, OutreachSequence, Meeting, AvailableSlot,
  Integration, DashboardOverview, AuditLog, AIRun, SetupStatus
} from '../types';

const API_BASE = '/api/v1';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('threadline_token');
  }

  private getWorkspaceId(): string | null {
    return localStorage.getItem('threadline_workspace_id');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const wsId = this.getWorkspaceId();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (wsId) {
      headers['X-Workspace-Id'] = wsId;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      let errorDetail = `Request failed (${response.status})`;
      try {
        const errorJson = await response.json();
        errorDetail = errorJson.detail || errorDetail;
      } catch {
        // use default
      }
      throw new Error(errorDetail);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // --- AUTH ---
  async login(payload: { email: string; password: string }): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    localStorage.setItem('threadline_token', res.access_token);
    if (res.workspace) {
      localStorage.setItem('threadline_workspace_id', res.workspace.id);
    }
    return res;
  }

  async register(payload: { email: string; password: string; full_name: string; workspace_name?: string }): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    localStorage.setItem('threadline_token', res.access_token);
    if (res.workspace) {
      localStorage.setItem('threadline_workspace_id', res.workspace.id);
    }
    return res;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  logout() {
    localStorage.removeItem('threadline_token');
    localStorage.removeItem('threadline_workspace_id');
  }

  // --- WORKSPACE ---
  async getCurrentWorkspace(): Promise<Workspace> {
    return this.request<Workspace>('/workspaces/current');
  }

  async updateWorkspace(payload: Partial<Workspace>): Promise<Workspace> {
    return this.request<Workspace>('/workspaces/current', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  // --- ICPS ---
  async listICPs(): Promise<ICPProfile[]> {
    return this.request<ICPProfile[]>('/icps');
  }

  async createICP(payload: Partial<ICPProfile>): Promise<ICPProfile> {
    return this.request<ICPProfile>('/icps', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateICP(id: string, payload: Partial<ICPProfile>): Promise<ICPProfile> {
    return this.request<ICPProfile>(`/icps/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async deleteICP(id: string): Promise<void> {
    return this.request<void>(`/icps/${id}`, {
      method: 'DELETE'
    });
  }

  // --- LEADS ---
  async listLeads(params?: Record<string, any>): Promise<{ items: Lead[]; total: number; page: number; limit: number; pages: number }> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          query.append(k, String(v));
        }
      });
    }
    return this.request(`/leads?${query.toString()}`);
  }

  async getLead(id: string): Promise<Lead> {
    return this.request<Lead>(`/leads/${id}`);
  }

  async createLead(payload: Partial<Lead>): Promise<Lead> {
    return this.request<Lead>('/leads', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateLead(id: string, payload: Partial<Lead>): Promise<Lead> {
    return this.request<Lead>(`/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async getDecisionTrace(leadId: string): Promise<DecisionTrace> {
    return this.request<DecisionTrace>(`/leads/${leadId}/decision-trace`);
  }

  async getTelegramOptInLink(leadId: string): Promise<{ opt_in_link: string; status: string; token: string }> {
    return this.request(`/leads/${leadId}/telegram-opt-in-link`);
  }

  async discoverLeads(payload: {
    icp_profile_id?: string;
    job_titles?: string[];
    seniorities?: string[];
    industries?: string[];
    locations?: string[];
    employee_ranges?: string[];
    keywords?: string;
    domain?: string;
    limit?: number;
  }): Promise<{ discovered_total: number; created_count: number; skipped_duplicates: number; leads: Lead[] }> {
    return this.request('/leads/discover', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async importCSV(file: File, icpProfileId?: string): Promise<{ imported_count: number; skipped_duplicates: number }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = this.getToken();
    const wsId = this.getWorkspaceId();
    const url = `${API_BASE}/leads/import-csv${icpProfileId ? `?icp_profile_id=${icpProfileId}` : ''}`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(wsId ? { 'X-Workspace-Id': wsId } : {})
      },
      body: formData
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'CSV Import Failed' }));
      throw new Error(err.detail || 'CSV Import Failed');
    }

    return res.json();
  }

  async bulkActionLeads(payload: { lead_ids: string[]; action: string; sequence_id?: string; qualification_status?: string }): Promise<any> {
    return this.request('/leads/bulk', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // --- ENRICHMENT ---
  async enrichLead(leadId: string, providers?: string[]): Promise<Lead> {
    return this.request<Lead>(`/enrichment/leads/${leadId}`, {
      method: 'POST',
      body: JSON.stringify(providers ? { providers } : {})
    });
  }

  // --- CONVERSATIONS ---
  async listConversations(params?: { state?: string; channel?: string }): Promise<Conversation[]> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v) query.append(k, v);
      });
    }
    return this.request<Conversation[]>(`/conversations?${query.toString()}`);
  }

  async getConversation(id: string): Promise<Conversation> {
    return this.request<Conversation>(`/conversations/${id}`);
  }

  async sendMessage(conversationId: string, content: string): Promise<Message> {
    return this.request<Message>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }

  async takeoverConversation(conversationId: string): Promise<Conversation> {
    return this.request<Conversation>(`/conversations/${conversationId}/takeover`, {
      method: 'POST'
    });
  }

  async resumeAI(conversationId: string): Promise<Conversation> {
    return this.request<Conversation>(`/conversations/${conversationId}/resume-ai`, {
      method: 'POST'
    });
  }

  async triggerAIAnalysis(conversationId: string): Promise<any> {
    return this.request(`/conversations/${conversationId}/analyze`, {
      method: 'POST'
    });
  }

  // --- SEQUENCES ---
  async listSequences(): Promise<OutreachSequence[]> {
    return this.request<OutreachSequence[]>('/sequences');
  }

  async createSequence(payload: Partial<OutreachSequence>): Promise<OutreachSequence> {
    return this.request<OutreachSequence>('/sequences', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateSequence(id: string, payload: Partial<OutreachSequence>): Promise<OutreachSequence> {
    return this.request<OutreachSequence>(`/sequences/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async activateSequence(id: string): Promise<OutreachSequence> {
    return this.request<OutreachSequence>(`/sequences/${id}/activate`, {
      method: 'POST'
    });
  }

  async pauseSequence(id: string): Promise<OutreachSequence> {
    return this.request<OutreachSequence>(`/sequences/${id}/pause`, {
      method: 'POST'
    });
  }

  // --- CALENDAR & MEETINGS ---
  async getAvailability(daysAhead = 7, durationMinutes = 30): Promise<AvailableSlot[]> {
    return this.request<AvailableSlot[]>(`/calendar/availability?days_ahead=${daysAhead}&duration_minutes=${durationMinutes}`);
  }

  async listMeetings(): Promise<Meeting[]> {
    return this.request<Meeting[]>('/calendar/meetings');
  }

  async scheduleMeeting(payload: {
    lead_id: string;
    title: string;
    start_at: string;
    end_at: string;
    timezone?: string;
    description?: string;
    attendees?: string[];
  }): Promise<Meeting> {
    return this.request<Meeting>('/calendar/meetings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // --- INTEGRATIONS ---
  async listIntegrations(): Promise<Integration[]> {
    return this.request<Integration[]>('/integrations');
  }

  async connectIntegration(provider: string, credentials: Record<string, any>, account_identifier?: string): Promise<Integration> {
    return this.request<Integration>(`/integrations/${provider}/connect`, {
      method: 'POST',
      body: JSON.stringify({ credentials, account_identifier })
    });
  }

  async testIntegration(provider: string): Promise<any> {
    return this.request(`/integrations/${provider}/test`, {
      method: 'POST'
    });
  }

  async disconnectIntegration(provider: string): Promise<void> {
    return this.request<void>(`/integrations/${provider}`, {
      method: 'DELETE'
    });
  }

  // --- ANALYTICS ---
  async getDashboardOverview(): Promise<DashboardOverview> {
    return this.request<DashboardOverview>('/analytics/overview');
  }

  // --- AUDIT & OBSERVABILITY ---
  async listAuditLogs(limit = 50): Promise<AuditLog[]> {
    return this.request<AuditLog[]>(`/audit/logs?limit=${limit}`);
  }

  async listAIRuns(limit = 50): Promise<AIRun[]> {
    return this.request<AIRun[]>(`/audit/ai-runs?limit=${limit}`);
  }

  // --- SETUP ---
  async getSetupStatus(): Promise<SetupStatus> {
    return this.request<SetupStatus>('/setup/status');
  }

  // --- SEARCH ---
  async globalSearch(q: string): Promise<{ leads: any[]; companies: any[]; meetings: any[] }> {
    return this.request(`/search?q=${encodeURIComponent(q)}`);
  }
}

export const api = new ApiClient();
