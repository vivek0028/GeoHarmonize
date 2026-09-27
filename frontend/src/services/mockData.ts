import { DashboardStats, Dataset, Conflict, IntegratedRecord } from '../types';

export const fallbackDashboardStats: DashboardStats = {
  datasets_count: 4,
  parcels_processed: 1248,
  matched_features: 1102,
  conflicts_count: 3,
  low_confidence_count: 34,
  average_confidence: 87.2,
  confidence_distribution: {
    HIGH: 10,
    MEDIUM: 2,
    LOW: 0
  },
  recent_jobs: [
    {
      id: 6,
      dataset_name: 'Cadastral 2026',
      job_type: 'CHANGE_DETECTION',
      status: 'COMPLETED',
      progress: 100,
      started_at: '2026-02-20 11:05:00+00:00',
      completed_at: '2026-02-20 11:06:00+00:00'
    },
    {
      id: 5,
      dataset_name: 'Municipal GIS Buildings',
      job_type: 'ATTRIBUTE_MAPPING',
      status: 'COMPLETED',
      progress: 100,
      started_at: '2026-02-20 11:00:00+00:00',
      completed_at: '2026-02-20 11:01:00+00:00'
    },
    {
      id: 4,
      dataset_name: 'New Survey GNSS 2026',
      job_type: 'TOPOLOGY_VALIDATION',
      status: 'COMPLETED',
      progress: 100,
      started_at: '2026-02-20 10:16:30+00:00',
      completed_at: '2026-02-20 10:17:00+00:00'
    },
    {
      id: 3,
      dataset_name: 'New Survey GNSS 2026',
      job_type: 'SPATIAL_MATCHING',
      status: 'COMPLETED',
      progress: 100,
      started_at: '2026-02-20 10:15:00+00:00',
      completed_at: '2026-02-20 10:16:30+00:00'
    },
    {
      id: 2,
      dataset_name: 'Cadastral 2026',
      job_type: 'CRS_HARMONIZATION',
      status: 'COMPLETED',
      progress: 100,
      started_at: '2026-02-20 09:31:00+00:00',
      completed_at: '2026-02-20 09:32:00+00:00'
    },
    {
      id: 1,
      dataset_name: 'Cadastral 2026',
      job_type: 'VALIDATION',
      status: 'COMPLETED',
      progress: 100,
      started_at: '2026-02-20 09:30:00+00:00',
      completed_at: '2026-02-20 09:31:00+00:00'
    }
  ],
  conflict_summary: {
    TOPOLOGY_ERROR: 2,
    LAND_USE_MISMATCH: 1,
    AREA_MISMATCH: 1
  },
  audit_logs: [
    {
      id: 2,
      user_name: 'Alex Mercer',
      action: 'RESOLVE_CONFLICT_ACCEPT_SURVEY',
      entity: 'Conflict',
      entity_id: 'Conflict-1 (P-101)',
      old_value: '240.0 m² vs 248.0 m²',
      new_value: '248.0 m²',
      created_at: '2026-09-26 17:00:27.417579+00:00'
    },
    {
      id: 1,
      user_name: 'Alex Mercer (GIS Analyst)',
      action: 'INITIAL_HARMONIZATION',
      entity: 'Dataset',
      entity_id: 'Cadastral 2026',
      old_value: 'Raw Ingestion',
      new_value: 'Harmonized to PostGIS EPSG:4326',
      created_at: '2026-09-26 16:44:09.677586+00:00'
    }
  ]
};

