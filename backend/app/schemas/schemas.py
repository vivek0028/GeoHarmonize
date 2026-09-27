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
    created_at: str

class ValidationResult(BaseModel):
    file_readable: bool
    geometry_valid: bool
    crs_detected: str
    required_fields_present: bool
    feature_count: int
    missing_fields_count: int
    validation_errors: List[str]
    geometry_types: List[str]

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
    resolution: Optional[str] = None
    resolved_by: Optional[int] = None
    resolved_at: Optional[str] = None

class ConflictResolutionRequest(BaseModel):
    conflict_id: int
    action: str  # "ACCEPT_SURVEY", "ACCEPT_CADASTRAL", "ACCEPT_MUNICIPAL", "MANUAL_EDIT", "REQUEST_SURVEY", "DEFER"
    custom_value: Optional[str] = None
    notes: Optional[str] = None

class IntegratedRecordItem(BaseModel):
    id: int
    parcel_id: str
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

class ChangeDetectionResult(BaseModel):
    added_parcels: List[str]
    removed_parcels: List[str]
    boundary_changed: List[Dict[str, Any]]
    area_changed: List[Dict[str, Any]]
    attribute_changed: List[Dict[str, Any]]
    summary: Optional[Dict[str, Any]] = None
