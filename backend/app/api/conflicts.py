from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from app.core.security import get_current_user_optional
from app.schemas.schemas import ConflictItem, ConflictResolutionRequest, RevertConflictRequest
from app.services.conflict import resolve_conflict_in_db, revert_conflict_in_db
from app.database.connection import get_connection

router = APIRouter(prefix="/conflicts", tags=["Conflicts"])

@router.get("/", response_model=List[ConflictItem])
def list_conflicts(status: Optional[str] = Query(None), severity: Optional[str] = Query(None)):
    conn = get_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT id, parcel_id, type, attribute, source_a, value_a, source_b, value_b, 
               severity, status, rule_fired, recommended_action, unresolved_since, 
               reason, resolution, resolved_by, resolved_at 
        FROM conflicts WHERE 1=1
    """
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
            rule_fired=r["rule_fired"],
            recommended_action=r["recommended_action"],
            unresolved_since=str(r["unresolved_since"]) if r["unresolved_since"] else None,
            reason=r["reason"],
            resolution=r["resolution"],
            resolved_by=r["resolved_by"],
            resolved_at=str(r["resolved_at"]) if r["resolved_at"] else None,
            source_date_a="1998-04-01",
            source_accuracy_a="±1.50 m (Historical Settlement)",
            source_date_b="2026-02-15",
            source_accuracy_b="±0.015 m (CORS RTK Base)",
            confidence_breakdown={
                "geometry_overlap_iou": 94.2,
                "centroid_distance_score": 96.0,
                "id_similarity": 98.0,
                "source_accuracy_weight": 95.0,
                "topology_check": 88.0
            }
        ))
    return conflicts

@router.post("/resolve")
def resolve_conflict_endpoint(
    req: ConflictResolutionRequest,
    user: dict = Depends(get_current_user_optional)
):
    try:
        user_name = user.get("name", "Alex Mercer") if user else "Alex Mercer"
        res = resolve_conflict_in_db(req.conflict_id, req.action, req.custom_value, user_name, req.reason)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conflict resolution error: {str(e)}")

@router.post("/revert")
def revert_conflict_endpoint(
    req: RevertConflictRequest,
    user: dict = Depends(get_current_user_optional)
):
    try:
        user_name = user.get("name", "JD Admin (Director)") if user else "JD Admin (Director)"
        res = revert_conflict_in_db(req.conflict_id, req.reason, user_name)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conflict revert error: {str(e)}")

@router.post("/approve-topology-fix")
def approve_topology_fix_endpoint(
    conflict_id: int = Query(...),
    reason: str = Query("Approved proposed topological snap and sliver boundary trim"),
    user: dict = Depends(get_current_user_optional)
):
    user_name = user.get("name", "Alex Mercer") if user else "Alex Mercer"
    return resolve_conflict_in_db(conflict_id, "APPROVE_TOPOLOGY_FIX", None, user_name, reason)
