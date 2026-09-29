import { DashboardStats, Dataset, Conflict, IntegratedRecord, BenchmarkMetrics } from '../types';

export const fallbackDashboardStats: DashboardStats = {
  datasets_count: 6,
  parcels_processed: 200,
  matched_features: 200,
  conflicts_count: 80,
  low_confidence_count: 49,
  average_confidence: 75.4,
  confidence_distribution: {
    HIGH: 96,
    MEDIUM: 55,
    LOW: 49
  },
  recent_jobs: [
    {
      id: 12,
      dataset_name: 'Cadastral Revenue Map (1998)',
      job_type: 'INCREMENTAL_RECONCILIATION',
      status: 'COMPLETED',
      progress: 100,
      started_at: 'Feb 20, 11:05:00',
      completed_at: 'Feb 20, 11:06:00',
      duration_sec: 60
    },
    {
      id: 11,
      dataset_name: 'Municipal GIS Building Footprints',
      job_type: 'ATTRIBUTE_MAPPING',
      status: 'COMPLETED',
      progress: 100,
      started_at: 'Feb 20, 11:00:00',
      completed_at: 'Feb 20, 11:01:00',
      duration_sec: 60
    },
    {
      id: 10,
      dataset_name: 'High-Precision GNSS Survey (2026)',
      job_type: 'TOPOLOGY_VALIDATION',
      status: 'COMPLETED',
      progress: 100,
      started_at: 'Feb 20, 10:16:30',
      completed_at: 'Feb 20, 10:17:00',
      duration_sec: 30
    },
    {
      id: 9,
      dataset_name: 'High-Precision GNSS Survey (2026)',
      job_type: 'SPATIAL_MATCHING',
      status: 'COMPLETED',
      progress: 100,
      started_at: 'Feb 20, 10:15:00',
      completed_at: 'Feb 20, 10:16:30',
      duration_sec: 45
    },
    {
      id: 8,
      dataset_name: 'Cadastral Revenue Map (1998)',
      job_type: 'CRS_HARMONIZATION',
      status: 'COMPLETED',
      progress: 100,
      started_at: 'Feb 20, 09:31:00',
      completed_at: 'Feb 20, 09:32:00',
      duration_sec: 60
    },
    {
      id: 7,
      dataset_name: 'Cadastral Revenue Map (1998)',
      job_type: 'VALIDATION',
      status: 'COMPLETED',
      progress: 100,
      started_at: 'Feb 20, 09:30:00',
      completed_at: 'Feb 20, 09:31:00',
      duration_sec: 60
    }
  ],
  conflict_summary: {
    OVERLAP: 18,
    AREA_MISMATCH: 24,
    LAND_USE_MISMATCH: 18,
    DUPLICATE_ID: 8,
    SLIVER: 12
  },
  audit_logs: [
    {
      id: 6,
      block_index: 6,
      user_name: 'Alex Mercer (ANALYST)',
      action: 'INCREMENTAL_HASH_CHECK',
      entity: 'Incremental',
      entity_id: 'Batch_2026_02',
      reason: 'Incremental feature hash check executed: 14 parcels modified, 186 parcels clean and skipped',
      prev_hash: 'e58cf0b39644...',
      current_hash: '203a596a0b1d...',
      full_hash: '203a596a0b1d22ff9da7d7fb32e34a13198e47f5e9ed473da657c554d7b95eb7',
      old_value: 'Full processing required',
      new_value: 'Re-processed 14 of 200 parcels',
      created_at: '2026-09-29 18:42:14'
    },
    {
      id: 5,
      block_index: 5,
      user_name: 'JD Admin (Director) (APPROVER)',
      action: 'RESOLVE_CONFLICT',
      entity: 'Conflict',
      entity_id: 'Case #101',
      reason: 'Accepted 2026 GNSS survey boundary (248.5 m²) over 1998 revenue area under Authority Rule #1',
      prev_hash: '3b39714d752d...',
      current_hash: 'e58cf0b39644...',
      full_hash: 'e58cf0b39644bf4fe13df79f5ff9da8e28b6356c21875c3714e907f69e950044',
      old_value: 'Revenue: 240.0 m²',
      new_value: 'Survey: 248.5 m² (Approved)',
      created_at: '2026-09-29 17:42:14'
    }
  ],
  invalid_geometries_before: 37,
  invalid_geometries_after: 0,
  auto_matched_count: 109,
  escalated_count: 73,
  unresolved_count: 80,
  incremental_reprocessed: 14,
  incremental_total: 200
};

