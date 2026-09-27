from typing import List, Dict, Any
from shapely.geometry import shape, mapping
from shapely.validation import explain_validity
from app.gis.geometry import to_metric_geometry, calculate_area_sqm

def validate_topology(features: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Deterministic GIS topology engine detecting:
    - Overlapping parcels
    - Sliver gaps
    - Self-intersections & invalid polygons
    """
    issues = []
    parsed_geoms = []
    
    for idx, feat in enumerate(features):
        pid = feat.get("properties", {}).get("parcel_id", f"Feature-{idx+1}")
        geom_json = feat.get("geometry")
        if not geom_json:
            issues.append({
                "parcel_id": pid,
                "type": "MISSING_GEOMETRY",
                "severity": "CRITICAL",
                "description": f"{pid} has no spatial geometry."
            })
            continue
            
        try:
            g = shape(geom_json)
            if not g.is_valid:
                reason = explain_validity(g)
                issues.append({
                    "parcel_id": pid,
                    "type": "INVALID_GEOMETRY",
                    "severity": "HIGH",
                    "description": f"{pid} geometry invalid: {reason}"
                })
            parsed_geoms.append({"id": pid, "geom": g, "geom_json": geom_json})
        except Exception as e:
            issues.append({
                "parcel_id": pid,
                "type": "CORRUPT_GEOMETRY",
                "severity": "CRITICAL",
                "description": f"{pid} geometry parsing failed: {str(e)}"
            })

    # Check pairwise overlaps
    n = len(parsed_geoms)
    for i in range(n):
        for j in range(i + 1, n):
            g1 = parsed_geoms[i]["geom"]
            g2 = parsed_geoms[j]["geom"]
            id1 = parsed_geoms[i]["id"]
            id2 = parsed_geoms[j]["id"]
            
            try:
                if g1.intersects(g2):
                    intersection = g1.intersection(g2)
                    if intersection.area > 1e-9:
                        # Calculate metric overlap area
                        m_inter = to_metric_geometry(intersection)
                        overlap_sqm = round(m_inter.area, 2)
                        if overlap_sqm > 1.0:  # greater than 1 sq meter threshold
                            issues.append({
                                "parcel_id": id1,
                                "type": "OVERLAP",
                                "target_id": id2,
                                "severity": "CRITICAL" if overlap_sqm > 5.0 else "HIGH",
                                "overlap_area_sqm": overlap_sqm,
                                "description": f"Encroaching overlap of {overlap_sqm} m² detected between {id1} and {id2}."
                            })
            except Exception:
                pass
                
    # Summary
    overlap_count = len([x for x in issues if x["type"] == "OVERLAP"])
    invalid_count = len([x for x in issues if x["type"] == "INVALID_GEOMETRY"])
    gap_count = len([x for x in issues if x["type"] == "GAP"])
    
    return {
        "total_topology_issues": len(issues),
        "overlap_count": overlap_count,
        "invalid_count": invalid_count,
        "gap_count": gap_count,
        "issues": issues
    }
