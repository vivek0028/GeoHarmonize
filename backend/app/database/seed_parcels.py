import hashlib
import json
import random
import time
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
from shapely.geometry import Polygon, MultiPolygon, Point, box, mapping
from shapely import wkt
from app.core.config import settings
from app.core.security import get_password_hash

def get_connection():
    url = settings.DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return psycopg2.connect(url, cursor_factory=RealDictCursor)

def compute_sha256(data_str: str) -> str:
    return hashlib.sha256(data_str.encode('utf-8')).hexdigest()

def run_seed_all():
    print("=" * 60)
    print("GeoHarmonize + Parcel-Trust Seed Generator (200 Parcels)")
    print("Positioning: Every parcel has a history. Every decision has evidence.")
    print("=" * 60)

    conn = get_connection()
    conn.autocommit = True
    cursor = conn.cursor()

    # Apply 002 Migration first
    migration_file = "backend/app/database/migrations/002_parcel_trust_schema.sql"
    try:
        with open(migration_file, 'r') as f:
            cursor.execute(f.read())
        print("✓ Applied 002_parcel_trust_schema.sql")
    except Exception as e:
        print(f"Notice on migration: {e}")

    # Clean previous demo data for fresh consistency
    cursor.execute("""
        TRUNCATE TABLE evidence_edges CASCADE;
        TRUNCATE TABLE evidence_nodes CASCADE;
        TRUNCATE TABLE audit_ledger CASCADE;
        TRUNCATE TABLE lineage_events CASCADE;
        TRUNCATE TABLE parcel_attributes CASCADE;
        TRUNCATE TABLE conflicts CASCADE;
        TRUNCATE TABLE geometry_versions CASCADE;
        TRUNCATE TABLE source_records CASCADE;
        TRUNCATE TABLE parcels CASCADE;
        TRUNCATE TABLE datasets CASCADE;
        TRUNCATE TABLE users CASCADE;
        TRUNCATE TABLE processing_jobs CASCADE;
        TRUNCATE TABLE feature_matches CASCADE;
        TRUNCATE TABLE buildings CASCADE;
        TRUNCATE TABLE survey_points CASCADE;
        TRUNCATE TABLE integrated_records CASCADE;
    """)

    # 1. Seed Users (with 4 distinct roles: uploader, analyst, approver, read_only)
    users = [
        ("JD Admin (Director)", "admin@geoharmonize.gov", "admin123", "APPROVER", "Directorate of Land Records & Cadastral GIS"),
        ("Alex Mercer", "analyst@geoharmonize.gov", "analyst123", "ANALYST", "Cadastral Reconciliation & Spatial AI Wing"),
        ("Pooja Sharma", "uploader@geoharmonize.gov", "uploader123", "UPLOADER", "Drone & GNSS Field Ingestion Unit"),
        ("Public Audit Officer", "viewer@geoharmonize.gov", "viewer123", "READ_ONLY", "State Land Governance Oversight"),
    ]
    user_ids = []
    for name, email, pwd, role, dept in users:
        cursor.execute(
            """INSERT INTO users (name, email, password_hash, role, department)
               VALUES (%s, %s, %s, %s, %s) RETURNING id;""",
            (name, email, get_password_hash(pwd), role, dept)
        )
        user_ids.append(cursor.fetchone()['id'])
    admin_uid = user_ids[0]
    analyst_uid = user_ids[1]
    uploader_uid = user_ids[2]
    print("✓ Seeded 4 Users with RBAC (UPLOADER, ANALYST, APPROVER, READ_ONLY)")

    # 2. Seed 6 Official Multi-Source Datasets
    datasets_data = [
        ("Cadastral Revenue Map (1998)", "Revenue Dept (Village Cadastre)", "CADASTRAL_MAP", "backend/data/cadastral.geojson", "GeoJSON", "EPSG:4326", 200, "ready", admin_uid, "1998-04-01", 1.50, 1),
        ("High-Precision GNSS Survey (2026)", "Drone & RTK-GNSS Field Survey", "GNSS_CORS", "backend/data/survey_parcels.geojson", "GeoJSON", "EPSG:4326", 200, "ready", analyst_uid, "2026-02-15", 0.015, 2),
        ("Municipal GIS Building Footprints (2025)", "City Property Tax Registry", "MUNICIPAL_GIS", "backend/data/buildings.geojson", "GeoJSON", "EPSG:4326", 185, "ready", admin_uid, "2025-11-20", 0.20, 3),
        ("Drone Orthorectified Imagery / ORI (2026)", "5cm GSD High-Res Aerial Survey", "DRONE_IMAGERY_ORI", "backend/data/drone_ori_tile.tif", "GeoTIFF", "EPSG:4326", 142, "ready", uploader_uid, "2026-01-10", 0.05, 2),
        ("LiDAR DSM / DTM Elevation Model", "Airborne Surface & Terrain Survey", "DSM_DTM", "backend/data/lidar_elevation.tif", "GeoTIFF", "EPSG:4326", 200, "ready", analyst_uid, "2026-01-12", 0.08, 2),
        ("Underground Utility Network (Gas & Water)", "Municipal Engineering Dept", "UTILITY_NETWORK", "backend/data/utilities.gpkg", "GeoPackage", "EPSG:4326", 64, "ready", admin_uid, "2025-08-30", 0.30, 3),
    ]
    dataset_ids = {}
    for name, src, dtype, path, fmt, crs, count, st, uid, sdate, acc, auth in datasets_data:
        cursor.execute(
            """INSERT INTO datasets (name, source, type, file_path, file_format, crs, feature_count, status, uploaded_by, source_date, positional_accuracy_m, authority_level)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id;""",
            (name, src, dtype, path, fmt, crs, count, st, uid, sdate, acc, auth)
        )
        dataset_ids[dtype] = cursor.fetchone()['id']
    print(f"✓ Seeded 6 Multi-Source Datasets: {list(dataset_ids.keys())}")

    # 3. Seed Authority Rules
    rules = [
        ("geometry", "GNSS_CORS", "positional_accuracy", 0.05, "Survey preferred for geometry if positional accuracy <= 5cm (Authority Rule #1)"),
        ("ownership", "CADASTRAL_MAP", "authority_level", 1.0, "Revenue Record is definitive for ownership identity and khasra title (Authority Rule #2)"),
        ("building_footprint", "MUNICIPAL_GIS", "recency", 365.0, "Municipal GIS preferred for building count and plinth structure (Authority Rule #3)"),
        ("boundary_alignment", "DRONE_IMAGERY_ORI", "positional_accuracy", 0.10, "Orthorectified drone imagery used to corroborate natural field bunds (Authority Rule #4)"),
    ]
    for attr, win, cond, th, desc in rules:
        cursor.execute(
            """INSERT INTO authority_rules (attribute_name, winning_source, condition_metric, threshold_value, description)
               VALUES (%s, %s, %s, %s, %s);""",
            (attr, win, cond, th, desc)
        )
    print("✓ Seeded Authority Attribution Rules")

    # 4. Generate Cadastral Grid of 200 Parcels (10 rows x 20 cols) in Delhi/NCR
    # Base bounding box: Lon 77.2080 to 77.2280, Lat 28.6130 to 28.6230
    base_lon = 77.2080
    base_lat = 28.6130
    width = 0.00095  # ~95 meters
    height = 0.00095 # ~105 meters
    gap = 0.00005    # ~5 meters road buffer

    total_parcels = 200
    cols = 20
    rows = 10

    # Owner names
    first_names = ["Rajesh", "Sunita", "Anil", "Vikram", "Pooja", "Amit", "Kavita", "Suresh", "Manoj", "Deepak", "Ramesh", "Priya", "Nitin", "Meenakshi", "Ashok", "Sanjay"]
    last_names = ["Sharma", "Verma", "Gupta", "Yadav", "Singh", "Patel", "Chauhan", "Mehta", "Aggarwal", "Reddy", "Nair", "Malhotra", "Saxena", "Bansal"]
    land_uses = ["Residential", "Commercial", "Agricultural", "Public Utility / Park", "Mixed Use", "Institutional"]

    # Target distribution of confidence scores across the 200 parcels:
    # High (>= 85%): 120 parcels (avg ~91.4%)
    # Medium (60-84%): 46 parcels (avg ~71.8%)
    # Low (< 60%): 34 parcels (in Low-Confidence Queue, avg ~47.6%)
    # Total = 120 + 46 + 34 = 200!
    confidence_bucket = (['HIGH'] * 120) + (['MEDIUM'] * 46) + (['LOW'] * 34)
    random.seed(42)
    random.shuffle(confidence_bucket)

    # Deliberate error trackers:
    # 18 Overlaps
    # 12 Slivers
    # 8 Duplicate IDs
    # 24 Area Mismatches
    # 16 Invalid Geometries
    # 18 Land-Use Mismatches
    overlap_indices = set(random.sample(range(total_parcels), 18))
    sliver_indices = set(random.sample(list(set(range(total_parcels)) - overlap_indices), 12))
    duplicate_indices = set(random.sample(list(set(range(total_parcels)) - overlap_indices - sliver_indices), 8))
    area_mismatch_indices = set(random.sample(range(total_parcels), 24))
    invalid_geom_indices = set(random.sample(range(total_parcels), 16))
    land_use_mismatch_indices = set(random.sample(range(total_parcels), 18))

    conflicts_seeded = 0
    parcels_created = 0

    # Genesis SHA-256 Block for Audit Ledger
    genesis_hash = "0000000000000000000000000000000000000000000000000000000000000000"
    current_ledger_hash = genesis_hash
    ledger_block_index = 0

    print("Generating 200 parcels with native PostGIS geometries, versions, and evidence...")

    for i in range(total_parcels):
        row = i // cols
        col = i % cols

        pid_num = 101 + i
        pid = f"P-{pid_num}"
        if i in duplicate_indices:
            # Deliberate duplicate survey reference
            external_pid = f"P-{(pid_num % 120) + 101}"
        else:
            external_pid = pid

        ulpin = f"DL-08-01-2026-{pid_num:04d}"
        owner = f"{random.choice(first_names)} {random.choice(last_names)}"
        land_use = random.choice(land_uses)

        # Confidence score based on assigned bucket
        bucket = confidence_bucket[i]
        if bucket == 'HIGH':
            conf_score = round(random.uniform(85.0, 98.5), 1)
            review_status = 'AUTO_MATCHED'
        elif bucket == 'MEDIUM':
            conf_score = round(random.uniform(62.0, 83.5), 1)
            review_status = 'NEEDS_REVIEW'
        else:
            conf_score = round(random.uniform(32.0, 58.5), 1)
            review_status = 'ESCALATED'

        # Geometries
        minx = base_lon + (col * (width + gap))
        miny = base_lat + (row * (height + gap))
        maxx = minx + width
        maxy = miny + height

        # Deliberate polygon variations for realism
        poly_1998 = box(minx, miny, maxx, maxy)

        # Survey 2026 geometry (slightly shifted or adjusted by modern RTK survey)
        shift_x = 0.00002 if i % 2 == 0 else -0.000015
        shift_y = 0.000015 if i % 3 == 0 else -0.00002
        poly_2026 = box(minx + shift_x, miny + shift_y, maxx + shift_x, maxy + shift_y)

        # Inject Overlap error
        has_overlap = i in overlap_indices
        if has_overlap:
            # Push boundary into neighbor to create overlap
            poly_1998 = box(minx, miny, maxx + 0.00008, maxy)
            conf_score = min(conf_score, 54.0)
            review_status = 'UNRESOLVED'

        # Inject Sliver error
        has_sliver = i in sliver_indices

        # Inject Area mismatch
        has_area_mismatch = i in area_mismatch_indices
        base_area = round(random.uniform(220.0, 480.0), 1)
        if has_area_mismatch:
            revenue_area = base_area
            survey_area = round(base_area * random.uniform(1.08, 1.25), 1)
            conf_score = min(conf_score, 68.0)
        else:
            revenue_area = base_area
            survey_area = base_area

        # Compute feature hash for incremental processing
        feature_data_str = f"{pid}:{ulpin}:{wkt.dumps(poly_2026)}:{owner}:{land_use}:{survey_area}"
        feature_hash = compute_sha256(feature_data_str)

        # 1. Insert into Parcels table
        cursor.execute(
            """INSERT INTO parcels (
                parcel_id, ulpin, geometry, area, land_use, owner_name, source_dataset_id,
                status, confidence_score, feature_hash, review_status, spatial_match_pct,
                source_agreement_pct, data_quality_pct, recency_pct
               )
               VALUES (%s, %s, ST_SetSRID(ST_GeomFromText(%s), 4326), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
               RETURNING id;""",
            (
                pid, ulpin, wkt.dumps(poly_2026), survey_area, land_use, owner, dataset_ids['GNSS_CORS'],
                'ACTIVE', conf_score, feature_hash, review_status,
                round(conf_score * 0.98, 1), round(conf_score * 0.94, 1),
                round(conf_score * 0.96, 1), round(conf_score * 0.92, 1)
            )
        )
        parcel_row_id = cursor.fetchone()['id']

        # 2. Source Records [Differentiator]: Store individual raw inputs
        # 1998 Cadastral Record
        cursor.execute(
            """INSERT INTO source_records (dataset_id, source_type, external_id, raw_attributes, geometry, source_date, positional_accuracy_m, authority_level)
               VALUES (%s, 'CADASTRAL_MAP', %s, %s, ST_SetSRID(ST_GeomFromText(%s), 4326), '1998-04-01', 1.50, 1)
               RETURNING id;""",
            (dataset_ids['CADASTRAL_MAP'], external_pid, json.dumps({"khasra_no": f"K-{pid_num}", "area_bigha": revenue_area/800.0, "recorded_owner": owner}), wkt.dumps(poly_1998))
        )
        src_1998_id = cursor.fetchone()['id']

        # 2026 GNSS Survey Record
        cursor.execute(
            """INSERT INTO source_records (dataset_id, source_type, external_id, raw_attributes, geometry, source_date, positional_accuracy_m, authority_level)
               VALUES (%s, 'GNSS_CORS', %s, %s, ST_SetSRID(ST_GeomFromText(%s), 4326), '2026-02-15', 0.015, 2)
               RETURNING id;""",
            (dataset_ids['GNSS_CORS'], f"SURV-{pid_num}", json.dumps({"rtk_fix": "FIXED", "satellites": 28, "survey_area_sqm": survey_area}), wkt.dumps(poly_2026))
        )
        src_2026_id = cursor.fetchone()['id']

        # 3. Geometry Versions [Differentiator]: Never overwrite originals!
        # Version 1: Original from 1998 Revenue Cadastre
        cursor.execute(
            """INSERT INTO geometry_versions (parcel_id, version_num, status, geometry, area_sqm, source_record_id, source_name, created_by, change_reason)
               VALUES (%s, 1, 'original', ST_SetSRID(ST_GeomFromText(%s), 4326), %s, %s, '1998 Revenue Cadastre', 'Historical Ingestion', 'Digitized village revenue map')
               RETURNING id;""",
            (pid, wkt.dumps(poly_1998), revenue_area, src_1998_id)
        )
        v1_id = cursor.fetchone()['id']

        # Version 2: Proposed / Approved from 2026 Conflation
        v2_status = 'approved' if review_status == 'AUTO_MATCHED' else 'proposed'
        cursor.execute(
            """INSERT INTO geometry_versions (parcel_id, version_num, status, geometry, area_sqm, source_record_id, source_name, created_by, change_reason)
               VALUES (%s, 2, %s, ST_SetSRID(ST_GeomFromText(%s), 4326), %s, %s, '2026 Drone & RTK Survey', 'AI Spatial Conflation Pipeline', 'Reconciled to PostGIS EPSG:4326 with geodetic control')
               RETURNING id;""",
            (pid, v2_status, wkt.dumps(poly_2026), survey_area, src_2026_id)
        )
        v2_id = cursor.fetchone()['id']

        # Set parcel's active geometry version pointer
        cursor.execute(
            "UPDATE parcels SET current_geometry_version_id = %s WHERE id = %s;",
            (v2_id, parcel_row_id)
        )

        # 4. Field-level Attributes table
        attrs = [
            ("owner_name", owner, "1998 Revenue Cadastre", "1998-04-01", 95.0, 1),
            ("khasra_no", f"K-{pid_num}", "1998 Revenue Cadastre", "1998-04-01", 99.0, 1),
            ("survey_status", "RTK-GNSS Verified", "2026 Drone & RTK Survey", "2026-02-15", 98.0, 2),
            ("land_use", land_use, "Municipal Property Tax 2025", "2025-11-20", 91.0, 3),
            ("recorded_area", f"{revenue_area} m²", "1998 Revenue Cadastre", "1998-04-01", 82.0, 1),
            ("measured_area", f"{survey_area} m²", "2026 Drone & RTK Survey", "2026-02-15", 98.5, 2)
        ]
        for key, val, sname, sdate, conf, auth in attrs:
            cursor.execute(
                """INSERT INTO parcel_attributes (parcel_id, attribute_key, attribute_value, source_name, source_date, confidence_score, authority_level)
                   VALUES (%s, %s, %s, %s, %s, %s, %s);""",
                (pid, key, val, sname, sdate, conf, auth)
            )

        # 5. Ingest Deliberate Conflicts
        if has_overlap:
            conflicts_seeded += 1
            cursor.execute(
                """INSERT INTO conflicts (
                    parcel_id, type, attribute, source_a, value_a, source_b, value_b, severity,
                    status, rule_fired, recommended_action, unresolved_since
                   )
                   VALUES (%s, 'OVERLAP', 'boundary_overlap', %s, %s, %s, %s, 'CRITICAL', 'PENDING',
                           'Boundary overlap detected: 4.8 m² conflict with adjacent parcel',
                           'Execute topological snap & sliver trim to respect GNSS boundary monuments',
                           NOW() - INTERVAL '5 days');""",
                (pid, "1998 Revenue Cadastre", f"Extended eastward into P-{pid_num + 1}", "2026 GNSS Survey", "Clean surveyed boundary without overlap")
            )

        if has_area_mismatch:
            conflicts_seeded += 1
            diff_sqm = round(abs(survey_area - revenue_area), 1)
            cursor.execute(
                """INSERT INTO conflicts (
                    parcel_id, type, attribute, source_a, value_a, source_b, value_b, severity,
                    status, rule_fired, recommended_action, unresolved_since
                   )
                   VALUES (%s, 'AREA_MISMATCH', 'area', '1998 Revenue Record', %s, '2026 RTK-GNSS Survey', %s, 'HIGH', 'PENDING',
                           'Survey preferred for geometry: ±1.5 cm vs 1998 cadastre (Authority Rule #1)',
                           'Accept GNSS boundary and update official revenue area ledger to measured value',
                           NOW() - INTERVAL '12 days');""",
                (pid, f"{revenue_area} m²", f"{survey_area} m² (diff +{diff_sqm} m²)")
            )

        if i in land_use_mismatch_indices:
            conflicts_seeded += 1
            alt_land_use = "Commercial" if land_use == "Residential" else "Residential Zone B"
            cursor.execute(
                """INSERT INTO conflicts (
                    parcel_id, type, attribute, source_a, value_a, source_b, value_b, severity,
                    status, rule_fired, recommended_action, unresolved_since
                   )
                   VALUES (%s, 'LAND_USE_MISMATCH', 'land_use', 'Revenue Record (1998)', %s, 'Municipal Tax Assessment (2025)', %s, 'MEDIUM', 'PENDING',
                           'Municipal GIS preferred for building zoning & plinth assessment (Authority Rule #3)',
                           'Inspect field verification imagery and update parcel land-use classification',
                           NOW() - INTERVAL '2 days');""",
                (pid, land_use, alt_land_use)
            )

        if i in duplicate_indices:
            conflicts_seeded += 1
            cursor.execute(
                """INSERT INTO conflicts (
                    parcel_id, type, attribute, source_a, value_a, source_b, value_b, severity,
                    status, rule_fired, recommended_action, unresolved_since
                   )
                   VALUES (%s, 'DUPLICATE_ID', 'parcel_id', 'Revenue Register Block A', %s, 'Revenue Register Block B', %s, 'HIGH', 'PENDING',
                           'Unique ULPIN generation mandatory under digital land governance rules',
                           'Assign unique Bhu-Aadhaar ULPIN and deprecate legacy duplicate revenue tag',
                           NOW() - INTERVAL '8 days');""",
                (pid, f"Parcel {external_pid} (Block A)", f"Parcel {external_pid} (Block B)")
            )

        if has_sliver:
            conflicts_seeded += 1
            cursor.execute(
                """INSERT INTO conflicts (
                    parcel_id, type, attribute, source_a, value_a, source_b, value_b, severity,
                    status, rule_fired, recommended_action, unresolved_since
                   )
                   VALUES (%s, 'SLIVER', 'geometry_sliver', '1998 Cadastre', 'Sliver gap 1.4 m²', 'Roadway Boundary', 'Flush edge', 'MEDIUM', 'PENDING',
                           'Topological sliver area < 2 m² flagged for deterministic polygon snap',
                           'Merge micro-sliver into parcel boundary according to municipal road offset',
                           NOW() - INTERVAL '6 days');""",
                (pid,)
            )

        # 6. Lineage Events [Differentiator]: Timeline of changes (1998 -> 2025 -> 2026)
        lineage_events = [
            ("RECONCILIATION", "Initial digital cadastral boundary established from settlement survey", "1998 Revenue Cadastre", "1998-04-01", {"khasra_no": f"K-{pid_num}", "area": revenue_area}),
            ("ATTRIBUTE_CHANGE", "Property tax identification record created in municipal GIS database", "Municipal Property Tax 2025", "2025-11-20", {"tax_zone": "Zone-4", "building_count": 1}),
            ("BOUNDARY_SHIFT", "High-precision aerial drone & RTK-GNSS boundary conflation applied", "2026 Drone & RTK Survey", "2026-02-15", {"delta_area": round(survey_area - revenue_area, 2), "confidence": conf_score})
        ]
        if i % 7 == 0:
            lineage_events.insert(1, ("SPLIT", f"Historical sub-division of ancestral parcel into distinct holdings {pid}A and {pid}B", "Revenue Settlement Board", "2012-06-18", {"parent_khasra": f"K-{pid_num}-Old"}))

        for etype, edesc, esrc, edate, edetails in lineage_events:
            cursor.execute(
                """INSERT INTO lineage_events (parcel_id, event_type, description, source_dataset, event_date, details)
                   VALUES (%s, %s, %s, %s, %s, %s);""",
                (pid, etype, edesc, esrc, edate, json.dumps(edetails))
            )

        # 7. Evidence Graph Nodes and Edges [Differentiator]
        # Nodes:
        cursor.execute(
            """INSERT INTO evidence_nodes (parcel_id, node_type, label, metadata)
               VALUES (%s, 'PARCEL', %s, %s) RETURNING id;""",
            (pid, f"Parcel {pid} ({ulpin})", json.dumps({"confidence": conf_score, "area": survey_area}))
        )
        node_parcel_id = cursor.fetchone()['id']

        cursor.execute(
            """INSERT INTO evidence_nodes (parcel_id, node_type, label, metadata)
               VALUES (%s, 'SOURCE_RECORD', %s, %s) RETURNING id;""",
            (pid, "1998 Revenue Record", json.dumps({"source": "Revenue Dept", "area": revenue_area}))
        )
        node_1998_id = cursor.fetchone()['id']

        cursor.execute(
            """INSERT INTO evidence_nodes (parcel_id, node_type, label, metadata)
               VALUES (%s, 'SURVEY', %s, %s) RETURNING id;""",
            (pid, "2026 RTK-GNSS Survey", json.dumps({"accuracy": "±1.5cm", "area": survey_area}))
        )
        node_survey_id = cursor.fetchone()['id']

        cursor.execute(
            """INSERT INTO evidence_nodes (parcel_id, node_type, label, metadata)
               VALUES (%s, 'DOCUMENT', %s, %s) RETURNING id;""",
            (pid, "Municipal Tax Assessment", json.dumps({"year": 2025, "owner": owner}))
        )
        node_tax_id = cursor.fetchone()['id']

        # Edges:
        # 1. matched_to
        cursor.execute(
            """INSERT INTO evidence_edges (source_node_id, target_node_id, edge_type, weight, evidence_details)
               VALUES (%s, %s, 'matched_to', 0.94, %s);""",
            (node_survey_id, node_parcel_id, json.dumps({"iou": 0.94, "centroid_distance_m": 0.32}))
        )
        # 2. supersedes
        cursor.execute(
            """INSERT INTO evidence_edges (source_node_id, target_node_id, edge_type, weight, evidence_details)
               VALUES (%s, %s, 'supersedes', 0.98, %s);""",
            (node_survey_id, node_1998_id, json.dumps({"rule": "Authority Rule #1: RTK Survey accuracy 0.015m wins over 1998 Cadastre"}))
        )
        # 3. corroborated_by
        cursor.execute(
            """INSERT INTO evidence_edges (source_node_id, target_node_id, edge_type, weight, evidence_details)
               VALUES (%s, %s, 'corroborated_by', 0.91, %s);""",
            (node_tax_id, node_parcel_id, json.dumps({"attribute": "owner_name and land_use agreement"}))
        )
        # 4. contradicts if area mismatch or overlap
        if has_area_mismatch:
            cursor.execute(
                """INSERT INTO evidence_edges (source_node_id, target_node_id, edge_type, weight, evidence_details)
                   VALUES (%s, %s, 'contradicts', 0.65, %s);""",
                (node_1998_id, node_survey_id, json.dumps({"discrepancy": f"Area difference of {abs(survey_area - revenue_area)} m²"}))
            )

        # 8. Seed Integrated Record (for legacy compatibility)
        cursor.execute(
            """INSERT INTO integrated_records (
                parcel_id, geometry, area, land_use, owner_name, building_count, survey_status,
                spatial_match, source_agreement, data_quality, recency, confidence_score,
                conflict_count, status
               )
               VALUES (%s, ST_SetSRID(ST_GeomFromText(%s), 4326), %s, %s, %s, 1, 'RECONCILED',
                       %s, %s, %s, %s, %s, %s, %s);""",
            (
                pid, wkt.dumps(poly_2026), survey_area, land_use, owner,
                round(conf_score * 0.98, 1), round(conf_score * 0.94, 1),
                round(conf_score * 0.96, 1), round(conf_score * 0.92, 1),
                conf_score, 1 if (has_overlap or has_area_mismatch) else 0,
                'APPROVED' if review_status == 'AUTO_MATCHED' else 'PENDING_REVIEW'
            )
        )

        parcels_created += 1

    print(f"✓ Generated {parcels_created} parcels with {conflicts_seeded} deliberate conflicts across all error categories.")

    # 5. Seed Buildings (185 building polygons inside parcels)
    for i in range(185):
        row = i // cols
        col = i % cols
        bminx = base_lon + (col * (width + gap)) + (width * 0.25)
        bminy = base_lat + (row * (height + gap)) + (height * 0.25)
        bmaxx = bminx + (width * 0.5)
        bmaxy = bminy + (height * 0.5)
        bpoly = box(bminx, bminy, bmaxx, bmaxy)
        cursor.execute(
            """INSERT INTO buildings (building_id, geometry, area, building_type, parcel_ref, source_dataset_id, confidence_score)
               VALUES (%s, ST_SetSRID(ST_GeomFromText(%s), 4326), %s, %s, %s, %s, %s);""",
            (f"BLDG-{1001 + i}", wkt.dumps(bpoly), round(random.uniform(65.0, 160.0), 1),
             random.choice(["Residential RCC", "Commercial Frame", "Industrial Shed"]),
             f"P-{101 + i}", dataset_ids['MUNICIPAL_GIS'], round(random.uniform(88.0, 99.0), 1))
        )
    print("✓ Seeded 185 Municipal Building Polygons")

    # 6. Seed Survey Control Points (48 CORS RTK GNSS Monuments)
    for i in range(48):
        pt_lon = base_lon + random.uniform(0.0, cols * (width + gap))
        pt_lat = base_lat + random.uniform(0.0, rows * (height + gap))
        cursor.execute(
            """INSERT INTO survey_points (point_code, geometry, latitude, longitude, accuracy, source, survey_date)
               VALUES (%s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, %s, %s, '2026-02-15');""",
            (f"CORS-DEL-{i+1:03d}", pt_lon, pt_lat, pt_lat, pt_lon, 0.015, "Survey of India Geodetic CORS Network")
        )
    print("✓ Seeded 48 High-Precision Geodetic Survey Points")

    # 7. Seed SHA-256 Chained Audit Ledger (Section A.8)
    audit_entries = [
        ("JD Admin (Director)", "APPROVER", "INITIALIZE_SYSTEM", "System", "Core",
         "PostGIS 16 spatial schema initialized with EPSG:4326 and strict topology rules",
         ["Cadastral Revenue Map (1998)"], "Uninitialized", "PostGIS Native Active"),
        ("Pooja Sharma", "UPLOADER", "INGEST_DATASET", "Dataset", "New Survey GNSS 2026",
         "Ingested high-precision RTK drone orthophoto survey with 28 CORS reference bases",
         ["High-Precision GNSS Survey (2026)"], "Pending Ingestion", "Harmonized to PostGIS EPSG:4326"),
        ("Alex Mercer", "ANALYST", "SPATIAL_CONFLATION", "Pipeline", "AI_Matcher",
         "Conflated 200 cadastral parcels against 2026 RTK survey monuments (IoU threshold >= 0.85)",
         ["Cadastral Revenue Map (1998)", "High-Precision GNSS Survey (2026)"], "Raw geometries", "200 Conflated Candidates"),
        ("Alex Mercer", "ANALYST", "TOPOLOGY_VALIDATION", "Processing", "Topology_Checker",
         "Detected 18 overlaps, 12 slivers, 16 invalid rings. Applied ST_MakeValid to clean rings.",
         ["Cadastral Revenue Map (1998)"], "37 Invalid/Overlap Geometry anomalies", "0 Invalid geometries after ST_MakeValid repair"),
        ("JD Admin (Director)", "APPROVER", "RESOLVE_CONFLICT", "Conflict", "Case #101",
         "Accepted 2026 GNSS survey boundary (248.5 m²) over 1998 revenue area under Authority Rule #1",
         ["High-Precision GNSS Survey (2026)"], "Revenue: 240.0 m²", "Survey: 248.5 m² (Approved)"),
        ("Alex Mercer", "ANALYST", "INCREMENTAL_HASH_CHECK", "Incremental", "Batch_2026_02",
         "Incremental feature hash check executed: 14 parcels modified, 186 parcels clean and skipped",
         ["Cadastral Revenue Map (1998)", "High-Precision GNSS Survey (2026)"], "Full processing required", "Re-processed 14 of 200 parcels")
    ]

    for officer, role, action, etype, eid, reason, sdatasets, oval, nval in audit_entries:
        ledger_block_index += 1
        entry_time = (datetime.now() - timedelta(hours=(10 - ledger_block_index))).strftime("%Y-%m-%d %H:%M:%S")
        # Hash formula: SHA256(prev_hash + timestamp + officer + role + action + entity_id + reason + oval + nval)
        hash_payload = f"{current_ledger_hash}|{entry_time}|{officer}|{role}|{action}|{eid}|{reason}|{oval}|{nval}"
        new_block_hash = compute_sha256(hash_payload)

        cursor.execute(
            """INSERT INTO audit_ledger (block_index, prev_hash, current_hash, timestamp, officer_name, officer_role, action, entity_type, entity_id, reason, source_datasets, old_value, new_value)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);""",
            (ledger_block_index, current_ledger_hash, new_block_hash, entry_time, officer, role, action, etype, eid, reason, sdatasets, oval, nval)
        )
        current_ledger_hash = new_block_hash

    print(f"✓ Created {ledger_block_index} SHA-256 Cryptographically Chained Audit Ledger Entries")

    # 8. Seed Pipeline Processing Jobs
    recent_jobs = [
        (dataset_ids['CADASTRAL_MAP'], "Cadastral Revenue Map (1998)", "VALIDATION", "COMPLETED", 100, "2026-02-20 09:30:00", "2026-02-20 09:31:00"),
        (dataset_ids['CADASTRAL_MAP'], "Cadastral Revenue Map (1998)", "CRS_HARMONIZATION", "COMPLETED", 100, "2026-02-20 09:31:00", "2026-02-20 09:32:00"),
        (dataset_ids['GNSS_CORS'], "High-Precision GNSS Survey (2026)", "SPATIAL_MATCHING", "COMPLETED", 100, "2026-02-20 10:15:00", "2026-02-20 10:16:30"),
        (dataset_ids['GNSS_CORS'], "High-Precision GNSS Survey (2026)", "TOPOLOGY_VALIDATION", "COMPLETED", 100, "2026-02-20 10:16:30", "2026-02-20 10:17:00"),
        (dataset_ids['MUNICIPAL_GIS'], "Municipal GIS Building Footprints", "ATTRIBUTE_MAPPING", "COMPLETED", 100, "2026-02-20 11:00:00", "2026-02-20 11:01:00"),
        (dataset_ids['CADASTRAL_MAP'], "Cadastral Revenue Map (1998)", "INCREMENTAL_RECONCILIATION", "COMPLETED", 100, "2026-02-20 11:05:00", "2026-02-20 11:06:00"),
    ]
    for did, dname, jtype, st, prog, s_at, c_at in recent_jobs:
        cursor.execute(
            """INSERT INTO processing_jobs (dataset_id, dataset_name, job_type, status, progress, started_at, completed_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s);""",
            (did, dname, jtype, st, prog, s_at, c_at)
        )
    print("✓ Seeded Pipeline Processing Jobs with exact time stamps")

    cursor.close()
    conn.close()
    print("=" * 60)
    print("✓ PostGIS Database Seed Completed Successfully!")
    print("=" * 60)

if __name__ == "__main__":
    run_seed_all()
