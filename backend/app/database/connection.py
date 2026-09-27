import psycopg2
from psycopg2.extras import RealDictCursor
import json
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.core.config import settings
from app.core.security import get_password_hash

import time

def get_clean_db_url():
    url = settings.DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url

def get_db():
    conn = psycopg2.connect(get_clean_db_url(), cursor_factory=RealDictCursor)
    try:
        yield conn
    finally:
        conn.close()

def get_connection():
    return psycopg2.connect(get_clean_db_url(), cursor_factory=RealDictCursor)

def init_db():
    # Retry loop in case database is still warming up during deployment
    conn = None
    for attempt in range(1, 10):
        try:
            conn = psycopg2.connect(get_clean_db_url())
            break
        except Exception as e:
            print(f"Database connection attempt {attempt}/10 failed: {e}. Retrying in 2s...")
            time.sleep(2)
            
    if not conn:
        print("Warning: Could not connect to PostgreSQL on startup.")
        return
        
    conn.autocommit = True
    cursor = conn.cursor()
    
    # 1. Enable PostGIS
    cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
    cursor.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")
    
    # 2. Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'GIS_ANALYST',
        department VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    # 3. Datasets Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS datasets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        source VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        file_path TEXT NOT NULL,
        file_format VARCHAR(50) NOT NULL,
        crs VARCHAR(50) DEFAULT 'EPSG:4326',
        feature_count INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'ready',
        uploaded_by INT REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    # 4. Parcels Table (Native PostGIS Polygon Geometry)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS parcels (
        id SERIAL PRIMARY KEY,
        parcel_id VARCHAR(100) NOT NULL,
        geometry GEOMETRY(Polygon, 4326),
        area NUMERIC(10, 2),
        land_use VARCHAR(100),
        owner_name VARCHAR(255),
        source_dataset_id INT REFERENCES datasets(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'active',
        confidence_score NUMERIC(5, 2) DEFAULT 0.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_parcels_geom ON parcels USING GIST(geometry);
    CREATE INDEX IF NOT EXISTS idx_parcels_pid ON parcels(parcel_id);
    """)
    
    # 5. Buildings Table (Native PostGIS Polygon Geometry)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS buildings (
        id SERIAL PRIMARY KEY,
        building_id VARCHAR(100) NOT NULL,
        geometry GEOMETRY(Polygon, 4326),
        area NUMERIC(10, 2),
        building_type VARCHAR(100),
        parcel_ref VARCHAR(100),
        source_dataset_id INT REFERENCES datasets(id) ON DELETE CASCADE,
        confidence_score NUMERIC(5, 2) DEFAULT 0.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_buildings_geom ON buildings USING GIST(geometry);
    """)
    
    # 6. Survey Points Table (Native PostGIS Point Geometry)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS survey_points (
        id SERIAL PRIMARY KEY,
        point_code VARCHAR(100) NOT NULL,
        geometry GEOMETRY(Point, 4326),
        latitude NUMERIC(10, 7) NOT NULL,
        longitude NUMERIC(10, 7) NOT NULL,
        accuracy NUMERIC(6, 3),
        source VARCHAR(255),
        survey_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_survey_points_geom ON survey_points USING GIST(geometry);
    """)
    
    # 7. Feature Matches Table (AI Conflation Metrics)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS feature_matches (
        id SERIAL PRIMARY KEY,
        source_feature_id VARCHAR(100) NOT NULL,
        target_feature_id VARCHAR(100) NOT NULL,
        source_dataset_id INT REFERENCES datasets(id),
        target_dataset_id INT REFERENCES datasets(id),
        spatial_similarity NUMERIC(5, 2) NOT NULL,
        area_similarity NUMERIC(5, 2) NOT NULL,
        position_similarity NUMERIC(5, 2) NOT NULL,
        match_score NUMERIC(5, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'matched',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    # 8. Conflicts Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS conflicts (
        id SERIAL PRIMARY KEY,
        parcel_id VARCHAR(100) NOT NULL,
        type VARCHAR(100) NOT NULL,
        attribute VARCHAR(100) NOT NULL,
        source_a VARCHAR(255) NOT NULL,
        value_a TEXT NOT NULL,
        source_b VARCHAR(255) NOT NULL,
        value_b TEXT NOT NULL,
        severity VARCHAR(50) DEFAULT 'MEDIUM',
        status VARCHAR(50) DEFAULT 'PENDING',
        resolution TEXT,
        resolved_by INT REFERENCES users(id),
        resolved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_conflicts_pid ON conflicts(parcel_id);
    """)
    
    # 9. Integrated Records (Harmonized Truth with PostGIS Geometry)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS integrated_records (
        id SERIAL PRIMARY KEY,
        parcel_id VARCHAR(100) UNIQUE NOT NULL,
        geometry GEOMETRY(Polygon, 4326),
        area NUMERIC(10, 2) NOT NULL,
        land_use VARCHAR(100) NOT NULL,
        owner_name VARCHAR(255),
        building_count INT DEFAULT 0,
        survey_status VARCHAR(50) DEFAULT 'reconciled',
        spatial_match NUMERIC(5, 2) DEFAULT 94.00,
        source_agreement NUMERIC(5, 2) DEFAULT 88.00,
        data_quality NUMERIC(5, 2) DEFAULT 92.00,
        recency NUMERIC(5, 2) DEFAULT 85.00,
        confidence_score NUMERIC(5, 2) NOT NULL,
        conflict_count INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'REVIEWED',
        approved_by INT REFERENCES users(id),
        approved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_integrated_geom ON integrated_records USING GIST(geometry);
    """)
    
    # 10. Processing Jobs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS processing_jobs (
        id SERIAL PRIMARY KEY,
        dataset_id INT REFERENCES datasets(id),
        dataset_name VARCHAR(255),
        job_type VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'COMPLETED',
        progress INT DEFAULT 100,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    # 11. Audit Logs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_name VARCHAR(255) NOT NULL,
        action VARCHAR(100) NOT NULL,
        entity VARCHAR(100) NOT NULL,
        entity_id VARCHAR(100) NOT NULL,
        old_value TEXT,
        new_value TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    seed_postgis_defaults(conn)
    cursor.close()
    conn.close()

def seed_postgis_defaults(conn):
    cursor = conn.cursor()
    
    # Seed Users
    cursor.execute("SELECT COUNT(*) FROM users;")
    if cursor.fetchone()[0] == 0:
        users = [
            ("Admin Director", "admin@geoharmonize.gov", "admin123", "ADMIN", "Cadastral Administration & Revenue"),
            ("Alex Mercer", "analyst@geoharmonize.gov", "analyst123", "GIS_ANALYST", "Directorate of Land Records & Cadastral GIS"),
            ("Public Viewer", "viewer@geoharmonize.gov", "viewer123", "VIEWER", "Municipal Citizens Portal")
        ]
        for name, email, pwd, role, dept in users:
            cursor.execute(
                "INSERT INTO users (name, email, password_hash, role, department) VALUES (%s, %s, %s, %s, %s);",
                (name, email, get_password_hash(pwd), role, dept)
            )
            
    # Seed Datasets
    cursor.execute("SELECT COUNT(*) FROM datasets;")
    if cursor.fetchone()[0] == 0:
        cad_path = os.path.join(settings.DATA_DIR, "cadastral.geojson")
        surv_path = os.path.join(settings.DATA_DIR, "survey_parcels.geojson")
        bldg_path = os.path.join(settings.DATA_DIR, "buildings.geojson")
        pts_path = os.path.join(settings.DATA_DIR, "survey_points.csv")
        
        datasets = [
            ("Cadastral 2026", "Revenue Cadastre Records", "cadastral", cad_path, "GeoJSON", "EPSG:4326", 12, "ready", 1),
            ("New Survey GNSS 2026", "National Drone & GNSS Survey", "survey", surv_path, "GeoJSON", "EPSG:4326", 12, "ready", 2),
            ("Municipal GIS Buildings", "City Property Tax Registry", "buildings", bldg_path, "GeoJSON", "EPSG:4326", 12, "ready", 1),
            ("Geodetic Ground Points", "Survey of India Geodetic Base", "points", pts_path, "CSV", "EPSG:4326", 48, "ready", 2),
        ]
        for name, src, dtype, path, fmt, crs, count, st, uid in datasets:
            cursor.execute(
                "INSERT INTO datasets (name, source, type, file_path, file_format, crs, feature_count, status, uploaded_by) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);",
                (name, src, dtype, path, fmt, crs, count, st, uid)
            )
            
        recent_jobs = [
            (1, "Cadastral 2026", "VALIDATION", "COMPLETED", 100, "2026-02-20 09:30:00", "2026-02-20 09:31:00"),
            (1, "Cadastral 2026", "CRS_HARMONIZATION", "COMPLETED", 100, "2026-02-20 09:31:00", "2026-02-20 09:32:00"),
            (2, "New Survey GNSS 2026", "SPATIAL_MATCHING", "COMPLETED", 100, "2026-02-20 10:15:00", "2026-02-20 10:16:30"),
            (2, "New Survey GNSS 2026", "TOPOLOGY_VALIDATION", "COMPLETED", 100, "2026-02-20 10:16:30", "2026-02-20 10:17:00"),
            (3, "Municipal GIS Buildings", "ATTRIBUTE_MAPPING", "COMPLETED", 100, "2026-02-20 11:00:00", "2026-02-20 11:01:00"),
            (1, "Cadastral 2026", "CHANGE_DETECTION", "COMPLETED", 100, "2026-02-20 11:05:00", "2026-02-20 11:06:00"),
        ]
        for did, dname, jtype, st, prog, s_at, c_at in recent_jobs:
            cursor.execute(
                "INSERT INTO processing_jobs (dataset_id, dataset_name, job_type, status, progress, started_at, completed_at) VALUES (%s, %s, %s, %s, %s, %s, %s);",
                (did, dname, jtype, st, prog, s_at, c_at)
            )
            
    # Seed Parcels with native PostGIS ST_GeomFromGeoJSON()
    cursor.execute("SELECT COUNT(*) FROM parcels;")
    if cursor.fetchone()[0] == 0 and os.path.exists(os.path.join(settings.DATA_DIR, "cadastral.geojson")):
        with open(os.path.join(settings.DATA_DIR, "cadastral.geojson")) as f:
            cad_data = json.load(f)
        with open(os.path.join(settings.DATA_DIR, "survey_parcels.geojson")) as f:
            surv_data = json.load(f)
            
        surv_map = {feat["properties"]["matched_parcel_ref"]: feat for feat in surv_data["features"]}
        
        for feat in cad_data["features"]:
            props = feat["properties"]
            pid = props["parcel_id"]
            geom_json = json.dumps(feat["geometry"])
            area = props.get("area", 200.0)
            land_use = props.get("land_use", "Residential")
            owner = props.get("owner_name", "Unknown")
            
            cursor.execute(
                """INSERT INTO parcels (parcel_id, geometry, area, land_use, owner_name, source_dataset_id, status, confidence_score)
                   VALUES (%s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326), %s, %s, %s, 1, 'active', 91.0);""",
                (pid, geom_json, area, land_use, owner)
            )
            
            surv_feat = surv_map.get(pid)
            surv_area = surv_feat["properties"]["area"] if surv_feat else area
            
            # Feature Match
            cursor.execute(
                """INSERT INTO feature_matches (source_feature_id, target_feature_id, source_dataset_id, target_dataset_id, spatial_similarity, area_similarity, position_similarity, match_score, status)
                   VALUES (%s, %s, 1, 2, 94.0, 91.0, 96.0, 94.0, 'matched');""",
                (pid, surv_feat["properties"]["survey_id"] if surv_feat else "S-20101")
            )
            
            # Conflicts
            if pid == "P-101":
                cursor.execute(
                    """INSERT INTO conflicts (parcel_id, type, attribute, source_a, value_a, source_b, value_b, severity, status)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);""",
                    ("P-101", "AREA_MISMATCH", "area", "Cadastral (1998)", "240.0 m²", "Survey GNSS (2026)", "248.0 m²", "HIGH", "PENDING")
                )
            elif pid == "P-102":
                cursor.execute(
                    """INSERT INTO conflicts (parcel_id, type, attribute, source_a, value_a, source_b, value_b, severity, status)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);""",
                    ("P-102", "TOPOLOGY_ERROR", "geometry_overlap", "Cadastral P-102", "Boundary", "Cadastral P-103", "Overlap: 3.4 m²", "CRITICAL", "PENDING")
                )
            elif pid == "P-105":
                cursor.execute(
                    """INSERT INTO conflicts (parcel_id, type, attribute, source_a, value_a, source_b, value_b, severity, status)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);""",
                    ("P-105", "LAND_USE_MISMATCH", "land_use", "Revenue Cadastre", "Residential", "Survey Field Inspection", "Commercial", "MEDIUM", "PENDING")
                )
            elif pid == "P-108":
                cursor.execute(
                    """INSERT INTO conflicts (parcel_id, type, attribute, source_a, value_a, source_b, value_b, severity, status)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);""",
                    ("P-108", "TOPOLOGY_ERROR", "geometry_gap", "Cadastral P-108", "Boundary", "Adjacent Roadway", "Sliver Gap: 1.8 m²", "MEDIUM", "PENDING")
                )
                
            # Seed Integrated Records with PostGIS geometry
            int_geom_json = json.dumps(surv_feat["geometry"]) if surv_feat else geom_json
            int_area = surv_area
            conf_score = 74.0 if pid == "P-101" else (62.0 if pid == "P-102" else 91.0)
            conf_count = 1 if pid in ["P-101", "P-102", "P-105", "P-108"] else 0
            
            cursor.execute(
                """INSERT INTO integrated_records 
                   (parcel_id, geometry, area, land_use, owner_name, building_count, survey_status, spatial_match, source_agreement, data_quality, recency, confidence_score, conflict_count, status)
                   VALUES (%s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326), %s, %s, %s, 1, 'reconciled', 94.0, 88.0, 92.0, 85.0, %s, %s, 'REVIEWED');""",
                (pid, int_geom_json, int_area, land_use, owner, conf_score, conf_count)
            )

    # Seed Initial Audit Log
    cursor.execute("SELECT COUNT(*) FROM audit_logs;")
    if cursor.fetchone()[0] == 0:
        cursor.execute(
            """INSERT INTO audit_logs (user_name, action, entity, entity_id, old_value, new_value)
               VALUES (%s, %s, %s, %s, %s, %s);""",
            ("Alex Mercer (GIS Analyst)", "INITIAL_HARMONIZATION", "Dataset", "Cadastral 2026", "Raw Ingestion", "Harmonized to PostGIS EPSG:4326")
        )
        
    cursor.close()
