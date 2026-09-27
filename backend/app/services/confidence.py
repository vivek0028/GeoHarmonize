from typing import Dict, Any

CONFIDENCE_WEIGHTS = {
    "spatial_match": 0.35,
    "source_agreement": 0.25,
    "data_quality": 0.25,
    "recency": 0.15
}

def calculate_confidence_score(
    spatial_match: float,
    source_agreement: float,
    data_quality: float,
    recency: float
) -> Dict[str, Any]:
    """
    Computes explainable multi-factor confidence score for a land record.
    """
    overall = (
        (spatial_match * CONFIDENCE_WEIGHTS["spatial_match"]) +
        (source_agreement * CONFIDENCE_WEIGHTS["source_agreement"]) +
        (data_quality * CONFIDENCE_WEIGHTS["data_quality"]) +
        (recency * CONFIDENCE_WEIGHTS["recency"])
    )
    overall = round(overall, 1)
    
    if overall >= 85.0:
        tier = "HIGH"
        status_label = "High Confidence"
        needs_review = False
    elif overall >= 60.0:
        tier = "MEDIUM"
        status_label = "Medium Confidence"
        needs_review = False
    else:
        tier = "LOW"
        status_label = "Low Confidence"
        needs_review = True
        
    return {
        "spatial_match": spatial_match,
        "source_agreement": source_agreement,
        "data_quality": data_quality,
        "recency": recency,
        "overall": overall,
        "tier": tier,
        "status_label": status_label,
        "needs_review": needs_review,
        "weights": CONFIDENCE_WEIGHTS
    }
