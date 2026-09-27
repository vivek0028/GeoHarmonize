import {
  DashboardStats,
  Dataset,
  ValidationResult,
  Conflict,
  IntegratedRecord,
  FeatureMatch,
  ChangeDetectionResult,
  User
} from '../types';

const BASE_URL = '/api';

export const api = {
  // Auth
  login: async (email: string, password: string): Promise<{ access_token: string; user: User }> => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error('Invalid credentials');
    return res.json();
  },

  getCurrentUser: async (): Promise<User> => {
    const res = await fetch(`${BASE_URL}/auth/me`);
    if (!res.ok) throw new Error('Failed to load user profile');
    return res.json();
  },

  // Dashboard Stats
  getDashboardStats: async (): Promise<DashboardStats> => {
    const res = await fetch(`${BASE_URL}/processing/dashboard-stats`);
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  },

  // Datasets
  getDatasets: async (): Promise<Dataset[]> => {
    const res = await fetch(`${BASE_URL}/datasets/`);
    if (!res.ok) throw new Error('Failed to fetch datasets');
    return res.json();
  },

  uploadDataset: async (formData: FormData): Promise<Dataset> => {
    const res = await fetch(`${BASE_URL}/datasets/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },

  validateDataset: async (datasetId: number): Promise<ValidationResult> => {
    const res = await fetch(`${BASE_URL}/datasets/${datasetId}/validate`);
    if (!res.ok) throw new Error('Validation failed');
    return res.json();
  },

  // Map Layers
  getMapLayers: async () => {
    const res = await fetch(`${BASE_URL}/map/layers`);
    if (!res.ok) throw new Error('Failed to fetch map layers');
    return res.json();
  },

  // Parcels
  getParcels: async (search?: string, status?: string): Promise<IntegratedRecord[]> => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    const res = await fetch(`${BASE_URL}/parcels/?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch parcels');
    return res.json();
  },

  getParcelDetail: async (parcelId: string) => {
    const res = await fetch(`${BASE_URL}/parcels/${parcelId}`);
    if (!res.ok) throw new Error('Failed to load parcel detail');
    return res.json();
  },

  approveParcel: async (parcelId: string) => {
    const res = await fetch(`${BASE_URL}/parcels/${parcelId}/approve`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Approval failed');
    return res.json();
  },

  // Conflicts
  getConflicts: async (status?: string, severity?: string): Promise<Conflict[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (severity) params.append('severity', severity);
    const res = await fetch(`${BASE_URL}/conflicts/?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch conflicts');
    return res.json();
  },

  resolveConflict: async (
    conflictId: number,
    action: string,
    customValue?: string,
    notes?: string
  ) => {
    const res = await fetch(`${BASE_URL}/conflicts/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conflict_id: conflictId,
        action,
        custom_value: customValue,
        notes
      })
    });
    if (!res.ok) throw new Error('Failed to resolve conflict');
    return res.json();
  },

  // Feature Matches
  getMatches: async (): Promise<FeatureMatch[]> => {
    const res = await fetch(`${BASE_URL}/matching/`);
    if (!res.ok) throw new Error('Failed to fetch matches');
    return res.json();
  },

  // Processing & Change Detection
  runPipelineJob: async (jobType: string) => {
    const res = await fetch(`${BASE_URL}/processing/run-pipeline?job_type=${jobType}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Pipeline execution failed');
    return res.json();
  },

  getChangeDetection: async (): Promise<ChangeDetectionResult> => {
    const res = await fetch(`${BASE_URL}/processing/change-detection`);
    if (!res.ok) throw new Error('Failed to fetch change detection');
    return res.json();
  },

  getTopologyCheck: async () => {
    const res = await fetch(`${BASE_URL}/processing/topology-check`);
    if (!res.ok) throw new Error('Failed to check topology');
    return res.json();
  },

  // Reports
  getReportsSummary: async () => {
    const res = await fetch(`${BASE_URL}/reports/summary`);
    if (!res.ok) throw new Error('Failed to fetch report summary');
    return res.json();
  }
};
