from typing import List, Dict, Any
from shapely.geometry import shape
from app.ai.matching_model import matching_model

def match_spatial_features(cadastral_features: List[Dict[str, Any]], survey_features: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Runs AI-assisted spatial feature matching across Cadastral and Survey feature layers.
    Returns matched pairs with spatial, area, position, and confidence percentages.
    """
    matches = []
    
    for cad_feat in cadastral_features:
        cad_props = cad_feat.get("properties", {})
        cad_pid = cad_props.get("parcel_id") or cad_props.get("parcel_no", "Unknown")
        cad_geom = cad_feat.get("geometry")
        cad_area = float(cad_props.get("area", 0.0))
        
        if not cad_geom:
            continue
            
        best_match = None
        highest_score = 0.0
        
        for surv_feat in survey_features:
            surv_props = surv_feat.get("properties", {})
            surv_sid = surv_props.get("survey_id", "Unknown")
            surv_geom = surv_feat.get("geometry")
            surv_area = float(surv_props.get("area", 0.0))
            
            if not surv_geom:
                continue
                
            pred = matching_model.predict_match(cad_geom, surv_geom, cad_area, surv_area)
            if pred["match_confidence"] > highest_score:
                highest_score = pred["match_confidence"]
                best_match = {
                    "source_feature_id": cad_pid,
                    "target_feature_id": surv_sid,
                    "spatial_similarity": pred["spatial_similarity"],
                    "area_similarity": pred["area_similarity"],
                    "position_similarity": pred["position_similarity"],
                    "match_score": pred["match_confidence"],
                    "status": "matched" if pred["is_match"] else "low_confidence",
                    "features": pred["features"]
                }
                
        if best_match:
            matches.append(best_match)
            
    return matches
