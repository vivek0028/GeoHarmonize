from fastapi import APIRouter
from typing import List
from app.schemas.schemas import FeatureMatchItem
from app.database.connection import get_connection

router = APIRouter(prefix="/matching", tags=["Matching"])

@router.get("/", response_model=List[FeatureMatchItem])
def list_matches():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, source_feature_id, target_feature_id, spatial_similarity, area_similarity, 
               position_similarity, match_score, status 
        FROM feature_matches ORDER BY match_score DESC;
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    
    matches = []
    for r in rows:
        matches.append(FeatureMatchItem(
            id=r["id"],
            source_feature_id=r["source_feature_id"],
            target_feature_id=r["target_feature_id"],
            spatial_similarity=float(r["spatial_similarity"]),
            area_similarity=float(r["area_similarity"]),
            position_similarity=float(r["position_similarity"]),
            match_score=float(r["match_score"]),
            status=r["status"]
        ))
    return matches
