# GeoHarmonize
> **One Map. Multiple Sources. Trusted Land Records.**

GeoHarmonize is an AI-assisted and deterministic GIS prototype for multi-source cadastral harmonization, topology validation, and conflict resolution. It integrates historical revenue records, modern GNSS/drone surveys, municipal property footprints, and geodetic control points into a single verified land record.

---

## Architecture Overview

```
                      React + TypeScript Frontend (Tailwind + Leaflet)
                                           │
                                           │ REST API (JSON)
                                           ▼
                                    FastAPI Backend
                                           │
                      ┌────────────────────┼────────────────────┐
                      ▼                    ▼                    ▼
                 GIS Engine           AI/ML Engine             Auth
                      │                    │                    │
                  GeoPandas            PyTorch /             JWT Auth
                   Shapely            scikit-learn
                    GDAL
                   PyProj
                      │                    │
                      └────────────────────┘
                                 │
                                 ▼
                     PostgreSQL + PostGIS / SQLite
                                 │
                                 ▼
                      Integrated Land Records
                                 │
                      ┌──────────┴──────────┐
                      ▼                     ▼
                 Web GIS Map             Reports
```

---

## Prototype Dataset Scope

1. **Dataset 1 — Historical Cadastre (`cadastral.geojson`)**
   - Features: `parcel_id`, `geometry`, `area`, `land_use`, `owner_name`, `registration_year`
2. **Dataset 2 — Drone / GNSS Survey (`survey_parcels.geojson`)**
   - Features: `survey_id`, `matched_parcel_ref`, `geometry`, `area`, `survey_agency`, `equipment`
3. **Dataset 3 — Municipal GIS Buildings (`buildings.geojson`)**
   - Features: `building_id`, `parcel_id`, `geometry`, `type`, `floors`, `plinth_area`
4. **Dataset 4 — Geodetic GNSS Points (`survey_points.csv`)**
   - Features: `point_id`, `latitude`, `longitude`, `accuracy` (±0.015m RTK fixed), `elevation_m`

---

## Core Implemented Modules

| Module | Feature | Implementation Details |
|---|---|---|
| **Module 1** | **Authentication & Roles** | JWT-secured API, Admin & GIS Analyst roles with quick-switch selector in Header. |
| **Module 2** | **Executive Dashboard** | Key metrics (Datasets, Parcels, Matched, Conflicts, Confidence), pipeline status, jobs table. |
| **Module 3** | **Dataset Management** | Drag & drop ingestion (GeoJSON, CSV, Shapefile, GeoTIFF) with instant metadata indexing. |
| **Module 4** | **Data Validation** | Automated checking of file readability, geometry validity (no self-intersections), CRS, missing fields. |
| **Module 5** | **Harmonization Engine** | PyProj CRS transformation to EPSG:4326 (WGS84) & schema attribute mapping. |
| **Module 6** | **AI Spatial Feature Matching** | Pairwise geometric feature extraction (IoU, compactness, aspect ratio, centroid proximity) returning spatial similarity (94%), area similarity (91%), position similarity (96%), and match confidence. |
| **Module 7** | **Deterministic GIS Topology** | Exact Shapely algorithms detecting overlaps, sliver gaps, self-intersections, and invalid geometries. |
| **Module 8** | **Attribute Mapping** | Standardizes `parcel_no`, `plot_id`, `survey_id` -> `parcel_id` and property ownership fields. |
| **Module 9** | **Conflict Detection** | Identifies `AREA_MISMATCH`, `BOUNDARY_MISMATCH`, `LAND_USE_MISMATCH`, `TOPOLOGY_ERROR`. |
| **Module 10** | **Conflict Resolution** | Adjudication actions (`Accept Survey`, `Accept Cadastral`, `Accept Municipal`, `Manual Edit`, `Request Survey`, `Defer`) with audit logging. |
| **Module 11** | **Multi-Factor Confidence** | Explainable scoring: Spatial Match (35%) + Source Agreement (25%) + Quality (25%) + Recency (15%) -> Overall Confidence %. |
| **Module 12** | **Interactive Web-GIS Map** | Fullscreen Leaflet map with Cadastral, Survey, Buildings, GNSS Points, Harmonized Records, and Conflict Overlays. Basemap switcher (Light, Satellite, Streets). |
| **Module 13** | **Integrated Land Record Drawer** | Click parcel to inspect harmonized attributes, contributing authorities, AI match score, and 1-click approval. |
| **Module 14** | **Change Detection** | Spatio-temporal diff engine comparing historical cadastre vs harmonized layer (area shifts, boundary offsets, attribute changes). |
| **Module 15** | **Reports & Export** | One-click export of GeoJSON layer, CSV parcel registers, and conflict audit spreadsheets. |

---

## What is Actually AI vs. Deterministic GIS?

- **AI / ML**: Spatial Feature Matching & Conflation (similarity classification based on geometric embeddings and IoU).
- **Deterministic GIS**: CRS transformation, intersection calculations, area calculations, metric transformations, topology overlaps, slivers, and change detection.
- **Rule Engine**: Precedence resolution, conflict thresholds, adjudication workflows.
- **Confidence Engine**: Multi-factor weighted evidence scoring.

---

## Running Locally

### 1. Backend (FastAPI + Python GIS)
```bash
# Activate virtual environment
source .venv/bin/activate

# Start API server on port 8000
PYTHONPATH=backend uvicorn app.main:app --host 127.0.0.1 --port 8000
```
- API Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Health Check: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

### 2. Frontend (React + Vite + Tailwind + Leaflet)
```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```
- Web Application: [http://127.0.0.1:5173](http://127.0.0.1:5173)

### 3. Demo Credentials
- **GIS Analyst**: `analyst@geoharmonize.gov` / `analyst123`
- **Administrator**: `admin@geoharmonize.gov` / `admin123`
