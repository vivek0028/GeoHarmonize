from datetime import datetime
from typing import Dict, Any, List, Optional
from app.database.connection import get_connection

def detect_conflicts(cadastral_feat: Dict[str, Any], survey_feat: Optional[Dict[str, Any]], municipal_bldg: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
    conflicts = []
    cad_props = cadastral_feat.get("properties", {})
    pid = cad_props.get("parcel_id", "Unknown")
    cad_area = float(cad_props.get("area", 0.0))
    cad_use = cad_props.get("land_use", "Unknown")
    
    if survey_feat:
        surv_props = survey_feat.get("properties", {})
        surv_area = float(surv_props.get("area", 0.0))
        surv_use = surv_props.get("land_use", cad_use)
        
        if abs(cad_area - surv_area) > 2.0 and abs(cad_area - surv_area) / max(cad_area, surv_area) > 0.02:
            conflicts.append({
                "parcel_id": pid,
                "type": "AREA_MISMATCH",
                "attribute": "area",
                "source_a": "Cadastral",
                "value_a": f"{cad_area} m²",
                "source_b": "Survey",
                "value_b": f"{surv_area} m²",
                "severity": "HIGH",
                "status": "PENDING"
            })
            
        if surv_use and cad_use and surv_use.lower() != cad_use.lower():
            conflicts.append({
                "parcel_id": pid,
                "type": "LAND_USE_MISMATCH",
                "attribute": "land_use",
                "source_a": "Cadastral",
                "value_a": cad_use,
                "source_b": "Survey Field Observation",
                "value_b": surv_use,
                "severity": "MEDIUM",
                "status": "PENDING"
            })
            
    if not cad_props.get("owner_name") or cad_props.get("owner_name") == "Unknown":
        conflicts.append({
            "parcel_id": pid,
            "type": "MISSING_ATTRIBUTE",
            "attribute": "owner_name",
            "source_a": "Revenue Records",
            "value_a": "NULL / Unregistered",
            "source_b": "Land Registry",
            "value_b": "Pending Title Verification",
            "severity": "LOW",
            "status": "PENDING"
        })
        
    return conflicts

def resolve_conflict_in_db(conflict_id: int, action: str, custom_value: Optional[str], user_name: str) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM conflicts WHERE id = %s;", (conflict_id,))
    row = cursor.fetchone()
    if not row:
        cursor.close()
        conn.close()
        raise ValueError(f"Conflict #{conflict_id} not found")
        
    pid = row["parcel_id"]
    attr = row["attribute"]
    val_a = row["value_a"]
    val_b = row["value_b"]
    
    if action == "ACCEPT_SURVEY":
        resolved_val = val_b
        resolution_note = f"Accepted modern survey evidence ({val_b})"
    elif action == "ACCEPT_CADASTRAL":
        resolved_val = val_a
        resolution_note = f"Accepted historical cadastral title ({val_a})"
    elif action == "ACCEPT_MUNICIPAL":
        resolved_val = custom_value or val_a
        resolution_note = f"Accepted municipal tax assessment ({resolved_val})"
    elif action == "MANUAL_EDIT":
        resolved_val = custom_value or val_b
        resolution_note = f"Manual officer edit: {resolved_val}"
    elif action == "REQUEST_SURVEY":
        resolved_val = "SURVEY_REQUESTED"
        resolution_note = "Field re-survey requested with RTK-GNSS team"
    elif action == "DEFER":
        resolved_val = "DEFERRED"
        resolution_note = "Deferred for joint committee adjudication"
    else:
        resolved_val = custom_value or val_b
        resolution_note = f"Action: {action}"
        
    now_dt = datetime.utcnow()
    
    status_val = "RESOLVED" if action not in ["REQUEST_SURVEY", "DEFER"] else action
    cursor.execute(
        "UPDATE conflicts SET status = %s, resolution = %s, resolved_at = %s WHERE id = %s;",
        (status_val, resolution_note, now_dt, conflict_id)
    )
    
    if attr == "area" and action in ["ACCEPT_SURVEY", "ACCEPT_CADASTRAL", "MANUAL_EDIT"]:
        numeric_val = float(resolved_val.replace(" m²", "").strip())
        cursor.execute("UPDATE integrated_records SET area = %s, status = 'REVIEWED' WHERE parcel_id = %s;", (numeric_val, pid))
    elif attr == "land_use" and action in ["ACCEPT_SURVEY", "ACCEPT_CADASTRAL", "MANUAL_EDIT"]:
        cursor.execute("UPDATE integrated_records SET land_use = %s, status = 'REVIEWED' WHERE parcel_id = %s;", (resolved_val, pid))
        
    cursor.execute("SELECT COUNT(*) FROM conflicts WHERE parcel_id = %s AND status = 'PENDING';", (pid,))
    remaining_pending = cursor.fetchone()["count"]
    cursor.execute("UPDATE integrated_records SET conflict_count = %s WHERE parcel_id = %s;", (remaining_pending, pid))
    
    cursor.execute(
        """INSERT INTO audit_logs (user_name, action, entity, entity_id, old_value, new_value)
           VALUES (%s, %s, %s, %s, %s, %s);""",
        (user_name, f"RESOLVE_CONFLICT_{action}", "Conflict", f"Conflict-{conflict_id} ({pid})", f"{val_a} vs {val_b}", resolved_val)
    )
    
    conn.commit()
    cursor.close()
    conn.close()
    
    return {
        "success": True,
        "conflict_id": conflict_id,
        "action": action,
        "resolved_value": resolved_val,
        "resolution_note": resolution_note,
        "timestamp": str(now_dt)
    }
