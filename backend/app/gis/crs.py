from typing import Any, Dict, List
import pyproj
from shapely.geometry import shape, mapping
from shapely.ops import transform

# Cache transformers
_transformers: Dict[str, pyproj.Transformer] = {}

def get_transformer(from_crs: str, to_crs: str = "EPSG:4326") -> pyproj.Transformer:
    key = f"{from_crs}->{to_crs}"
    if key not in _transformers:
        _transformers[key] = pyproj.Transformer.from_crs(from_crs, to_crs, always_xy=True)
    return _transformers[key]

def transform_geometry(geojson_geom: Dict[str, Any], from_crs: str, to_crs: str = "EPSG:4326") -> Dict[str, Any]:
    """Transform GeoJSON geometry from one CRS to another (default EPSG:4326 WGS84)."""
    if from_crs.upper() == to_crs.upper():
        return geojson_geom
    try:
        transformer = get_transformer(from_crs, to_crs)
        geom = shape(geojson_geom)
        transformed_geom = transform(transformer.transform, geom)
        return mapping(transformed_geom)
    except Exception as e:
        print(f"CRS transform error from {from_crs} to {to_crs}: {e}")
        return geojson_geom

def detect_crs(raw_text_or_metadata: Any) -> str:
    """Detect standard CRS or default to EPSG:4326."""
    if isinstance(raw_text_or_metadata, dict):
        crs_obj = raw_text_or_metadata.get("crs")
        if crs_obj and isinstance(crs_obj, dict):
            props = crs_obj.get("properties", {})
            name = props.get("name", "")
            if "3857" in name:
                return "EPSG:3857"
            if "4326" in name or "CRS84" in name:
                return "EPSG:4326"
    return "EPSG:4326"