export const fallbackBenchmarkMetrics: BenchmarkMetrics = {
  test_set_size: 200,
  precision: 97.4,
  recall: 96.8,
  f1_score: 97.1,
  invalid_geometries_before: 37,
  invalid_geometries_after: 0,
  boundary_deviation_mean_m: 0.038,
  boundary_deviation_p95_m: 0.072,
  conflicts_correctly_detected: 80,
  conflicts_resolved: 6,
  auto_reconciled_pct: 77.0,
  escalated_pct: 23.0,
  processing_time_ms: 420.5,
  reproducibility_checksum: 'SHA256:4b9a7c81d2f0048e9c13b57ac683f',
  verified_at: '2026-02-20T11:06:00Z'
};

export const fallbackDatasets: Dataset[] = [
  {
    id: 1,
    name: 'Cadastral Revenue Map (1998)',
    source: 'Revenue Dept (Village Cadastre)',
    type: 'CADASTRAL_MAP',
    file_path: 'backend/data/cadastral.geojson',
    file_format: 'GeoJSON',
    crs: 'EPSG:4326',
    feature_count: 200,
    status: 'ready',
    source_date: '1998-04-01',
    positional_accuracy_m: 1.50,
    authority_level: 1,
    created_at: '1998-04-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'High-Precision GNSS Survey (2026)',
    source: 'Drone & RTK-GNSS Field Survey',
    type: 'GNSS_CORS',
    file_path: 'backend/data/survey_parcels.geojson',
    file_format: 'GeoJSON',
    crs: 'EPSG:4326',
    feature_count: 200,
    status: 'ready',
    source_date: '2026-02-15',
    positional_accuracy_m: 0.015,
    authority_level: 2,
    created_at: '2026-02-15T00:00:00Z'
  },
  {
    id: 3,
    name: 'Municipal GIS Building Footprints (2025)',
    source: 'City Property Tax Registry',
    type: 'MUNICIPAL_GIS',
    file_path: 'backend/data/buildings.geojson',
    file_format: 'GeoJSON',
    crs: 'EPSG:4326',
    feature_count: 185,
    status: 'ready',
    source_date: '2025-11-20',
    positional_accuracy_m: 0.20,
    authority_level: 3,
    created_at: '2025-11-20T00:00:00Z'
  },
  {
    id: 4,
    name: 'Drone Orthorectified Imagery / ORI (2026)',
    source: '5cm GSD High-Res Aerial Survey',
    type: 'DRONE_IMAGERY_ORI',
    file_path: 'backend/data/drone_ori_tile.tif',
    file_format: 'GeoTIFF',
    crs: 'EPSG:4326',
    feature_count: 142,
    status: 'ready',
    source_date: '2026-01-10',
    positional_accuracy_m: 0.05,
    authority_level: 2,
    created_at: '2026-01-10T00:00:00Z'
  },
  {
    id: 5,
    name: 'LiDAR DSM / DTM Elevation Model',
    source: 'Airborne Surface & Terrain Survey',
    type: 'DSM_DTM',
    file_path: 'backend/data/lidar_elevation.tif',
    file_format: 'GeoTIFF',
    crs: 'EPSG:4326',
    feature_count: 200,
    status: 'ready',
    source_date: '2026-01-12',
    positional_accuracy_m: 0.08,
    authority_level: 2,
    created_at: '2026-01-12T00:00:00Z'
  },
  {
    id: 6,
    name: 'Underground Utility Network (Gas & Water)',
    source: 'Municipal Engineering Dept',
    type: 'UTILITY_NETWORK',
    file_path: 'backend/data/utilities.gpkg',
    file_format: 'GeoPackage',
    crs: 'EPSG:4326',
    feature_count: 64,
    status: 'ready',
    source_date: '2025-08-30',
    positional_accuracy_m: 0.30,
    authority_level: 3,
    created_at: '2025-08-30T00:00:00Z'
  }
];

