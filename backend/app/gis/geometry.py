import math
from typing import Dict, Any, Tuple, List, Optional
from shapely.geometry import shape, mapping, Polygon, MultiPolygon
from shapely.validation import explain_validity
import pyproj
from shapely.ops import transform

# Geodetic transformer to EPSG:3857 for metric distance/area
_metric_transformer = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)

def to_metric_geometry(geom):
    """Converts a WGS84 geometry to Web Mercator EPSG:3857 for metric measurements."""
    return transform(_metric_transformer.transform, geom)

def validate_geometry(geojson_geom: Dict[str, Any]) -> Tuple[bool, str]:
    """Validates geometry using Shapely, returning (is_valid, explanation)."""
    try:
        geom = shape(geojson_geom)
        if geom.is_valid:
            return True, "Valid geometry"
        else:
            return False, explain_validity(geom)
    except Exception as e:
        return False, str(e)

def calculate_area_sqm(geojson_geom: Dict[str, Any]) -> float:
    """Calculates approximate metric area in square meters."""
    try:
        geom = shape(geojson_geom)
        metric_geom = to_metric_geometry(geom)
        # Apply latitude scale correction factor for EPSG:3857: cos^2(lat)
        centroid = geom.centroid
        lat_rad = math.radians(centroid.y)
        cos_lat = math.cos(lat_rad)
        true_area = metric_geom.area * (cos_lat ** 2)
        return round(true_area, 2)
    except Exception:
        return 0.0

def calculate_iou(geom1_json: Dict[str, Any], geom2_json: Dict[str, Any]) -> float:
    """Calculates Intersection over Union (Jaccard index) between two geometries."""
    try:
        g1 = shape(geom1_json)
        g2 = shape(geom2_json)
        if not g1.is_valid:
            g1 = g1.buffer(0)
        if not g2.is_valid:
            g2 = g2.buffer(0)
        intersection = g1.intersection(g2).area
        union = g1.union(g2).area
        if union == 0:
            return 0.0
        return round(intersection / union, 4)
    except Exception:
        return 0.0

def calculate_position_similarity(geom1_json: Dict[str, Any], geom2_json: Dict[str, Any]) -> float:
    """Calculates position similarity based on centroid distance."""
    try:
        g1 = shape(geom1_json)
        g2 = shape(geom2_json)
        m1 = to_metric_geometry(g1)
        m2 = to_metric_geometry(g2)
        dist_m = m1.centroid.distance(m2.centroid)
        # If within 0.5m -> ~100%, decay with 15m scale
        sim = max(0.0, 1.0 - (dist_m / 15.0))
        return round(sim, 4)
    except Exception:
        return 0.0

def calculate_area_similarity(area1: float, area2: float) -> float:
    """Calculates area similarity ratio min(a1, a2) / max(a1, a2)."""
    if area1 <= 0 or area2 <= 0:
        return 0.0
    return round(min(area1, area2) / max(area1, area2), 4)

def calculate_shape_features(geojson_geom: Dict[str, Any]) -> Dict[str, float]:
    """Calculates geometric shape descriptors (compactness, aspect ratio, perimeter/area)."""
    try:
        g = shape(geojson_geom)
        if not g.is_valid:
            g = g.buffer(0)
        m = to_metric_geometry(g)
        area = m.area
        perimeter = m.length
        compactness = (4 * math.pi * area) / (perimeter ** 2) if perimeter > 0 else 0
        minx, miny, maxx, maxy = m.bounds
        width = maxx - minx
        height = maxy - miny
        aspect_ratio = min(width, height) / max(width, height) if max(width, height) > 0 else 1.0
        return {
            "area_metric": area,
            "perimeter_metric": perimeter,
            "compactness": round(compactness, 4),
            "aspect_ratio": round(aspect_ratio, 4)
        }
    except Exception:
        return {"area_metric": 0, "perimeter_metric": 0, "compactness": 0, "aspect_ratio": 0}
