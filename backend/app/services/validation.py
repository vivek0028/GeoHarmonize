import json
import csv
from typing import Dict, Any, List
from app.gis.geometry import validate_geometry
from app.gis.crs import detect_crs

def validate_dataset_file(file_path: str, file_format: str) -> Dict[str, Any]:
    errors: List[str] = []
    geom_types = set()
    feature_count = 0
    missing_fields_count = 0
    all_geometries_valid = True
    detected_crs = "EPSG:4326"
    
    try:
        if file_format.upper() in ["GEOJSON", "JSON"]:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                
            detected_crs = detect_crs(data)
            features = data.get("features", [])
            feature_count = len(features)
            
            for idx, feat in enumerate(features):
                props = feat.get("properties", {})
                geom = feat.get("geometry")
                
                # Check required fields
                if not any(k in props for k in ["parcel_id", "parcel_no", "plot_id", "survey_id", "building_id", "point_id"]):
                    missing_fields_count += 1
                    
                if geom:
                    geom_type = geom.get("type", "Unknown")
                    geom_types.add(geom_type)
                    is_valid, reason = validate_geometry(geom)
                    if not is_valid:
                        all_geometries_valid = False
                        if len(errors) < 5:
                            errors.append(f"Feature #{idx+1} invalid geometry: {reason}")
                else:
                    errors.append(f"Feature #{idx+1} missing geometry")
                    
        elif file_format.upper() == "CSV":
            with open(file_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                rows = list(reader)
                feature_count = len(rows)
                geom_types.add("Point")
                
                for idx, row in enumerate(rows):
                    if not any(k in row for k in ["point_id", "id", "code"]):
                        missing_fields_count += 1
                    lat = row.get("latitude") or row.get("lat") or row.get("y")
                    lon = row.get("longitude") or row.get("lon") or row.get("x")
                    if not lat or not lon:
                        if len(errors) < 5:
                            errors.append(f"Row #{idx+1} missing coordinates")
                            
        return {
            "file_readable": True,
            "geometry_valid": all_geometries_valid,
            "crs_detected": detected_crs,
            "required_fields_present": missing_fields_count == 0,
            "feature_count": feature_count,
            "missing_fields_count": missing_fields_count,
            "validation_errors": errors,
            "geometry_types": list(geom_types)
        }
    except Exception as e:
        return {
            "file_readable": False,
            "geometry_valid": False,
            "crs_detected": "Unknown",
            "required_fields_present": False,
            "feature_count": 0,
            "missing_fields_count": 0,
            "validation_errors": [f"File read error: {str(e)}"],
            "geometry_types": []
        }