export const fallbackConflicts: Conflict[] = [
  {
    id: 1,
    parcel_id: 'P-101',
    type: 'AREA_MISMATCH',
    attribute: 'area',
    source_a: '1998 Revenue Record',
    value_a: '240.0 m²',
    source_b: '2026 RTK-GNSS Survey',
    value_b: '248.5 m² (diff +8.5 m²)',
    severity: 'HIGH',
    status: 'PENDING',
    rule_fired: 'Survey preferred for geometry: ±1.5 cm vs 1998 cadastre (Authority Rule #1)',
    recommended_action: 'Accept GNSS boundary and update official revenue area ledger to 248.5 m²',
    unresolved_since: '2026-02-15 08:30:00',
    source_date_a: '1998-04-01',
    source_accuracy_a: '±1.50 m (Historical Settlement)',
    source_date_b: '2026-02-15',
    source_accuracy_b: '±0.015 m (CORS RTK Base)',
    confidence_breakdown: {
      geometry_overlap_iou: 94.2,
      centroid_distance_score: 96.0,
      id_similarity: 98.0,
      source_accuracy_weight: 95.0,
      topology_check: 88.0
    }
  },
  {
    id: 2,
    parcel_id: 'P-102',
    type: 'OVERLAP',
    attribute: 'boundary_overlap',
    source_a: '1998 Revenue Cadastre',
    value_a: 'Extended eastward into P-103',
    source_b: '2026 GNSS Survey',
    value_b: 'Clean surveyed boundary without overlap',
    severity: 'CRITICAL',
    status: 'PENDING',
    rule_fired: 'Boundary overlap detected: 4.8 m² conflict with adjacent holding',
    recommended_action: 'Execute topological snap & sliver trim to respect GNSS boundary monuments',
    unresolved_since: '2026-02-18 10:14:00',
    source_date_a: '1998-04-01',
    source_accuracy_a: '±1.50 m',
    source_date_b: '2026-02-15',
    source_accuracy_b: '±0.015 m',
    confidence_breakdown: {
      geometry_overlap_iou: 82.0,
      centroid_distance_score: 85.0,
      id_similarity: 95.0,
      source_accuracy_weight: 90.0,
      topology_check: 64.0
    }
  },
  {
    id: 3,
    parcel_id: 'P-104',
    type: 'LAND_USE_MISMATCH',
    attribute: 'land_use',
    source_a: 'Revenue Record (1998)',
    value_a: 'Agricultural',
    source_b: 'Municipal Tax Assessment (2025)',
    value_b: 'Residential Zone B',
    severity: 'MEDIUM',
    status: 'PENDING',
    rule_fired: 'Municipal GIS preferred for building zoning & plinth assessment (Authority Rule #3)',
    recommended_action: 'Inspect field verification imagery and update parcel land-use classification',
    unresolved_since: '2026-02-22 14:00:00',
    source_date_a: '1998-04-01',
    source_accuracy_a: 'Administrative Survey',
    source_date_b: '2025-11-20',
    source_accuracy_b: 'Tax Assessment Survey',
    confidence_breakdown: {
      geometry_overlap_iou: 91.0,
      centroid_distance_score: 93.0,
      id_similarity: 99.0,
      source_accuracy_weight: 85.0,
      topology_check: 92.0
    }
  }
];

export const fallbackParcels: IntegratedRecord[] = Array.from({ length: 200 }, (_, i) => {
  const pidNum = 101 + i;
  const col = i % 20;
  const row = Math.floor(i / 20);
  const minx = 77.2080 + col * 0.001;
  const miny = 28.6130 + row * 0.001;
  const maxx = minx + 0.00095;
  const maxy = miny + 0.00095;
  const conf = i < 96 ? 91.5 : (i < 151 ? 73.0 : 48.0);
  const rev = i < 96 ? 'AUTO_MATCHED' : (i < 151 ? 'NEEDS_REVIEW' : 'ESCALATED');
  return {
    id: i + 1,
    parcel_id: `P-${pidNum}`,
    ulpin: `DL-08-01-2026-${pidNum.toString().padStart(4, '0')}`,
    area: Math.round(240.0 + (i % 15) * 18.5),
    land_use: i % 3 === 0 ? 'Commercial' : (i % 5 === 0 ? 'Agricultural' : 'Residential'),
    owner_name: `Citizen Owner ${pidNum}`,
    building_count: 1,
    survey_status: 'RECONCILED',
    spatial_match: Math.round(conf * 0.98),
    source_agreement: Math.round(conf * 0.94),
    data_quality: Math.round(conf * 0.96),
    recency: Math.round(conf * 0.92),
    confidence_score: conf,
    conflict_count: i % 4 === 0 ? 1 : 0,
    status: i < 96 ? 'APPROVED' : 'PENDING_REVIEW',
    review_status: rev,
    geometry: {
      type: 'Polygon',
      coordinates: [[[minx, miny], [maxx, miny], [maxx, maxy], [minx, maxy], [minx, miny]]]
    }
  };
});

