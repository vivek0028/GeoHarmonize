export interface User {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'GIS_ANALYST' | 'VIEWER';
  department?: string;
}

export interface Dataset {
  id: number;
  name: string;
  source: string;
  type: string;
  file_path: string;
  file_format: string;
  crs: string;
  feature_count: number;
  status: string;
  created_at: string;
}

export interface ValidationResult {
  file_readable: boolean;
  geometry_valid: boolean;
  crs_detected: string;
  required_fields_present: boolean;
  feature_count: number;
  missing_fields_count: number;
  validation_errors: string[];
  geometry_types: string[];
}

export interface Conflict {
  id: number;
  parcel_id: string;
  type: string;
  attribute: string;
  source_a: string;
  value_a: string;
  source_b: string;
  value_b: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'RESOLVED' | 'DEFERRED' | 'SURVEY_REQUESTED';
  resolution?: string;
  resolved_at?: string;
}

export interface IntegratedRecord {
  id: number;
  parcel_id: string;
  area: number;
  land_use: string;
  owner_name?: string;
  building_count: number;
  survey_status: string;
  spatial_match: number;
  source_agreement: number;
  data_quality: number;
  recency: number;
  confidence_score: number;
  conflict_count: number;
  status: 'REVIEWED' | 'APPROVED' | 'PENDING_REVIEW';
  geometry?: any;
}

export interface DashboardStats {
  datasets_count: number;
  parcels_processed: number;
  matched_features: number;
  conflicts_count: number;
  low_confidence_count: number;
  average_confidence: number;
  confidence_distribution: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  recent_jobs: {
    id: number;
    dataset_name: string;
    job_type: string;
    status: string;
    progress: number;
    started_at: string;
    completed_at?: string;
  }[];
  conflict_summary: Record<string, number>;
  audit_logs: {
    id: number;
    user_name: string;
    action: string;
    entity: string;
    entity_id: string;
    old_value: string;
    new_value: string;
    created_at: string;
  }[];
}

export interface FeatureMatch {
  id: number;
  source_feature_id: string;
  target_feature_id: string;
  spatial_similarity: number;
  area_similarity: number;
  position_similarity: number;
  match_score: number;
  status: string;
}

export interface ChangeDetectionResult {
  added_parcels: string[];
  removed_parcels: string[];
  boundary_changed: {
    parcel_id: string;
    spatial_overlap_iou: number;
    boundary_offset_detected: boolean;
    status: string;
  }[];
  area_changed: {
    parcel_id: string;
    old_area: number;
    new_area: number;
    difference_sqm: number;
    percent_change: number;
  }[];
  attribute_changed: {
    parcel_id: string;
    field: string;
    old_value: string;
    new_value: string;
  }[];
  summary: {
    total_evaluated: number;
    total_area_shifts: number;
    total_boundary_realignments: number;
    total_attribute_updates: number;
  };
}
