"""
Generate realistic prototype datasets for GeoHarmonize:
1. cadastral.geojson (Historical revenue cadastre)
2. survey_parcels.geojson (Modern drone/total station survey)
3. buildings.geojson (Municipal building footprints)
4. survey_points.csv (Centimeter-accurate GNSS boundary corners)
"""

import json
import csv
import os

# Centered around an urban municipal ward (Lat: 28.6139, Lon: 77.2090)
BASE_LON = 77.2150
BASE_LAT = 28.6250
SCALE = 0.00085  # parcel dimension roughly ~70-90m

os.makedirs("backend/data", exist_ok=True)

# Grid of parcels: 3 rows x 4 cols = 12 parcels
parcels_data = [
    {"id": "P-101", "row": 0, "col": 0, "cad_area": 240.0, "surv_area": 248.0, "land_use": "Residential", "owner": "Aditi Sharma", "conflict": "AREA_MISMATCH"},
    {"id": "P-102", "row": 0, "col": 1, "cad_area": 310.0, "surv_area": 312.0, "land_use": "Residential", "owner": "Rajesh Verma", "conflict": "TOPOLOGY_OVERLAP"},
    {"id": "P-103", "row": 0, "col": 2, "cad_area": 195.0, "surv_area": 194.5, "land_use": "Commercial", "owner": "Metro Retail LLP", "conflict": None},
    {"id": "P-104", "row": 0, "col": 3, "cad_area": 420.0, "surv_area": 418.0, "land_use": "Public Utility", "owner": "Municipal Corp", "conflict": None},
    
    {"id": "P-105", "row": 1, "col": 0, "cad_area": 280.0, "surv_area": 281.0, "land_use": "Residential", "surv_use": "Commercial", "owner": "Kavita Rao", "conflict": "LAND_USE_MISMATCH"},
    {"id": "P-106", "row": 1, "col": 1, "cad_area": 350.0, "surv_area": 350.5, "land_use": "Residential", "owner": "Vikram Malhotra", "conflict": None},
    {"id": "P-107", "row": 1, "col": 2, "cad_area": 260.0, "surv_area": 259.0, "land_use": "Residential", "owner": "Suresh Nair", "conflict": None},
    {"id": "P-108", "row": 1, "col": 3, "cad_area": 390.0, "surv_area": 372.0, "land_use": "Institutional", "owner": "City Health Center", "conflict": "BOUNDARY_SLIVER_GAP"},
    
    {"id": "P-109", "row": 2, "col": 0, "cad_area": 220.0, "surv_area": 220.0, "land_use": "Residential", "owner": "Deepak Joshi", "conflict": None},
    {"id": "P-110", "row": 2, "col": 1, "cad_area": 330.0, "surv_area": 331.0, "land_use": "Mixed Use", "owner": "Ananya Sen", "conflict": None},
    {"id": "P-111", "row": 2, "col": 2, "cad_area": 290.0, "surv_area": 289.0, "land_use": "Residential", "owner": "Pooja Hegde", "conflict": None},
    {"id": "P-112", "row": 2, "col": 3, "cad_area": 450.0, "surv_area": 448.0, "land_use": "Commercial", "owner": "Apex Tech Hub", "conflict": None},
]

cadastral_features = []
survey_features = []
building_features = []
survey_points = []

point_counter = 1001

