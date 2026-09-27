from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from app.core.security import get_current_user_optional
from app.schemas.schemas import ConflictItem, ConflictResolutionRequest
from app.services.conflict import resolve_conflict_in_db
from app.database.connection import get_connection

router = APIRouter(prefix="/conflicts", tags=["Conflicts"])

@router.get("/", response_model=List[ConflictItem])
def list_conflicts(status: Optional[str] = Query(None), severity: Optional[str] = Query(None)):
    conn = get_connection()
    cursor = conn.cursor()
    
    query = "SELECT id, parcel_id, type, attribute, source_a, value_a, source_b, value_b, severity, status, resolution, resolved_by, resolved_at FROM conflicts WHERE 1=1"
    params = []
    
    if status and status != "ALL":
        query += " AND status = %s"
        params.append(status)
        
    if severity and severity != "ALL":
        query += " AND severity = %s"
        params.append(severity)
        
    query += " ORDER BY id ASC;"
    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    
    conflicts = []
    for r in rows:
        conflicts.append(ConflictItem(
            id=r["id"],
            parcel_id=r["parcel_id"],
            type=r["type"],
            attribute=r["attribute"],
            source_a=r["source_a"],
            value_a=r["value_a"],
            source_b=r["source_b"],
            value_b=r["value_b"],
            severity=r["severity"],
            status=r["status"],
            resolution=r["resolution"],
            resolved_by=r["resolved_by"],
            resolved_at=str(r["resolved_at"]) if r["resolved_at"] else None
        ))
    return conflicts

@router.post("/resolve")
def resolve_conflict_endpoint(
    req: ConflictResolutionRequest,
    user: dict = Depends(get_current_user_optional)
):
    try:
        user_name = user.get("name", "Alex Mercer (GIS Analyst)")
        res = resolve_conflict_in_db(req.conflict_id, req.action, req.custom_value, user_name)
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conflict resolution error: {str(e)}")
