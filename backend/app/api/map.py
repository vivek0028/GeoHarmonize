from fastapi import APIRouter
import json
import os
import csv
from app.core.config import settings
from app.database.connection import get_connection

router = APIRouter(prefix="/map", tags=["Map"])

@router.get("/layers")
def get_map_layers():
    """Returns all layer geometries as GeoJSON FeatureCollections from PostGIS and source catalogs."""
    cadastral_geojson = {"type": "FeatureCollection", "features": []}
    survey_geojson = {"type": "FeatureCollection", "features": []}
    buildings_geojson = {"type": "FeatureCollection", "features": []}
    points_geojson = {"type": "FeatureCollection", "features": []}
    
    # 1. Cadastral
    cad_path = os.path.join(settings.DATA_DIR, "cadastral.geojson")
    if os.path.exists(cad_path):
        with open(cad_path) as f:
            cadastral_geojson = json.load(f)
            
    # 2. Survey
    surv_path = os.path.join(settings.DATA_DIR, "survey_parcels.geojson")
    if os.path.exists(surv_path):
        with open(surv_path) as f:
            survey_geojson = json.load(f)
            
    # 3. Buildings
    bldg_path = os.path.join(settings.DATA_DIR, "buildings.geojson")
    if os.path.exists(bldg_path):
        with open(bldg_path) as f:
            buildings_geojson = json.load(f)
            
    # 4. Survey Points
    pts_path = os.path.join(settings.DATA_DIR, "survey_points.csv")
    if os.path.exists(pts_path):
        features = []
        with open(pts_path) as f:
            reader = csv.DictReader(f)
            for row in reader:
                features.append({
                    "type": "Feature",
                    "properties": row,
                    "geometry": {
                        "type": "Point",
                        "coordinates": [float(row["longitude"]), float(row["latitude"])]
                    }
                })
        points_geojson = {"type": "FeatureCollection", "features": features}
        
    # 5. Load Integrated Parcels & Active Conflicts directly from PostGIS
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT parcel_id, ST_AsGeoJSON(geometry) AS geom_json, area, land_use, owner_name, 
               building_count, confidence_score, conflict_count, status 
        FROM integrated_records;
    """)
    int_features = []
    for r in cursor.fetchall():
        int_features.append({
            "type": "Feature",
            "properties": {
                "parcel_id": r["parcel_id"],
                "area": float(r["area"]),
                "land_use": r["land_use"],
                "owner_name": r["owner_name"],
                "building_count": r["building_count"],
                "confidence_score": float(r["confidence_score"]),
                "conflict_count": r["conflict_count"],
                "status": r["status"]
            },
            "geometry": json.loads(r["geom_json"]) if r["geom_json"] else None
        })
    integrated_geojson = {"type": "FeatureCollection", "features": int_features}
    
    # 6. Load Active Conflicts with PostGIS Geometry
    cursor.execute("""
        SELECT c.id, c.parcel_id, c.type, c.attribute, c.source_a, c.value_a, c.source_b, c.value_b, c.severity, c.status, ST_AsGeoJSON(i.geometry) AS geom_json
        FROM conflicts c
        LEFT JOIN integrated_records i ON c.parcel_id = i.parcel_id
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
                "status": c["status"]
            },
            "geometry": geom
        })
    conflicts_geojson = {"type": "FeatureCollection", "features": conflict_features}
    
    cursor.close()
    conn.close()
    
    return {
        "cadastral": cadastral_geojson,
        "survey": survey_geojson,
        "buildings": buildings_geojson,
        "points": points_geojson,
        "integrated": integrated_geojson,
        "conflicts": conflicts_geojson
    }