export const fallbackDatasets: Dataset[] = [
  {
    id: 1,
    name: 'Cadastral Revenue Map 2026',
    source: 'Revenue Dept (Village Cadastre)',
    type: 'CADASTRAL_MAP',
    file_path: 'backend/app/sample_data/cadastral_revenue_sample.geojson',
    file_format: 'GEOJSON',
    crs: 'EPSG:4326',
    feature_count: 5,
    status: 'VALIDATED',
    created_at: '2026-02-20T09:30:00Z'
  },
  {
    id: 2,
    name: 'High-Precision GNSS Survey 2026',
    source: 'Drone & RTK-GNSS Field Survey',
    type: 'DRONE_SURVEY',
    file_path: 'backend/app/sample_data/survey_gnss_sample.geojson',
    file_format: 'GEOJSON',
    crs: 'EPSG:4326',
    feature_count: 5,
    status: 'CONFLATED',
    created_at: '2026-02-20T10:15:00Z'
  },
  {
    id: 3,
    name: 'Municipal GIS Building Footprints',
    source: 'Urban Planning Authority',
    type: 'MUNICIPAL_GIS',
    file_path: 'backend/app/sample_data/municipal_buildings_sample.geojson',
    file_format: 'GEOJSON',
    crs: 'EPSG:4326',
    feature_count: 6,
    status: 'INGESTED',
    created_at: '2026-02-20T11:00:00Z'
  },
  {
    id: 4,
    name: 'Master Harmonized Cadastre (PostGIS)',
    source: 'GeoHarmonize AI Conflation Pipeline',
    type: 'HARMONIZED_MASTER',
    file_path: 'postgis://geoharmonize/integrated_parcels',
    file_format: 'POSTGIS',
    crs: 'EPSG:4326',
    feature_count: 5,
    status: 'PRODUCTION',
    created_at: '2026-02-20T11:10:00Z'
  }
];

export const fallbackConflicts: Conflict[] = [
  {
    id: 1,
    parcel_id: 'P-101',
    type: 'AREA_DISCREPANCY',
    attribute: 'area',
    source_a: 'Revenue Cadastre',
    value_a: '240.0 m²',
    source_b: 'GNSS Field Survey',
    value_b: '248.0 m²',
    severity: 'MEDIUM',
    status: 'RESOLVED',
    resolution: 'Accepted modern GNSS Survey high-precision boundary (248.0 m²)',
    resolved_at: '2026-09-26T17:00:27Z'
  },
  {
    id: 2,
    parcel_id: 'P-103',
    type: 'TOPOLOGY_ERROR',
    attribute: 'boundary_overlap',
    source_a: 'Cadastral Boundary',
    value_a: 'Overlap with parcel P-102 (3.2 m²)',
    source_b: 'GNSS Survey',
    value_b: 'Clean boundary line',
    severity: 'HIGH',
    status: 'PENDING'
  },
  {
    id: 3,
    parcel_id: 'P-104',
    type: 'LAND_USE_MISMATCH',
    attribute: 'land_use',
    source_a: 'Revenue Record: Agricultural',
    value_a: 'Agricultural',
    source_b: 'Municipal GIS: Residential',
    value_b: 'Residential Zone B',
    severity: 'MEDIUM',
    status: 'PENDING'
  }
];

