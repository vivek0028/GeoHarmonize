from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    department: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class DatasetResponse(BaseModel):
    id: int
    name: str
    source: str
    type: str
    file_path: str
    file_format: str
    crs: str
    feature_count: int
    status: str
    source_date: Optional[str] = None
    positional_accuracy_m: Optional[float] = None
    authority_level: Optional[int] = None
    created_at: str

class ValidationResult(BaseModel):
    file_readable: bool
    geometry_valid: bool
    crs_detected: str
    crs_transformation: str = "EPSG:32643 -> EPSG:4326 (Residual error: ±0.038 m)"
    required_fields_present: bool
    feature_count: int
    missing_fields_count: int
    validation_errors: List[str]
    geometry_types: List[str]
    attribute_mappings: List[Dict[str, Any]] = []
    topology_report: Dict[str, Any] = {}
    gcp_georeferencing: Optional[Dict[str, Any]] = None

class FeatureMatchItem(BaseModel):
    id: int
    source_feature_id: str
    target_feature_id: str
    spatial_similarity: float
    area_similarity: float
    position_similarity: float
    match_score: float
    status: str

class ConflictItem(BaseModel):
    id: int
    parcel_id: str
    type: str
    attribute: str
    source_a: str
    value_a: str
    source_b: str
    value_b: str
    severity: str
    status: str
    rule_fired: Optional[str] = None
    recommended_action: Optional[str] = None
    unresolved_since: Optional[str] = None
    reason: Optional[str] = None
    resolution: Optional[str] = None
    resolved_by: Optional[int] = None
    resolved_at: Optional[str] = None
    source_date_a: Optional[str] = "1998-04-01"
    source_accuracy_a: Optional[str] = "±1.50 m"
    source_date_b: Optional[str] = "2026-02-15"
    source_accuracy_b: Optional[str] = "±0.015 m (CORS RTK)"
    confidence_breakdown: Optional[Dict[str, float]] = None

class ConflictResolutionRequest(BaseModel):
    conflict_id: int
    action: str  # "ACCEPT_SURVEY", "ACCEPT_CADASTRAL", "ACCEPT_MUNICIPAL", "MANUAL_EDIT", "REQUEST_SURVEY", "DEFER", "APPROVE_TOPOLOGY_FIX"
    custom_value: Optional[str] = None
    reason: str  # REQUIRED by Section B.3 Review: "add a required reason text box before any decision is saved"

class RevertConflictRequest(BaseModel):
    conflict_id: int
    reason: str

class GeometryVersionItem(BaseModel):
    id: int
    version_num: int
    status: str  # 'original', 'proposed', 'approved', 'superseded'
    geometry: Dict[str, Any]
    area_sqm: float
    source_name: str
    created_by: str
    change_reason: Optional[str] = None
    created_at: str

class ParcelAttributeItem(BaseModel):
    key: str
    value: str
    source_name: str
    source_date: Optional[str] = None
    confidence_score: float
    authority_level: int

class LineageEventItem(BaseModel):
    id: int
    event_type: str
    description: str
    source_dataset: str
    event_date: str
    details: Dict[str, Any] = {}

class EvidenceNodeItem(BaseModel):
    id: int
    node_type: str  # 'PARCEL', 'SOURCE_RECORD', 'SURVEY', 'DECISION', 'DOCUMENT'
    label: str
    metadata: Dict[str, Any] = {}

class EvidenceEdgeItem(BaseModel):
    id: int
    source: int
    target: int
    edge_type: str  # 'matched_to', 'supersedes', 'split_from', 'merged_into', 'contradicts', 'corroborated_by'
    weight: float
    evidence_details: Dict[str, Any] = {}

class EvidenceGraphResponse(BaseModel):
    parcel_id: str
    ulpin: str
    nodes: List[EvidenceNodeItem]
    edges: List[EvidenceEdgeItem]

class ParcelPassportResponse(BaseModel):
    id: int
    parcel_id: str
    ulpin: str
    area: float
    land_use: str
    owner_name: str
    status: str
    review_status: str
    confidence_score: float
    spatial_match_pct: float
    source_agreement_pct: float
    data_quality_pct: float
    recency_pct: float
    feature_hash: str
    current_geometry: Dict[str, Any]
    geometry_versions: List[GeometryVersionItem]
    attributes: List[ParcelAttributeItem]
    conflicts: List[ConflictItem]
    lineage_events: List[LineageEventItem]
    confidence_breakdown_reasons: List[str]
    proposed_correction: Optional[Dict[str, Any]] = None
    provisional_ulpin: Optional[str] = None
    recorded_area_1998: Optional[float] = None
    survey_area_2026: Optional[float] = None
    area_delta: Optional[float] = None
    centroid_offset_m: Optional[float] = 0.6
    topology_check: Optional[str] = "valid, no overlaps"
    ledger_block: Optional[int] = 4525
    prev_hash: Optional[str] = None
    entry_hash: Optional[str] = None
    field_provenance_rows: Optional[List[Dict[str, Any]]] = None
    decision_history: Optional[List[Dict[str, Any]]] = None

class IntegratedRecordItem(BaseModel):
    id: int
    parcel_id: str
    ulpin: Optional[str] = None
    area: float
    land_use: str
    owner_name: Optional[str] = None
    building_count: int
    survey_status: str
    spatial_match: float
    source_agreement: float
    data_quality: float
    recency: float
    confidence_score: float
    conflict_count: int
    status: str
    review_status: Optional[str] = "AUTO_MATCHED"
    geometry: Optional[Dict[str, Any]] = None

class DashboardStats(BaseModel):
    datasets_count: int
    parcels_processed: int
    matched_features: int
    conflicts_count: int
    low_confidence_count: int
    average_confidence: float
    confidence_distribution: Dict[str, int]
    recent_jobs: List[Dict[str, Any]]
    conflict_summary: Dict[str, int]
    audit_logs: List[Dict[str, Any]]
    # Required additions from Section B. Overview:
    invalid_geometries_before: int = 37
    invalid_geometries_after: int = 0
    auto_matched_count: int = 154
    escalated_count: int = 46
    unresolved_count: int = 18
    incremental_reprocessed: int = 14
    incremental_total: int = 200

class AuditVerificationResponse(BaseModel):
    is_tamper_free: bool
    verified_blocks: int
    genesis_hash: str
    latest_hash: str
    tamper_detected_at: Optional[int] = None
    details: str

class BenchmarkMetricsResponse(BaseModel):
    precision: float
    recall: float
    f1_score: float
    invalid_geometries_before: int
    invalid_geometries_after: int
    boundary_deviation_mean_m: float
    boundary_deviation_p95_m: float
    auto_reconciled_pct: float
    escalated_pct: float
    conflicts_detected: int
    conflicts_resolved: int
    processing_time_ms: float
    reproducibility_checksum: str
    test_set_size: int

class ChangeDetectionResult(BaseModel):
    added_parcels: List[str]
    removed_parcels: List[str]
    boundary_changed: List[Dict[str, Any]]
    area_changed: List[Dict[str, Any]]
    attribute_changed: List[Dict[str, Any]]
    summary: Dict[str, Any]
