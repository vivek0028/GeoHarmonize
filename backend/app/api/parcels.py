from fastapi import APIRouter, HTTPException, Depends, Query
import json
from typing import List, Optional
from datetime import datetime
from app.core.security import get_current_user_optional
from app.schemas.schemas import IntegratedRecordItem
from app.database.connection import get_connection

router = APIRouter(prefix="/parcels", tags=["Parcels"])

@router.get("/", response_model=List[IntegratedRecordItem])
def get_parcels(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    min_confidence: Optional[float] = Query(None)
):
    conn = get_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT id, parcel_id, ST_AsGeoJSON(geometry) AS geom_json, area, land_use, owner_name, 
               building_count, survey_status, spatial_match, source_agreement, data_quality, 
               recency, confidence_score, conflict_count, status 
        FROM integrated_records WHERE 1=1
    """
    params = []
    
    if search:
        query += " AND (parcel_id ILIKE %s OR owner_name ILIKE %s OR land_use ILIKE %s)"
        s = f"%{search}%"
        params.extend([s, s, s])
        
    if status:
        query += " AND status = %s"
        params.append(status)
        
    if min_confidence is not None:
        query += " AND confidence_score >= %s"
        params.append(min_confidence)
        
    query += " ORDER BY parcel_id ASC;"
    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    
    results = []
    for r in rows:
        results.append(IntegratedRecordItem(
            id=r["id"],
            parcel_id=r["parcel_id"],
            geometry=json.loads(r["geom_json"]) if r["geom_json"] else None,
            area=float(r["area"]),
            land_use=r["land_use"],
            owner_name=r["owner_name"],
            building_count=r["building_count"],
            survey_status=r["survey_status"],
            spatial_match=float(r["spatial_match"]),
            source_agreement=float(r["source_agreement"]),
            data_quality=float(r["data_quality"]),
            recency=float(r["recency"]),
            confidence_score=float(r["confidence_score"]),
            conflict_count=r["conflict_count"],
            status=r["status"]
        ))
    return results

@router.get("/{parcel_id}")
def get_parcel_detail(parcel_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        """SELECT id, parcel_id, ST_AsGeoJSON(geometry) AS geom_json, area, land_use, owner_name, 
                  building_count, survey_status, spatial_match, source_agreement, data_quality, 
                  recency, confidence_score, conflict_count, status
           FROM integrated_records WHERE parcel_id = %s;""",
        (parcel_id,)
    )
    rec = cursor.fetchone()
    
    if not rec:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Parcel not found")
        
    cursor.execute("SELECT * FROM conflicts WHERE parcel_id = %s;", (parcel_id,))
    conf_rows = cursor.fetchall()
    conflicts = []
    for c in conf_rows:
        conflicts.append({
            "id": c["id"],
            "parcel_id": c["parcel_id"],
            "type": c["type"],
            "attribute": c["attribute"],
            "source_a": c["source_a"],
            "value_a": c["value_a"],
            "source_b": c["source_b"],
            "value_b": c["value_b"],
            "severity": c["severity"],
            "status": c["status"],
            "resolution": c["resolution"],
            "resolved_at": str(c["resolved_at"]) if c["resolved_at"] else None
        })
        
    cursor.execute("SELECT * FROM feature_matches WHERE source_feature_id = %s;", (parcel_id,))
    m_row = cursor.fetchone()
    match_info = None
    if m_row:
        match_info = {
            "source_feature_id": m_row["source_feature_id"],
            "target_feature_id": m_row["target_feature_id"],
            "spatial_similarity": float(m_row["spatial_similarity"]),
            "area_similarity": float(m_row["area_similarity"]),
            "position_similarity": float(m_row["position_similarity"]),
            "match_score": float(m_row["match_score"])
        }
        
    cursor.close()
    conn.close()
    
    return {
        "id": rec["id"],
        "parcel_id": rec["parcel_id"],
        "geometry": json.loads(rec["geom_json"]) if rec["geom_json"] else None,
        "area": float(rec["area"]),
        "land_use": rec["land_use"],
        "owner_name": rec["owner_name"],
        "building_count": rec["building_count"],
        "survey_status": rec["survey_status"],
        "spatial_match": float(rec["spatial_match"]),
        "source_agreement": float(rec["source_agreement"]),
        "data_quality": float(rec["data_quality"]),
        "recency": float(rec["recency"]),
        "confidence_score": float(rec["confidence_score"]),
        "conflict_count": rec["conflict_count"],
        "status": rec["status"],
        "sources": ["Cadastral (1998)", "National Drone & GNSS Survey (2026)", "Municipal Tax Registry"],
        "conflicts": conflicts,
        "match_info": match_info
    }

@router.post("/{parcel_id}/approve")
def approve_parcel(parcel_id: str, user: dict = Depends(get_current_user_optional)):
    conn = get_connection()
    cursor = conn.cursor()
    
    now_dt = datetime.utcnow()
    cursor.execute(
        "UPDATE integrated_records SET status = 'APPROVED', approved_by = %s, approved_at = %s WHERE parcel_id = %s;",
        (user.get("id", 1), now_dt, parcel_id)
    )
    
    cursor.execute(
        """INSERT INTO audit_logs (user_name, action, entity, entity_id, old_value, new_value)
           VALUES (%s, %s, %s, %s, %s, %s);""",
        (user.get("name", "GIS Analyst"), "APPROVE_RECORD", "IntegratedRecord", parcel_id, "REVIEWED", "APPROVED")
    )
    
    conn.commit()
    cursor.close()
    conn.close()
    
    return {"success": True, "parcel_id": parcel_id, "status": "APPROVED", "approved_at": str(now_dt)}
