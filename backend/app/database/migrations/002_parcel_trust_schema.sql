-- ====================================================================
-- GeoHarmonize + Parcel-Trust Schema Migration (002)
-- Positioning: "Every parcel has a history. Every decision has evidence."
-- ====================================================================

-- 1. Ensure PostGIS and UUID Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enhanced Datasets Table
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS source_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS positional_accuracy_m NUMERIC(6, 3) DEFAULT 0.05;
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS authority_level INT DEFAULT 1;

-- 3. Source Records Table (Differentiator [D]: Never overwrite source records)
CREATE TABLE IF NOT EXISTS source_records (
    id SERIAL PRIMARY KEY,
    dataset_id INT REFERENCES datasets(id) ON DELETE CASCADE,
    source_type VARCHAR(100) NOT NULL, -- CADASTRAL_MAP, DRONE_SURVEY, MUNICIPAL_GIS, IMAGERY_EXTRACTED, UTILITY_NETWORK
    external_id VARCHAR(100) NOT NULL,
    raw_attributes JSONB DEFAULT '{}',
    geometry GEOMETRY(Geometry, 4326),
    source_date DATE,
    positional_accuracy_m NUMERIC(6, 3) DEFAULT 0.05,
    authority_level INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_source_records_geom ON source_records USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_source_records_ext ON source_records(external_id);

-- 4. Geometry Versions Table (Differentiator [D]: Every change creates a new version)
CREATE TABLE IF NOT EXISTS geometry_versions (
    id SERIAL PRIMARY KEY,
    parcel_id VARCHAR(100) NOT NULL,
    version_num INT NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'original', -- 'original', 'proposed', 'approved', 'superseded'
    geometry GEOMETRY(Polygon, 4326),
    area_sqm NUMERIC(12, 2) NOT NULL,
    source_record_id INT REFERENCES source_records(id) ON DELETE SET NULL,
    source_name VARCHAR(255) NOT NULL,
    created_by VARCHAR(255) DEFAULT 'System Ingestion',
    change_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_geom_versions_pid ON geometry_versions(parcel_id);
CREATE INDEX IF NOT EXISTS idx_geom_versions_geom ON geometry_versions USING GIST(geometry);

-- 5. Enhanced Parcels Table
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS ulpin VARCHAR(50);
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS feature_hash VARCHAR(64);
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS current_geometry_version_id INT REFERENCES geometry_versions(id) ON DELETE SET NULL;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS review_status VARCHAR(50) DEFAULT 'AUTO_MATCHED'; -- 'AUTO_MATCHED', 'ESCALATED', 'UNRESOLVED', 'APPROVED'
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS spatial_match_pct NUMERIC(5, 2) DEFAULT 94.00;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS source_agreement_pct NUMERIC(5, 2) DEFAULT 88.00;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS data_quality_pct NUMERIC(5, 2) DEFAULT 92.00;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS recency_pct NUMERIC(5, 2) DEFAULT 85.00;

CREATE INDEX IF NOT EXISTS idx_parcels_ulpin ON parcels(ulpin);
CREATE INDEX IF NOT EXISTS idx_parcels_hash ON parcels(feature_hash);

-- 6. Parcel Attributes Table (Fine-grained field-level provenance)
CREATE TABLE IF NOT EXISTS parcel_attributes (
    id SERIAL PRIMARY KEY,
    parcel_id VARCHAR(100) NOT NULL,
    attribute_key VARCHAR(100) NOT NULL,
    attribute_value TEXT NOT NULL,
    source_name VARCHAR(255) NOT NULL,
    source_date DATE,
    confidence_score NUMERIC(5, 2) DEFAULT 90.0,
    authority_level INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_parcel_attrs_pid ON parcel_attributes(parcel_id);

-- 7. Enhanced Conflicts Table (Case View [D])
ALTER TABLE conflicts ADD COLUMN IF NOT EXISTS rule_fired TEXT;
ALTER TABLE conflicts ADD COLUMN IF NOT EXISTS recommended_action TEXT;
ALTER TABLE conflicts ADD COLUMN IF NOT EXISTS unresolved_since TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE conflicts ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE conflicts ADD COLUMN IF NOT EXISTS revert_state JSONB;

-- 8. Lineage Events Table (Differentiator [D]: Timeline of changes, splits, mergers)
CREATE TABLE IF NOT EXISTS lineage_events (
    id SERIAL PRIMARY KEY,
    parcel_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'SPLIT', 'MERGE', 'BOUNDARY_SHIFT', 'ATTRIBUTE_CHANGE', 'RECONCILIATION'
    description TEXT NOT NULL,
    source_dataset VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_lineage_pid ON lineage_events(parcel_id);

-- 9. Evidence Graph Nodes Table (Differentiator [D]: Evidence network)
CREATE TABLE IF NOT EXISTS evidence_nodes (
    id SERIAL PRIMARY KEY,
    parcel_id VARCHAR(100) NOT NULL,
    node_type VARCHAR(50) NOT NULL, -- 'PARCEL', 'SOURCE_RECORD', 'SURVEY', 'DECISION', 'DOCUMENT'
    label VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_evidence_nodes_pid ON evidence_nodes(parcel_id);

-- 10. Evidence Graph Edges Table (Differentiator [D]: Evidence network relationships)
CREATE TABLE IF NOT EXISTS evidence_edges (
    id SERIAL PRIMARY KEY,
    source_node_id INT REFERENCES evidence_nodes(id) ON DELETE CASCADE,
    target_node_id INT REFERENCES evidence_nodes(id) ON DELETE CASCADE,
    edge_type VARCHAR(50) NOT NULL, -- 'matched_to', 'supersedes', 'split_from', 'merged_into', 'contradicts', 'corroborated_by'
    weight NUMERIC(4, 2) DEFAULT 1.0,
    evidence_details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Tamper-Evident SHA-256 Audit Ledger Table (Section A.8)
CREATE TABLE IF NOT EXISTS audit_ledger (
    id SERIAL PRIMARY KEY,
    block_index INT NOT NULL,
    prev_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    officer_name VARCHAR(255) NOT NULL,
    officer_role VARCHAR(100) NOT NULL, -- 'UPLOADER', 'ANALYST', 'APPROVER', 'READ_ONLY'
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    reason TEXT NOT NULL,
    source_datasets TEXT[] DEFAULT '{}',
    old_value TEXT,
    new_value TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_ledger_idx ON audit_ledger(block_index);

-- 12. Authority Rules Table (Configurable attribution rules)
CREATE TABLE IF NOT EXISTS authority_rules (
    id SERIAL PRIMARY KEY,
    attribute_name VARCHAR(100) NOT NULL,
    winning_source VARCHAR(255) NOT NULL,
    condition_metric VARCHAR(100) NOT NULL, -- 'positional_accuracy', 'authority_level', 'recency'
    threshold_value NUMERIC(10, 4) NOT NULL,
    description TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