for item in parcels_data:
    r, c = item["row"], item["col"]
    pid = item["id"]
    sid = "S-" + pid.replace("P-", "20")
    
    # Base coordinates
    x0 = BASE_LON + c * SCALE * 1.15
    y0 = BASE_LAT - r * SCALE * 1.05
    x1 = x0 + SCALE
    y1 = y0 - SCALE * 0.9
    
    # Cadastral geometry
    cad_poly = [
        [round(x0, 6), round(y0, 6)],
        [round(x1, 6), round(y0, 6)],
        [round(x1, 6), round(y1, 6)],
        [round(x0, 6), round(y1, 6)],
        [round(x0, 6), round(y0, 6)]
    ]
    
    # Survey geometry (has slight GNSS refinement or shift)
    dx = 0.00004
    dy = -0.00003
    if item["conflict"] == "AREA_MISMATCH":
        # Survey found parcel extends further east
        x1_s = x1 + 0.00012
        y1_s = y1 - 0.00005
    elif item["conflict"] == "TOPOLOGY_OVERLAP":
        # Survey encroaches slightly into neighbor
        x1_s = x1 + 0.00015
        y1_s = y1
    elif item["conflict"] == "BOUNDARY_SLIVER_GAP":
        # Survey indicates a 4-meter gap/sliver along the boundary
        x1_s = x1 - 0.00008
        y1_s = y1
    else:
        x1_s = x1 + dx
        y1_s = y1 + dy
        
    surv_poly = [
        [round(x0 + dx, 6), round(y0 + dy, 6)],
        [round(x1_s, 6), round(y0 + dy, 6)],
        [round(x1_s, 6), round(y1_s, 6)],
        [round(x0 + dx, 6), round(y1_s, 6)],
        [round(x0 + dx, 6), round(y0 + dy, 6)]
    ]
    
    cadastral_features.append({
        "type": "Feature",
        "properties": {
            "parcel_id": pid,
            "parcel_no": pid,
            "area": item["cad_area"],
            "land_use": item["land_use"],
            "owner_name": item["owner"],
            "source": "Historical Cadastre (1998)",
            "registration_year": 1998
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [cad_poly]
        }
    })
    
    survey_features.append({
        "type": "Feature",
        "properties": {
            "survey_id": sid,
            "matched_parcel_ref": pid,
            "area": item["surv_area"],
            "survey_agency": "National Drone & GNSS Directorate",
            "survey_date": "2026-02-14",
            "land_use": item.get("surv_use", item["land_use"]),
            "equipment": "RTK-GNSS + LiDAR Drone"
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [surv_poly]
        }
    })
    
    # Building footprint inside the parcel
    bx0 = (x0 + x1) / 2 - SCALE * 0.22
    bx1 = (x0 + x1) / 2 + SCALE * 0.22
    by0 = (y0 + y1) / 2 + SCALE * 0.20
    by1 = (y0 + y1) / 2 - SCALE * 0.20
    
    bldg_poly = [
        [round(bx0, 6), round(by0, 6)],
        [round(bx1, 6), round(by0, 6)],
        [round(bx1, 6), round(by1, 6)],
        [round(bx0, 6), round(by1, 6)],
        [round(bx0, 6), round(by0, 6)]
    ]
    
    building_features.append({
        "type": "Feature",
        "properties": {
            "building_id": f"BLDG-{pid[2:]}",
            "parcel_id": pid,
            "type": item["land_use"],
            "floors": 2 if "Residential" in item["land_use"] else 4,
            "plinth_area": round(item["cad_area"] * 0.48, 1),
            "source": "Municipal Property Tax Registry"
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [bldg_poly]
        }
    })
    
    # 4 Survey corner points for survey_points.csv
    corners = [
        (x0 + dx, y0 + dy),
        (x1_s, y0 + dy),
        (x1_s, y1_s),
        (x0 + dx, y1_s)
    ]
    for idx, (px, py) in enumerate(corners):
        point_counter += 1
        survey_points.append({
            "point_id": f"GNSS-{point_counter}",
            "parcel_ref": pid,
            "latitude": round(py, 7),
            "longitude": round(px, 7),
            "accuracy": round(0.015 + (idx * 0.004), 3),  # 1.5cm - 2.7cm accuracy
            "elevation_m": round(214.5 + idx * 0.3, 2),
            "fix_type": "RTK_FIXED",
            "source": "Survey of India GNSS Base Network",
            "collected_at": "2026-02-14 11:20:00"
        })

# Write cadastral.geojson
with open("backend/data/cadastral.geojson", "w") as f:
    json.dump({
        "type": "FeatureCollection",
        "name": "cadastral_parcels",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": cadastral_features
    }, f, indent=2)

# Write survey_parcels.geojson
with open("backend/data/survey_parcels.geojson", "w") as f:
    json.dump({
        "type": "FeatureCollection",
        "name": "new_survey_parcels",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": survey_features
    }, f, indent=2)

# Write buildings.geojson
with open("backend/data/buildings.geojson", "w") as f:
    json.dump({
        "type": "FeatureCollection",
        "name": "municipal_buildings",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": building_features
    }, f, indent=2)

# Write survey_points.csv
with open("backend/data/survey_points.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["point_id", "parcel_ref", "latitude", "longitude", "accuracy", "elevation_m", "fix_type", "source", "collected_at"])
    writer.writeheader()
    writer.writerows(survey_points)

print(f"Generated {len(cadastral_features)} cadastral parcels, {len(survey_features)} survey parcels, {len(building_features)} buildings, and {len(survey_points)} GNSS points.")
