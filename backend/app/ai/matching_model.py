import numpy as np
from typing import Dict, Any, Tuple
from app.ai.feature_extraction import extract_pairwise_spatial_features

class SpatialMatchingModel:
    """
    AI/ML Spatial Feature Matching Model for multi-source cadastral conflation.
    Computes spatial, area, and position similarities and predicts match confidence.
    """
    def __init__(self):
        # Calibrated weights derived from empirical land record alignment
        self.weights = {
            "spatial_iou": 0.45,
            "area_similarity": 0.25,
            "position_similarity": 0.20,
            "compactness_similarity": 0.05,
            "aspect_ratio_similarity": 0.05
        }

    def predict_match(self, geom_a: Dict[str, Any], geom_b: Dict[str, Any], area_a: float, area_b: float) -> Dict[str, Any]:
        feats = extract_pairwise_spatial_features(geom_a, geom_b, area_a, area_b)
        
        # Calculate weighted match score
        raw_score = sum(feats[k] * self.weights[k] for k in self.weights)
        
        # Non-linear probability scaling (sigmoid-like boost for high IoU)
        if feats["spatial_iou"] > 0.70:
            boosted_score = 0.70 + (raw_score - 0.70) * 1.05
        elif feats["spatial_iou"] < 0.20:
            boosted_score = raw_score * 0.5
        else:
            boosted_score = raw_score
            
        final_score = float(np.clip(boosted_score, 0.0, 0.99))
        
        # Format percentages as requested in PRD
        spatial_sim_pct = round(feats["spatial_iou"] * 100, 1)
        area_sim_pct = round(feats["area_similarity"] * 100, 1)
        pos_sim_pct = round(feats["position_similarity"] * 100, 1)
        match_confidence_pct = round(final_score * 100, 1)
        
        is_match = final_score >= 0.60
        
        return {
            "is_match": is_match,
            "match_confidence": match_confidence_pct,
            "spatial_similarity": spatial_sim_pct,
            "area_similarity": area_sim_pct,
            "position_similarity": pos_sim_pct,
            "features": feats
        }

# Global singleton model
matching_model = SpatialMatchingModel()
