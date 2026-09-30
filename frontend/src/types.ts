export interface User {
  id: number;
  name: string;
  email: string;
  role: 'APPROVER' | 'ANALYST' | 'UPLOADER' | 'READ_ONLY' | 'ADMIN' | 'GIS_ANALYST';
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
  source_date?: string;
  positional_accuracy_m?: number;
  authority_level?: number;
  created_at: string;
}

export interface ValidationResult {
  file_readable: boolean;
  geometry_valid: boolean;
  crs_detected: string;
  crs_transformation?: string;
  crs_transformed?: string;
  residual_error_m?: number;
  required_fields_present: boolean;
  feature_count: number;
  missing_fields_count: number;
  validation_errors: string[];
  geometry_types: string[];
  attribute_mappings?: {
    source_field: string;
    target_field: string;
    confidence: number;
    override: boolean;
  }[];
  topology_report?: {
    overlaps_found: number;
    slivers_found: number;
    invalid_rings_repaired: number;
    closed_rings_pct: number;
    status: string;
  };
  gcp_georeferencing?: {
    gcp_points_used: number;
    affine_transformation_matrix: string;
    root_mean_square_error_m: number;
  };
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
  rule_fired?: string;
  recommended_action?: string;
  unresolved_since?: string;
  detected_at?: string;
  reason?: string;
  resolution?: string;
  resolved_at?: string;
  source_date_a?: string;
  source_accuracy_a?: string;
  source_date_b?: string;
  source_accuracy_b?: string;
  confidence_breakdown?: {
    geometry_overlap_iou: number;
    centroid_distance_score: number;
    id_similarity: number;
    source_accuracy_weight: number;
    topology_check: number;
  };
}

export interface GeometryVersion {
  id: number;
  version_num: number;
  status: 'original' | 'proposed' | 'approved' | 'superseded';
  geometry: any;
  area_sqm: number;
  source_name: string;
  created_by: string;
  change_reason?: string;
  created_at: string;
}

export interface ParcelAttribute {
  key: string;
  value: string;
  source_name: string;
  source_date?: string;
  confidence_score: number;
  authority_level: number;
}

export interface LineageEvent {
  id: number;
  event_type: 'SPLIT' | 'MERGE' | 'BOUNDARY_SHIFT' | 'ATTRIBUTE_CHANGE' | 'RECONCILIATION';
  description: string;
  source_dataset: string;
  event_date: string;
  details: Record<string, any>;
}

export interface EvidenceNode {
  id: number;
  node_type: 'PARCEL' | 'SOURCE_RECORD' | 'SURVEY' | 'DECISION' | 'DOCUMENT';
  label: string;
  metadata: Record<string, any>;
}

export interface EvidenceEdge {
  id: number;
  source: number;
  target: number;
  edge_type: 'matched_to' | 'supersedes' | 'split_from' | 'merged_into' | 'contradicts' | 'corroborated_by';
  weight: number;
  evidence_details: Record<string, any>;
}

export interface EvidenceGraph {
  parcel_id: string;
  ulpin: string;
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
}

export interface ParcelPassport {
  id: number;
  parcel_id: string;
  ulpin: string;
  area: number;
  land_use: string;
  owner_name: string;
  status: string;
  review_status: string;
  confidence_score: number;
  spatial_match_pct: number;
  source_agreement_pct: number;
  data_quality_pct: number;
  recency_pct: number;
  feature_hash: string;
  current_geometry: any;
  geometry_versions: GeometryVersion[];
  attributes: ParcelAttribute[];
  conflicts: Conflict[];
  lineage_events: LineageEvent[];
  confidence_breakdown_reasons: string[];
  proposed_correction?: {
    before_area: number;
    after_area: number;
    before_geometry: any;
    after_geometry: any;
    rule_applied: string;
  };
}

export interface IntegratedRecord {
  id: number;
  parcel_id: string;
  ulpin?: string;
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
  review_status?: string;
  feature_hash?: string;
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
    duration_sec?: number;
  }[];
  conflict_summary: Record<string, number>;
  audit_logs: {
    id: number;
    block_index?: number;
    user_name: string;
    action: string;
    entity: string;
    entity_id: string;
    reason?: string;
    prev_hash?: string;
    current_hash?: string;
    full_hash?: string;
    old_value: string;
    new_value: string;
    created_at: string;
  }[];
  invalid_geometries_before: number;
  invalid_geometries_after: number;
  auto_matched_count: number;
  escalated_count: number;
  unresolved_count: number;
  incremental_reprocessed: number;
  incremental_total: number;
}

export interface AuditVerification {
  is_tamper_free: boolean;
  verified_blocks: number;
  genesis_hash: string;
  latest_hash: string;
  tamper_detected_at?: number | null;
  details: string;
}

export interface LineageSummary {
  total_splits: number;
  total_mergers: number;
  total_boundary_shifts: number;
  total_attribute_updates: number;
}

export interface FeatureMatch {
  id: number;
  parcel_id: string;
  cadastral_feature_id: string;
  survey_feature_id: string;
  confidence_score: number;
  spatial_similarity: number;
  status: string;
}

export interface BenchmarkMetrics {
  test_set_size: number;
  precision: number;
  recall: number;
  f1_score: number;
  match_f1_score?: number;
  match_precision?: number;
  match_recall?: number;
  invalid_geometries_before: number;
  invalid_geometries_after: number;
  boundary_deviation_mean_m: number;
  mean_boundary_deviation_m?: number;
  boundary_deviation_p95_m: number;
  conflicts_correctly_detected: number;
  conflicts_detected?: number;
  conflicts_resolved: number;
  auto_reconciled_pct: number;
  automated_match_pct?: number;
  escalated_pct: number;
  processing_time_ms: number;
  processing_time_seconds?: number;
  reproducibility_checksum: string;
  verified_at: string;
}

export interface ChangeDetectionResult {
  added_parcels: string[];
  removed_parcels: string[];
  boundary_changed: {
    parcel_id: string;
    spatial_overlap_iou: number;
    boundary_offset_detected: boolean;
    offset_distance_m?: number;
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
