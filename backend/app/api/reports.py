from fastapi import APIRouter, Response
import json
import csv
import io
from app.database.connection import get_connection

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/export/geojson")
def export_geojson():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT parcel_id, ST_AsGeoJSON(geometry) AS geom_json, area, land_use, owner_name, 
               building_count, confidence_score, status 
        FROM integrated_records;
    """)
    features = []
    for r in cursor.fetchall():
        features.append({
            "type": "Feature",
            "properties": {
                "parcel_id": r["parcel_id"],
                "area": float(r["area"]),
                "land_use": r["land_use"],
                "owner_name": r["owner_name"],
                "building_count": r["building_count"],
                "confidence_score": float(r["confidence_score"]),
                "status": r["status"],
                "database_engine": "PostgreSQL 16 + PostGIS 3.4 Spatial Database",
                "harmonization_system": "GeoHarmonize AI & GIS Engine v2.0"
            },
            "geometry": json.loads(r["geom_json"]) if r["geom_json"] else None
        })
    cursor.close()
    conn.close()
    
    collection = {
        "type": "FeatureCollection",
        "name": "geoharmonize_postgis_integrated_land_records",
        "crs": {"type": "name", "properties": {"name": "EPSG:4326"}},
        "features": features
    }
    
    return Response(
        content=json.dumps(collection, indent=2),
        media_type="application/geo+json",
        headers={"Content-Disposition": "attachment; filename=geoharmonize_integrated_records.geojson"}
    )

@router.get("/export/csv")
def export_csv():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT parcel_id, area, land_use, owner_name, building_count, spatial_match, 
               source_agreement, data_quality, recency, confidence_score, conflict_count, status 
        FROM integrated_records;
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "parcel_id", "area_sqm", "land_use", "owner_name", "building_count", 
        "spatial_match_pct", "source_agreement_pct", "data_quality_pct", 
        "recency_pct", "confidence_score_pct", "conflicts", "approval_status"
    ])
    for r in rows:
        writer.writerow([
            r["parcel_id"], float(r["area"]), r["land_use"], r["owner_name"], 
            r["building_count"], float(r["spatial_match"]), float(r["source_agreement"]), 
            float(r["data_quality"]), float(r["recency"]), float(r["confidence_score"]), 
            r["conflict_count"], r["status"]
        ])
        
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=geoharmonize_land_records.csv"}
    )

@router.get("/export/conflicts")
def export_conflicts():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, parcel_id, type, attribute, source_a, value_a, source_b, value_b, 
               severity, status, resolution, resolved_at 
        FROM conflicts;
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "conflict_id", "parcel_id", "type", "attribute", "source_a", "value_a", 
        "source_b", "value_b", "severity", "status", "resolution", "resolved_at"
    ])
    for r in rows:
        writer.writerow([
            r["id"], r["parcel_id"], r["type"], r["attribute"], r["source_a"], 
            r["value_a"], r["source_b"], r["value_b"], r["severity"], r["status"], 
            r["resolution"], str(r["resolved_at"]) if r["resolved_at"] else ""
        ])
        
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=geoharmonize_conflicts_report.csv"}
    )

@router.get("/summary")
def get_reports_summary():
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) AS c, AVG(confidence_score) AS avg_conf FROM integrated_records;")
    p_row = cursor.fetchone()
    parcel_count = p_row["c"] or 0
    avg_conf = round(float(p_row["avg_conf"]) if p_row["avg_conf"] is not None else 91.0, 1)
    
    cursor.execute("SELECT COUNT(*) AS c FROM conflicts;")
    total_conf = cursor.fetchone()["c"] or 0
    
    cursor.execute("SELECT COUNT(*) AS c FROM conflicts WHERE status = 'RESOLVED';")
    resolved_conf = cursor.fetchone()["c"] or 0
    
    cursor.close()
    conn.close()
    
    return {
        "database_engine": "PostgreSQL 16 + PostGIS 3.4",
        "integrated_parcels": parcel_count,
        "total_conflicts": total_conf,
        "resolved_conflicts": resolved_conf,
        "average_confidence": avg_conf,
        "export_formats": ["GeoJSON", "CSV", "PDF Summary", "Audit Trail CSV"]
    }
