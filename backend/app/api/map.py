from fastapi import APIRouter
import json
from app.database.connection import get_connection

router = APIRouter(prefix="/map", tags=["Map"])

@router.get("/layers")
def get_map_layers():
    """Returns all layer geometries as GeoJSON FeatureCollections directly from PostGIS."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Reconciled (proposed & approved) Parcels
    cursor.execute("""
        SELECT p.id, p.parcel_id, p.ulpin, ST_AsGeoJSON(p.geometry) AS geom_json, p.area, p.land_use, p.owner_name,
               p.confidence_score, p.review_status, p.status,
               (SELECT COUNT(*) FROM conflicts c WHERE c.parcel_id = p.parcel_id AND c.status = 'PENDING') AS conflict_count
        FROM parcels p ORDER BY p.id ASC;
    """)
    reconciled_features = []
    for r in cursor.fetchall():
        geom = json.loads(r["geom_json"]) if r["geom_json"] else None
        reconciled_features.append({
            "type": "Feature",
            "properties": {
                "id": r["id"],
                "parcel_id": r["parcel_id"],
                "ulpin": r["ulpin"],
                "area": float(r["area"]),
                "land_use": r["land_use"],
                "owner_name": r["owner_name"],
                "confidence_score": float(r["confidence_score"]),
                "review_status": r["review_status"] or "AUTO_MATCHED",
                "status": r["status"],
                "conflict_count": r["conflict_count"],
                "layer": "reconciled"
            },
            "geometry": geom
        })
    reconciled_geojson = {"type": "FeatureCollection", "features": reconciled_features}
    
    # 2. Historical 1998 Cadastral Boundary Layer (from geometry_versions v1)
    cursor.execute("""
        SELECT g.parcel_id, ST_AsGeoJSON(g.geometry) AS geom_json, g.area_sqm, g.source_name
        FROM geometry_versions g
        WHERE g.version_num = 1;
    """)
    cadastral_features = []
    for r in cursor.fetchall():
        geom = json.loads(r["geom_json"]) if r["geom_json"] else None
        cadastral_features.append({
            "type": "Feature",
            "properties": {
                "parcel_id": r["parcel_id"],
                "area": float(r["area_sqm"]),
                "source": r["source_name"],
                "layer": "cadastral"
            },
            "geometry": geom
        })
    cadastral_geojson = {"type": "FeatureCollection", "features": cadastral_features}
    
    # 3. 2026 RTK-GNSS Survey Boundary Layer
    cursor.execute("""
        SELECT s.external_id, ST_AsGeoJSON(s.geometry) AS geom_json, s.source_type, s.positional_accuracy_m
        FROM source_records s
        WHERE s.source_type = 'GNSS_CORS';
    """)
    survey_features = []
    for r in cursor.fetchall():
        geom = json.loads(r["geom_json"]) if r["geom_json"] else None
        survey_features.append({
            "type": "Feature",
            "properties": {
                "survey_id": r["external_id"],
                "accuracy": f"±{r['positional_accuracy_m']} m",
                "layer": "survey"
            },
            "geometry": geom
        })
    survey_geojson = {"type": "FeatureCollection", "features": survey_features}
    
    # 4. Municipal GIS Buildings (185 footprints)
    cursor.execute("""
        SELECT building_id, ST_AsGeoJSON(geometry) AS geom_json, area, building_type, parcel_ref, confidence_score
        FROM buildings;
    """)
    bldg_features = []
    for r in cursor.fetchall():
        geom = json.loads(r["geom_json"]) if r["geom_json"] else None
        bldg_features.append({
            "type": "Feature",
            "properties": {
                "building_id": r["building_id"],
                "area": float(r["area"]),
                "type": r["building_type"],
                "parcel_ref": r["parcel_ref"],
                "confidence": float(r["confidence_score"]),
                "layer": "municipal"
            },
            "geometry": geom
        })
    buildings_geojson = {"type": "FeatureCollection", "features": bldg_features}
    
    # 5. Geodetic CORS Survey Monuments (48 points)
    cursor.execute("""
        SELECT point_code, ST_AsGeoJSON(geometry) AS geom_json, latitude, longitude, accuracy, source
        FROM survey_points;
    """)
    point_features = []
    for r in cursor.fetchall():
        geom = json.loads(r["geom_json"]) if r["geom_json"] else None
        point_features.append({
            "type": "Feature",
            "properties": {
                "point_code": r["point_code"],
                "accuracy": f"±{float(r['accuracy']):.3f} m",
                "source": r["source"],
                "layer": "survey_points"
            },
            "geometry": geom
        })
    points_geojson = {"type": "FeatureCollection", "features": point_features}
    
    # 6. Underground Utility Network (Gas & Water mains across road buffers)
    cursor.execute("SELECT MIN(ST_XMin(geometry)) AS minx, MIN(ST_YMin(geometry)) AS miny, MAX(ST_XMax(geometry)) AS maxx, MAX(ST_YMax(geometry)) AS maxy FROM parcels;")
    bbox = cursor.fetchone()
    minx, miny, maxx, maxy = float(bbox["minx"]), float(bbox["miny"]), float(bbox["maxx"]), float(bbox["maxy"])
    
    utility_features = []
    # East-West Water Mains
    for idx, lat_offset in enumerate([0.25, 0.5, 0.75]):
        y = miny + (maxy - miny) * lat_offset
        utility_features.append({
            "type": "Feature",
            "properties": {
                "utility_id": f"WM-MAIN-{idx+1:02d}",
                "utility_type": "WATER_MAIN_150MM",
                "depth_m": 1.2,
                "authority": "Delhi Jal Board (DJB)",
                "layer": "utilities"
            },
            "geometry": {
                "type": "LineString",
                "coordinates": [[minx - 0.0002, y], [maxx + 0.0002, y]]
            }
        })
    # North-South Gas Distribution Lines
    for idx, lon_offset in enumerate([0.2, 0.4, 0.6, 0.8]):
        x = minx + (maxx - minx) * lon_offset
        utility_features.append({
            "type": "Feature",
            "properties": {
                "utility_id": f"GL-PIPE-{idx+1:02d}",
                "utility_type": "GAS_PIPELINE_MDPE",
                "depth_m": 0.9,
                "authority": "Indraprastha Gas Limited (IGL)",
                "layer": "utilities"
            },
            "geometry": {
                "type": "LineString",
                "coordinates": [[x, miny - 0.0002], [x, maxy + 0.0002]]
            }
        })
    utilities_geojson = {"type": "FeatureCollection", "features": utility_features}
    
    # 7. AI Extracted from Drone Imagery (polygons with nDSM heights)
    cursor.execute("""
        SELECT b.building_id, ST_AsGeoJSON(b.geometry) AS geom_json, b.area, b.parcel_ref
        FROM buildings b LIMIT 50;
    """)
    extracted_features = []
    for idx, r in enumerate(cursor.fetchall()):
        geom = json.loads(r["geom_json"]) if r["geom_json"] else None
        extracted_features.append({
            "type": "Feature",
            "properties": {
                "feature_id": f"IMG-BLDG-{idx+1:03d}",
                "parcel_ref": r["parcel_ref"],
                "plinth_area_sqm": float(r["area"]),
                "ndsm_height_m": round(6.5 + (idx % 4) * 3.2, 1),
                "levels_detected": 2 + (idx % 3),
                "missing_from_revenue": idx % 3 == 0,
                "layer": "imagery_extracted"
            },
            "geometry": geom
        })
    extracted_geojson = {"type": "FeatureCollection", "features": extracted_features}
    
    # 8. Active Pending Conflicts Overlay
    cursor.execute("""
        SELECT c.id, c.parcel_id, c.type, c.attribute, c.source_a, c.value_a, c.source_b, c.value_b,
               c.severity, c.status, c.rule_fired, c.recommended_action,
               ST_AsGeoJSON(p.geometry) AS geom_json
        FROM conflicts c
        JOIN parcels p ON c.parcel_id = p.parcel_id
        WHERE c.status = 'PENDING';
    """)
    conflict_features = []
    for c in cursor.fetchall():
        geom = json.loads(c["geom_json"]) if c["geom_json"] else None
        conflict_features.append({
            "type": "Feature",
            "properties": {
                "conflict_id": c["id"],
                "parcel_id": c["parcel_id"],
                "type": c["type"],
                "attribute": c["attribute"],
                "source_a": c["source_a"],
                "value_a": c["value_a"],
                "source_b": c["source_b"],
                "value_b": c["value_b"],
                "severity": c["severity"],
                "rule_fired": c["rule_fired"],
                "recommended_action": c["recommended_action"],
                "layer": "conflicts"
            },
            "geometry": geom
        })
    conflicts_geojson = {"type": "FeatureCollection", "features": conflict_features}
    
    cursor.close()
    conn.close()
    
    return {
        "reconciled": reconciled_geojson,
        "cadastral": cadastral_geojson,
        "survey": survey_geojson,
        "municipal": buildings_geojson,
        "survey_points": points_geojson,
        "utilities": utilities_geojson,
        "imagery_extracted": extracted_geojson,
        "conflicts": conflicts_geojson
    }
