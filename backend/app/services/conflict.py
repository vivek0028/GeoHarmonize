from datetime import datetime
from typing import Dict, Any, List, Optional
import hashlib
import json
from app.database.connection import get_connection

def resolve_conflict_in_db(conflict_id: int, action: str, custom_value: Optional[str], user_name: str, reason: str) -> Dict[str, Any]:
    if not reason or not reason.strip():
        raise ValueError("A formal adjudication justification reason is required before saving any decision.")
        
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
    prev_status = row["status"]
    
    revert_state = {
        "previous_status": prev_status,
        "previous_resolution": row["resolution"],
        "attribute": attr,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    if action in ["ACCEPT_SURVEY", "APPROVE_TOPOLOGY_FIX"]:
        resolved_val = val_b
        resolution_note = f"Accepted modern survey evidence ({val_b}) under Authority Rule #1"
    elif action == "ACCEPT_CADASTRAL":
        resolved_val = val_a
        resolution_note = f"Accepted historical revenue cadastre title ({val_a})"
    elif action == "ACCEPT_MUNICIPAL":
        resolved_val = custom_value or val_a
        resolution_note = f"Accepted municipal tax assessment ({resolved_val})"
    elif action == "MANUAL_EDIT":
        resolved_val = custom_value or val_b
        resolution_note = f"Manual officer adjudication: {resolved_val}"
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
    
    # 1. Update conflict table with reason & revert_state
    cursor.execute("""
        UPDATE conflicts 
        SET status = %s, resolution = %s, reason = %s, revert_state = %s, resolved_at = %s 
        WHERE id = %s;
    """, (status_val, resolution_note, reason, json.dumps(revert_state), now_dt, conflict_id))
    
    # 2. Update parcel table and create new geometry version if area changed [D: Never overwrite originals]
    if attr in ["area", "boundary_overlap", "geometry_sliver"] and status_val == "RESOLVED":
        cursor.execute("SELECT id, area, ST_AsGeoJSON(geometry) AS geom_json FROM parcels WHERE parcel_id = %s;", (pid,))
        p_row = cursor.fetchone()
        if p_row:
            cursor.execute("SELECT COALESCE(MAX(version_num), 1) + 1 AS next_v FROM geometry_versions WHERE parcel_id = %s;", (pid,))
            next_v = cursor.fetchone()["next_v"]
            
            new_area = p_row["area"]
            try:
                if "m²" in resolved_val:
                    new_area = float(resolved_val.split('m²')[0].strip())
            except:
                pass
                
            cursor.execute("""
                INSERT INTO geometry_versions (parcel_id, version_num, status, geometry, area_sqm, source_name, created_by, change_reason)
                VALUES (%s, %s, 'approved', ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326), %s, 'Conflict Resolution Adjudication', %s, %s)
                RETURNING id;
            """, (pid, next_v, p_row["geom_json"], new_area, user_name, f"{action}: {reason}"))
            new_v_id = cursor.fetchone()["id"]
            
            cursor.execute("""
                UPDATE parcels 
                SET area = %s, current_geometry_version_id = %s, review_status = 'APPROVED', status = 'ACTIVE', updated_at = NOW()
                WHERE parcel_id = %s;
            """, (new_area, new_v_id, pid))
            
    elif attr == "land_use" and status_val == "RESOLVED":
        cursor.execute("UPDATE parcels SET land_use = %s, updated_at = NOW() WHERE parcel_id = %s;", (resolved_val, pid))
        
    # Update integrated_records for legacy compatibility
    cursor.execute("SELECT COUNT(*) FROM conflicts WHERE parcel_id = %s AND status = 'PENDING';", (pid,))
    rem_pending = cursor.fetchone()["count"]
    cursor.execute("UPDATE integrated_records SET conflict_count = %s WHERE parcel_id = %s;", (rem_pending, pid))
    
    # 3. Append to SHA-256 Audit Ledger [Section A.8]
    cursor.execute("SELECT current_hash, block_index FROM audit_ledger ORDER BY block_index DESC LIMIT 1;")
    last_block = cursor.fetchone()
    prev_h = last_block["current_hash"] if last_block else "0" * 64
    b_idx = (last_block["block_index"] + 1) if last_block else 1
    
    now_iso = now_dt.isoformat()
    action_str = f"RESOLVE_CONFLICT_{action}"
    entity_str = f"Conflict #{conflict_id} ({pid})"
    hash_payload = f"{prev_h}|{now_iso}|{user_name}|ANALYST|{action_str}|{entity_str}|{reason}|{val_a} vs {val_b}|{resolved_val}"
    new_hash = hashlib.sha256(hash_payload.encode('utf-8')).hexdigest()
    
    cursor.execute("""
        INSERT INTO audit_ledger (block_index, prev_hash, current_hash, timestamp, officer_name, officer_role, action, entity_type, entity_id, reason, source_datasets, old_value, new_value)
        VALUES (%s, %s, %s, %s, %s, 'ANALYST', %s, 'Conflict', %s, %s, ARRAY['High-Precision GNSS Survey (2026)', 'Cadastral Revenue Map (1998)'], %s, %s);
    """, (b_idx, prev_h, new_hash, now_iso, user_name, action_str, entity_str, reason, f"{val_a} vs {val_b}", resolved_val))
    
    conn.commit()
    cursor.close()
    conn.close()
    
    return {
        "success": True,
        "conflict_id": conflict_id,
        "action": action,
        "resolved_value": resolved_val,
        "resolution_note": resolution_note,
        "ledger_block": b_idx,
        "ledger_hash": new_hash,
        "timestamp": str(now_dt)
    }

def revert_conflict_in_db(conflict_id: int, reason: str, user_name: str) -> Dict[str, Any]:
    if not reason or not reason.strip():
        raise ValueError("A formal reason is required to revert an official resolution decision.")
        
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM conflicts WHERE id = %s;", (conflict_id,))
    row = cursor.fetchone()
    if not row:
        cursor.close()
        conn.close()
        raise ValueError(f"Conflict #{conflict_id} not found")
        
    pid = row["parcel_id"]
    old_res = row["resolution"]
    
    # 1. Reset conflict back to PENDING
    cursor.execute("""
        UPDATE conflicts 
        SET status = 'PENDING', resolution = NULL, resolved_at = NULL, reason = %s 
        WHERE id = %s;
    """, (f"Reverted: {reason}", conflict_id))
    
    # 2. Reset parcel review status back to ESCALATED
    cursor.execute("UPDATE parcels SET review_status = 'ESCALATED', updated_at = NOW() WHERE parcel_id = %s;", (pid,))
    
    # 3. Append Revert to SHA-256 Audit Ledger
    cursor.execute("SELECT current_hash, block_index FROM audit_ledger ORDER BY block_index DESC LIMIT 1;")
    last_block = cursor.fetchone()
    prev_h = last_block["current_hash"] if last_block else "0" * 64
    b_idx = (last_block["block_index"] + 1) if last_block else 1
    
    now_iso = datetime.utcnow().isoformat()
    action_str = "REVERT_CONFLICT_RESOLUTION"
    entity_str = f"Conflict #{conflict_id} ({pid})"
    hash_payload = f"{prev_h}|{now_iso}|{user_name}|APPROVER|{action_str}|{entity_str}|{reason}|{old_res}|PENDING"
    new_hash = hashlib.sha256(hash_payload.encode('utf-8')).hexdigest()
    
    cursor.execute("""
        INSERT INTO audit_ledger (block_index, prev_hash, current_hash, timestamp, officer_name, officer_role, action, entity_type, entity_id, reason, source_datasets, old_value, new_value)
        VALUES (%s, %s, %s, %s, %s, 'APPROVER', %s, 'Conflict', %s, %s, ARRAY['High-Precision GNSS Survey (2026)'], %s, 'PENDING');
    """, (b_idx, prev_h, new_hash, now_iso, user_name, action_str, entity_str, reason, str(old_res)))
    
    conn.commit()
    cursor.close()
    conn.close()
    
    return {
        "success": True,
        "conflict_id": conflict_id,
        "status": "PENDING",
        "message": f"Conflict #{conflict_id} successfully reverted to PENDING and recorded in ledger block #{b_idx}.",
        "ledger_block": b_idx,
        "ledger_hash": new_hash
    }
