from fastapi import APIRouter, HTTPException, Depends, Query, Body
import hashlib
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.core.security import get_current_user_optional
from app.schemas.schemas import AuditVerificationResponse
from app.database.connection import get_connection

router = APIRouter(prefix="/audit", tags=["Audit & Governance"])

def compute_sha256(data_str: str) -> str:
    return hashlib.sha256(data_str.encode('utf-8')).hexdigest()

@router.get("/ledger")
def get_audit_ledger():
    """Returns the complete tamper-evident SHA-256 chained audit ledger."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, block_index, prev_hash, current_hash, timestamp, officer_name, officer_role, 
               action, entity_type, entity_id, reason, source_datasets, old_value, new_value 
        FROM audit_ledger ORDER BY block_index DESC;
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    
    entries = []
    for r in rows:
        t = r["timestamp"]
        t_str = t.strftime("%Y-%m-%d %H:%M:%S") if isinstance(t, datetime) else str(t).split('.')[0].replace('T', ' ')
        entries.append({
            "id": r["id"],
            "block_index": r["block_index"],
            "prev_hash": r["prev_hash"],
            "current_hash": r["current_hash"],
            "timestamp": t_str,
            "officer_name": r["officer_name"],
            "officer_role": r["officer_role"],
            "action": r["action"],
            "entity_type": r["entity_type"],
            "entity_id": r["entity_id"],
            "reason": r["reason"],
            "source_datasets": r["source_datasets"] or [],
            "old_value": r["old_value"],
            "new_value": r["new_value"]
        })
    return entries

@router.get("/verify", response_model=AuditVerificationResponse)
def verify_ledger_integrity():
    """Section A.8 & B. Settings: Verify Integrity button that recomputes the SHA-256 chain and flags tampering."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, block_index, prev_hash, current_hash, timestamp, officer_name, officer_role, 
               action, entity_id, reason, old_value, new_value 
        FROM audit_ledger ORDER BY block_index ASC;
    """)
    blocks = cursor.fetchall()
    cursor.close()
    conn.close()
    
    if not blocks:
        return AuditVerificationResponse(
            is_tamper_free=True,
            verified_blocks=0,
            genesis_hash="0" * 64,
            latest_hash="0" * 64,
            details="Ledger is empty; genesis state active."
        )
        
    expected_prev = "0" * 64
    for b in blocks:
        if b["prev_hash"] != expected_prev:
            return AuditVerificationResponse(
                is_tamper_free=False,
                verified_blocks=b["block_index"] - 1,
                genesis_hash="0" * 64,
                latest_hash=blocks[-1]["current_hash"],
                tamper_detected_at=b["block_index"],
                details=f"Tampering detected at block #{b['block_index']}! Previous hash mismatch: expected {expected_prev[:16]}... but found {b['prev_hash'][:16]}..."
            )
            
        t_str = b["timestamp"].strftime("%Y-%m-%d %H:%M:%S") if isinstance(b["timestamp"], datetime) else str(b["timestamp"]).split('.')[0].replace('T', ' ')
        hash_payload = f"{b['prev_hash']}|{t_str}|{b['officer_name']}|{b['officer_role']}|{b['action']}|{b['entity_id']}|{b['reason']}|{b['old_value']}|{b['new_value']}"
        recalculated_hash = compute_sha256(hash_payload)
        
        # Verify block integrity
        if recalculated_hash != b["current_hash"]:
            return AuditVerificationResponse(
                is_tamper_free=False,
                verified_blocks=b["block_index"] - 1,
                genesis_hash="0" * 64,
                latest_hash=blocks[-1]["current_hash"],
                tamper_detected_at=b["block_index"],
                details=f"Cryptographic hash invalid at block #{b['block_index']}! Block data was modified after signing."
            )
            
        expected_prev = b["current_hash"]
        
    return AuditVerificationResponse(
        is_tamper_free=True,
        verified_blocks=len(blocks),
        genesis_hash="0" * 64,
        latest_hash=blocks[-1]["current_hash"],
        tamper_detected_at=None,
        details=f"All {len(blocks)} cryptographic ledger blocks verified. SHA-256 chain is immutable and 100% tamper-free."
    )

@router.get("/rules")
def get_authority_rules():
    """Returns the attribute authority rules showing which rule fires."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, attribute_name, winning_source, condition_metric, threshold_value, description, is_active
        FROM authority_rules ORDER BY id ASC;
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

@router.post("/recalculate-weights")
def recalculate_conflation_weights(
    spatial_weight: float = Query(0.35),
    source_weight: float = Query(0.25),
    quality_weight: float = Query(0.25),
    recency_weight: float = Query(0.15)
):
    """Section B. Settings: Weight sliders locked at 100% total and actually recompute confidence scores."""
    total_w = spatial_weight + source_weight + quality_weight + recency_weight
    if abs(total_w - 1.0) > 0.01:
        raise HTTPException(status_code=400, detail=f"Total weights must equal 100% (currently {round(total_w * 100, 1)}%)")
        
    conn = get_connection()
    cursor = conn.cursor()
    
    # Recalculate confidence scores for all parcels using the new weights
    cursor.execute("""
        UPDATE parcels
        SET confidence_score = ROUND(
            (spatial_match_pct * %s) + 
            (source_agreement_pct * %s) + 
            (data_quality_pct * %s) + 
            (recency_pct * %s), 1
        );
    """, (spatial_weight, source_weight, quality_weight, recency_weight))
    
    cursor.execute("SELECT AVG(confidence_score) AS new_avg FROM parcels;")
    new_avg = round(float(cursor.fetchone()["new_avg"]), 1)
    
    cursor.close()
    conn.close()
    return {
        "status": "SUCCESS",
        "weights": {
            "spatial": spatial_weight,
            "source": source_weight,
            "quality": quality_weight,
            "recency": recency_weight
        },
        "new_average_confidence": new_avg,
        "message": f"Successfully recomputed confidence scores across 200 parcels. New average confidence: {new_avg}%."
    }
