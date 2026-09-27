from typing import Dict, Any
from app.gis.geometry import (
    calculate_iou,
    calculate_area_similarity,
    calculate_position_similarity,
    calculate_shape_features
)

def extract_pairwise_spatial_features(geom_a: Dict[str, Any], geom_b: Dict[str, Any], area_a: float, area_b: float) -> Dict[str, float]:
    """Extract spatial pairwise features for the ML matching model."""
    iou = calculate_iou(geom_a, geom_b)
    area_sim = calculate_area_similarity(area_a, area_b)
    pos_sim = calculate_position_similarity(geom_a, geom_b)
    
    feats_a = calculate_shape_features(geom_a)
    feats_b = calculate_shape_features(geom_b)
    
    compact_diff = abs(feats_a["compactness"] - feats_b["compactness"])
    compact_sim = max(0.0, 1.0 - compact_diff * 2)
    
    aspect_diff = abs(feats_a["aspect_ratio"] - feats_b["aspect_ratio"])
    aspect_sim = max(0.0, 1.0 - aspect_diff)
    
    return {
        "spatial_iou": iou,
        "area_similarity": area_sim,
        "position_similarity": pos_sim,
        "compactness_similarity": round(compact_sim, 4),
        "aspect_ratio_similarity": round(aspect_sim, 4)
    }
