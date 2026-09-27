from typing import Dict, Any

STANDARD_MAPPING_RULES = {
    "parcel_id": ["parcel_id", "parcel_no", "plot_id", "survey_id", "cadastral_no", "khasra_no"],
    "owner": ["owner", "owner_name", "property_owner", "patta_holder", "holder_name"],
    "land_use": ["land_use", "landuse", "zoning", "use_category", "purpose"],
    "area": ["area", "area_sqm", "plot_area", "calculated_area", "gis_area"]
}

def map_attributes(raw_properties: Dict[str, Any]) -> Dict[str, Any]:
    """Map source-specific attribute keys to the common harmonized schema."""
    harmonized = {}
    
    for target_key, candidate_keys in STANDARD_MAPPING_RULES.items():
        for cand in candidate_keys:
            if cand in raw_properties:
                harmonized[target_key] = raw_properties[cand]
                break
                
    # Retain all original attributes under raw_attributes
    harmonized["_raw"] = raw_properties
    return harmonized
