from typing import List, Dict, Any
from shapely.geometry import shape
from app.gis.geometry import calculate_iou, to_metric_geometry

def detect_layer_changes(old_cadastral: List[Dict[str, Any]], new_integrated: List[Dict[str, Any]]) -> Dict[str, Any]:
    old_map = {feat["properties"]["parcel_id"]: feat for feat in old_cadastral if "parcel_id" in feat.get("properties", {})}
    new_map = {feat["properties"]["parcel_id"]: feat for feat in new_integrated if "parcel_id" in feat.get("properties", {})}
    
    added_parcels = [pid for pid in new_map if pid not in old_map]
    removed_parcels = [pid for pid in old_map if pid not in new_map]
    
    boundary_changed = []
    area_changed = []
    attribute_changed = []
    
    common_pids = set(old_map.keys()).intersection(new_map.keys())
    
    for pid in sorted(common_pids):
        f_old = old_map[pid]
        f_new = new_map[pid]
        
        props_old = f_old["properties"]
        props_new = f_new["properties"]
        
        # Area diff
        a_old = float(props_old.get("area", 0.0))
        a_new = float(props_new.get("area", 0.0))
        diff_sqm = round(a_new - a_old, 2)
        if abs(diff_sqm) > 1.0:
            area_changed.append({
                "parcel_id": pid,
                "old_area": a_old,
                "new_area": a_new,
                "difference_sqm": diff_sqm,
                "percent_change": round((diff_sqm / a_old) * 100, 1) if a_old > 0 else 0
            })
            
        # Boundary diff via IoU
        geom_old = f_old.get("geometry")
        geom_new = f_new.get("geometry")
        if geom_old and geom_new:
            iou = calculate_iou(geom_old, geom_new)
            if iou < 0.98:
                boundary_changed.append({
                    "parcel_id": pid,
                    "spatial_overlap_iou": round(iou * 100, 1),
                    "boundary_offset_detected": True,
                    "status": "Realigned via GNSS"
                })
                
        # Attribute diff
        use_old = props_old.get("land_use")
        use_new = props_new.get("land_use")
        if use_old and use_new and use_old != use_new:
            attribute_changed.append({
                "parcel_id": pid,
                "field": "land_use",
                "old_value": use_old,
                "new_value": use_new
            })
            
    return {
        "added_parcels": added_parcels,
        "removed_parcels": removed_parcels,
        "boundary_changed": boundary_changed,
        "area_changed": area_changed,
        "attribute_changed": attribute_changed,
        "summary": {
            "total_evaluated": len(common_pids),
            "total_area_shifts": len(area_changed),
            "total_boundary_realignments": len(boundary_changed),
            "total_attribute_updates": len(attribute_changed)
        }
    }