export const fallbackParcels: IntegratedRecord[] = [
  {
    id: 1,
    parcel_id: 'P-101',
    area: 248.0,
    land_use: 'Residential',
    owner_name: 'Rajesh Kumar Sharma',
    building_count: 1,
    survey_status: 'SURVEYED_RTK',
    spatial_match: 0.94,
    source_agreement: 0.92,
    data_quality: 0.95,
    recency: 0.98,
    confidence_score: 94.6,
    conflict_count: 0,
    status: 'APPROVED',
    geometry: {
      type: 'Polygon',
      coordinates: [[[77.2085, 28.6135], [77.2092, 28.6135], [77.2092, 28.6142], [77.2085, 28.6142], [77.2085, 28.6135]]]
    }
  },
  {
    id: 2,
    parcel_id: 'P-102',
    area: 312.5,
    land_use: 'Commercial',
    owner_name: 'Verma Infrastructure Ltd',
    building_count: 2,
    survey_status: 'SURVEYED_RTK',
    spatial_match: 0.91,
    source_agreement: 0.88,
    data_quality: 0.92,
    recency: 0.95,
    confidence_score: 91.2,
    conflict_count: 0,
    status: 'APPROVED',
    geometry: {
      type: 'Polygon',
      coordinates: [[[77.2093, 28.6135], [77.2101, 28.6135], [77.2101, 28.6142], [77.2093, 28.6142], [77.2093, 28.6135]]]
    }
  },
  {
    id: 3,
    parcel_id: 'P-103',
    area: 185.0,
    land_use: 'Residential',
    owner_name: 'Sunita Devi',
    building_count: 1,
    survey_status: 'SURVEY_FLAGGED',
    spatial_match: 0.81,
    source_agreement: 0.76,
    data_quality: 0.85,
    recency: 0.90,
    confidence_score: 82.4,
    conflict_count: 1,
    status: 'PENDING_REVIEW',
    geometry: {
      type: 'Polygon',
      coordinates: [[[77.2085, 28.6143], [77.2092, 28.6143], [77.2092, 28.6149], [77.2085, 28.6149], [77.2085, 28.6143]]]
    }
  },
  {
    id: 4,
    parcel_id: 'P-104',
    area: 420.0,
    land_use: 'Mixed Use',
    owner_name: 'Anil Gupta',
    building_count: 1,
    survey_status: 'CADASTRE_ONLY',
    spatial_match: 0.79,
    source_agreement: 0.72,
    data_quality: 0.80,
    recency: 0.75,
    confidence_score: 76.5,
    conflict_count: 1,
    status: 'PENDING_REVIEW',
    geometry: {
      type: 'Polygon',
      coordinates: [[[77.2093, 28.6143], [77.2102, 28.6143], [77.2102, 28.6151], [77.2093, 28.6151], [77.2093, 28.6143]]]
    }
  },
  {
    id: 5,
    parcel_id: 'P-105',
    area: 550.0,
    land_use: 'Public Utility / Park',
    owner_name: 'Municipal Corporation',
    building_count: 0,
    survey_status: 'VERIFIED',
    spatial_match: 0.96,
    source_agreement: 0.95,
    data_quality: 0.98,
    recency: 0.98,
    confidence_score: 96.8,
    conflict_count: 0,
    status: 'APPROVED',
    geometry: {
      type: 'Polygon',
      coordinates: [[[77.2085, 28.6150], [77.2102, 28.6150], [77.2102, 28.6158], [77.2085, 28.6158], [77.2085, 28.6150]]]
    }
  }
];

export const fallbackMapLayers = {
  cadastral: {
    type: 'FeatureCollection',
    features: fallbackParcels.map(p => ({
      type: 'Feature',
      properties: {
        parcel_id: p.parcel_id,
        area: p.area,
        land_use: p.land_use,
        layer: 'cadastral'
      },
      geometry: p.geometry
    }))
  },
  survey: {
    type: 'FeatureCollection',
    features: fallbackParcels.map(p => ({
      type: 'Feature',
      properties: {
        parcel_id: p.parcel_id,
        area: p.area * 1.02,
        layer: 'survey'
      },
      geometry: p.geometry
    }))
  },
  municipal: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { building_id: 'B-101', levels: 2, layer: 'municipal' },
        geometry: {
          type: 'Polygon',
          coordinates: [[[77.2087, 28.6137], [77.2090, 28.6137], [77.2090, 28.6140], [77.2087, 28.6140], [77.2087, 28.6137]]]
        }
      },
      {
        type: 'Feature',
        properties: { building_id: 'B-102', levels: 3, layer: 'municipal' },
        geometry: {
          type: 'Polygon',
          coordinates: [[[77.2095, 28.6137], [77.2099, 28.6137], [77.2099, 28.6140], [77.2095, 28.6140], [77.2095, 28.6137]]]
        }
      }
    ]
  },
  harmonized: {
    type: 'FeatureCollection',
    features: fallbackParcels.map(p => ({
      type: 'Feature',
      properties: {
        parcel_id: p.parcel_id,
        confidence_score: p.confidence_score,
        status: p.status,
        layer: 'harmonized'
      },
      geometry: p.geometry
    }))
  }
};