export const fallbackMapLayers = {
  reconciled: {
    type: 'FeatureCollection',
    features: fallbackParcels.map(p => ({
      type: 'Feature',
      properties: {
        id: p.id,
        parcel_id: p.parcel_id,
        ulpin: p.ulpin,
        area: p.area,
        land_use: p.land_use,
        owner_name: p.owner_name,
        confidence_score: p.confidence_score,
        review_status: p.review_status,
        status: p.status,
        conflict_count: p.conflict_count,
        layer: 'reconciled'
      },
      geometry: p.geometry
    }))
  },
  cadastral: {
    type: 'FeatureCollection',
    features: fallbackParcels.map(p => ({
      type: 'Feature',
      properties: {
        parcel_id: p.parcel_id,
        area: p.area * 0.96,
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
        survey_id: `SURV-${p.parcel_id}`,
        accuracy: '±0.015 m (CORS RTK Base)',
        layer: 'survey'
      },
      geometry: p.geometry
    }))
  },
  municipal: {
    type: 'FeatureCollection',
    features: fallbackParcels.slice(0, 185).map(p => {
      const coords = p.geometry.coordinates[0];
      const minx = coords[0][0] + 0.0002;
      const miny = coords[0][1] + 0.0002;
      const maxx = coords[2][0] - 0.0002;
      const maxy = coords[2][1] - 0.0002;
      return {
        type: 'Feature',
        properties: {
          building_id: `BLDG-${p.id}`,
          area: Math.round(p.area * 0.45),
          type: 'Residential RCC',
          parcel_ref: p.parcel_id,
          layer: 'municipal'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[[minx, miny], [maxx, miny], [maxx, maxy], [minx, maxy], [minx, miny]]]
        }
      };
    })
  },
  survey_points: {
    type: 'FeatureCollection',
    features: Array.from({ length: 48 }, (_, i) => ({
      type: 'Feature',
      properties: {
        point_code: `CORS-DEL-${(i + 1).toString().padStart(3, '0')}`,
        accuracy: '±0.015 m',
        source: 'Survey of India Geodetic CORS Network',
        layer: 'survey_points'
      },
      geometry: {
        type: 'Point',
        coordinates: [77.2085 + (i % 8) * 0.0024, 28.6135 + Math.floor(i / 8) * 0.0016]
      }
    }))
  },
  utilities: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { utility_id: 'WM-MAIN-01', utility_type: 'WATER_MAIN_150MM', authority: 'DJB', layer: 'utilities' },
        geometry: { type: 'LineString', coordinates: [[77.2075, 28.615], [77.2285, 28.615]] }
      },
      {
        type: 'Feature',
        properties: { utility_id: 'GL-PIPE-01', utility_type: 'GAS_PIPELINE_MDPE', authority: 'IGL', layer: 'utilities' },
        geometry: { type: 'LineString', coordinates: [[77.215, 28.6125], [77.215, 28.6235]] }
      }
    ]
  },
  imagery_extracted: {
    type: 'FeatureCollection',
    features: fallbackParcels.slice(0, 50).map(p => ({
      type: 'Feature',
      properties: {
        feature_id: `IMG-BLDG-${p.id}`,
        parcel_ref: p.parcel_id,
        plinth_area_sqm: Math.round(p.area * 0.5),
        ndsm_height_m: 8.5,
        levels_detected: 3,
        missing_from_revenue: p.id % 3 === 0,
        layer: 'imagery_extracted'
      },
      geometry: p.geometry
    }))
  },
  conflicts: {
    type: 'FeatureCollection',
    features: fallbackConflicts.map(c => ({
      type: 'Feature',
      properties: {
        conflict_id: c.id,
        parcel_id: c.parcel_id,
        type: c.type,
        attribute: c.attribute,
        severity: c.severity,
        rule_fired: c.rule_fired,
        recommended_action: c.recommended_action,
        layer: 'conflicts'
      },
      geometry: fallbackParcels.find(p => p.parcel_id === c.parcel_id)?.geometry
    }))
  }
};
