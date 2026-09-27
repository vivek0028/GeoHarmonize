import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Layers,
  Search,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  FileCheck,
  ShieldCheck,
  Building,
  MapPin,
  ChevronRight,
  X,
  Maximize2,
  Sliders,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { Conflict, IntegratedRecord } from '../types';

interface MapViewProps {
  mapLayersData: any;
  selectedParcelId: string | null;
  onSelectParcel: (id: string | null) => void;
  onNavigateReview: (conflictId?: number) => void;
  apiClient: any;
}

export const MapView: React.FC<MapViewProps> = ({
  mapLayersData,
  selectedParcelId,
  onSelectParcel,
  onNavigateReview,
  apiClient
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupsRef = useRef<{ [key: string]: L.LayerGroup }>({});

  const [activeLayers, setActiveLayers] = useState({
    integrated: true,
    cadastral: true,
    survey: true,
    buildings: true,
    points: true,
    conflicts: true
  });

  const [opacity, setOpacity] = useState(0.85);
  const [basemap, setBasemap] = useState<'osm' | 'light' | 'satellite'>('light');
  const [activeTileLayer, setActiveTileLayer] = useState<L.TileLayer | null>(null);
  const [parcelDetail, setParcelDetail] = useState<any | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(true);

  // Basemap URLs
  const basemaps = {
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Centered around sample ward (Lat: 28.6235, Lon: 77.2170)
    const map = L.map(mapContainerRef.current, {
      center: [28.6235, 77.2170],
      zoom: 16,
      zoomControl: false,
      attributionControl: false
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    const tile = L.tileLayer(basemaps[basemap], {
      maxZoom: 20
    }).addTo(map);

    setActiveTileLayer(tile);
    mapInstanceRef.current = map;

    // Initialize layer groups
    layerGroupsRef.current = {
      cadastral: L.layerGroup().addTo(map),
      survey: L.layerGroup().addTo(map),
      buildings: L.layerGroup().addTo(map),
      points: L.layerGroup().addTo(map),
      integrated: L.layerGroup().addTo(map),
      conflicts: L.layerGroup().addTo(map)
    };

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Basemap tile layer
  useEffect(() => {
    if (!mapInstanceRef.current || !activeTileLayer) return;
    activeTileLayer.setUrl(basemaps[basemap]);
  }, [basemap]);

  // Load and Render Layers
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLayersData) return;

    const { cadastral, survey, buildings, points, integrated, conflicts } = mapLayersData;
    const groups = layerGroupsRef.current;

    // 1. Cadastral Layer (Historical Blue Outlines)
    if (groups.cadastral) {
      groups.cadastral.clearLayers();
      if (activeLayers.cadastral && cadastral?.features) {
        L.geoJSON(cadastral, {
          style: {
            color: '#2563eb',
            weight: 2,
            dashArray: '4, 4',
            fillColor: '#3b82f6',
            fillOpacity: 0.12 * opacity
          },
          onEachFeature: (feature, layer) => {
            const pid = feature.properties.parcel_id || feature.properties.parcel_no;
            layer.bindTooltip(`Cadastral: ${pid} (${feature.properties.area} m²)`, {
              className: 'custom-leaflet-tooltip'
            });
            layer.on('click', () => onSelectParcel(pid));
          }
        }).addTo(groups.cadastral);
      }
    }

    // 2. Survey Layer (Modern Drone/GNSS Emerald Boundary)
    if (groups.survey) {
      groups.survey.clearLayers();
      if (activeLayers.survey && survey?.features) {
        L.geoJSON(survey, {
          style: {
            color: '#059669',
            weight: 2.5,
            fillColor: '#10b981',
            fillOpacity: 0.18 * opacity
          },
          onEachFeature: (feature, layer) => {
            const sid = feature.properties.survey_id;
            const ref = feature.properties.matched_parcel_ref;
            layer.bindTooltip(`Survey: ${sid} -> Ref ${ref}`, {
              className: 'custom-leaflet-tooltip'
            });
            layer.on('click', () => onSelectParcel(ref));
          }
        }).addTo(groups.survey);
      }
    }

    // 3. Buildings Footprint (Municipal Slate Polygons)
    if (groups.buildings) {
      groups.buildings.clearLayers();
      if (activeLayers.buildings && buildings?.features) {
        L.geoJSON(buildings, {
          style: {
            color: '#475569',
            weight: 1.5,
            fillColor: '#64748b',
            fillOpacity: 0.55 * opacity
          },
          onEachFeature: (feature, layer) => {
            const bid = feature.properties.building_id;
            layer.bindTooltip(`Building: ${bid} (${feature.properties.type})`, {
              className: 'custom-leaflet-tooltip'
            });
          }
        }).addTo(groups.buildings);
      }
    }

    // 4. GNSS Points (Precision RTK Markers)
    if (groups.points) {
      groups.points.clearLayers();
      if (activeLayers.points && points?.features) {
        L.geoJSON(points, {
          pointToLayer: (feature, latlng) => {
            return L.circleMarker(latlng, {
              radius: 4,
              color: '#d97706',
              weight: 1.5,
              fillColor: '#f59e0b',
              fillOpacity: 0.9
            });
          },
          onEachFeature: (feature, layer) => {
            const pt = feature.properties;
            layer.bindTooltip(`GNSS ${pt.point_id}: &plusmn;${pt.accuracy}m`, {
              className: 'custom-leaflet-tooltip'
            });
          }
        }).addTo(groups.points);
      }
    }

    // 5. Integrated Harmonized Parcels (Golden Truth Line)
    if (groups.integrated) {
      groups.integrated.clearLayers();
      if (activeLayers.integrated && integrated?.features) {
        L.geoJSON(integrated, {
          style: (feature) => {
            const isSelected = feature?.properties?.parcel_id === selectedParcelId;
            return {
              color: isSelected ? '#10b981' : '#0f172a',
              weight: isSelected ? 3.5 : 2,
              fillColor: isSelected ? '#34d399' : '#e2e8f0',
              fillOpacity: isSelected ? 0.45 : 0.15 * opacity
            };
          },
          onEachFeature: (feature, layer) => {
            const pid = feature.properties.parcel_id;
            layer.bindTooltip(`Harmonized Parcel ${pid}`, {
              className: 'custom-leaflet-tooltip'
            });
            layer.on('click', () => onSelectParcel(pid));
          }
        }).addTo(groups.integrated);
      }
    }

    // 6. Conflicts Highlights (Pulsing Amber/Red Overlays)
    if (groups.conflicts) {
      groups.conflicts.clearLayers();
      if (activeLayers.conflicts && conflicts?.features) {
        conflicts.features.forEach((feat: any) => {
          if (!feat.geometry) return;
          const layer = L.geoJSON(feat.geometry, {
            style: {
              color: '#ef4444',
              weight: 3,
              dashArray: '5, 5',
              fillColor: '#f87171',
              fillOpacity: 0.35
            }
          });

          // Add animated warning marker at centroid
          const bounds = layer.getBounds();
          const center = bounds.getCenter();
          const icon = L.divIcon({
            className: 'conflict-icon-marker',
            html: `<div class="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-[10px] shadow-lg animate-conflict ring-4 ring-rose-300">!</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          const marker = L.marker(center, { icon });
          marker.bindTooltip(`Conflict on ${feat.properties.parcel_id}: ${feat.properties.type}`, {
            className: 'custom-leaflet-tooltip'
          });
          marker.on('click', () => {
            onSelectParcel(feat.properties.parcel_id);
          });

          layer.addTo(groups.conflicts);
          marker.addTo(groups.conflicts);
        });
      }
    }
  }, [mapLayersData, activeLayers, opacity, selectedParcelId]);

  // Fetch Parcel Details when selected
  useEffect(() => {
    if (!selectedParcelId) {
      setParcelDetail(null);
      return;
    }
    setIsDetailLoading(true);
    apiClient
      .getParcelDetail(selectedParcelId)
      .then((data: any) => {
        setParcelDetail(data);
        // Fly to parcel bounds
        if (mapInstanceRef.current && data.geometry) {
          const l = L.geoJSON(data.geometry);
          mapInstanceRef.current.flyToBounds(l.getBounds(), {
            padding: [100, 100],
            maxZoom: 18,
            duration: 1.2
          });
        }
      })
      .catch((err: any) => console.error(err))
      .finally(() => setIsDetailLoading(false));
  }, [selectedParcelId]);

  const handleApproveParcel = async () => {
    if (!selectedParcelId) return;
    try {
      await apiClient.approveParcel(selectedParcelId);
      // Refresh parcel detail
      const updated = await apiClient.getParcelDetail(selectedParcelId);
      setParcelDetail(updated);
    } catch (err: any) {
      alert('Error approving parcel: ' + err.message);
    }
  };

  const toggleLayer = (layerName: keyof typeof activeLayers) => {
    setActiveLayers((prev) => ({ ...prev, [layerName]: !prev[layerName] }));
  };

  return (
    <div className="relative w-full h-[calc(100vh-65px)] overflow-hidden bg-slate-100">
      {/* Leaflet Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Layer Control Panel (PRD Section 40) */}
      <div className="absolute top-4 left-4 z-20 w-64 max-w-[calc(100vw-32px)]">
        <div className="glass-card rounded-2xl p-4 shadow-xl border border-slate-200/80 transition-all">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Map Layers
              </span>
            </div>
            <button
              onClick={() => setShowLayerPanel(!showLayerPanel)}
              className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              {showLayerPanel ? 'Collapse' : 'Expand'}
            </button>
          </div>

          {showLayerPanel && (
            <div className="mt-3 space-y-2.5">
              {/* Layer checkboxes */}
              <label className="flex items-center justify-between text-xs text-slate-700 hover:bg-slate-50 p-1 rounded-lg cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
                  Integrated Land Record
                </span>
                <input
                  type="checkbox"
                  checked={activeLayers.integrated}
                  onChange={() => toggleLayer('integrated')}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-slate-700 hover:bg-slate-50 p-1 rounded-lg cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-600 border border-dashed"></span>
                  Cadastral (1998)
                </span>
                <input
                  type="checkbox"
                  checked={activeLayers.cadastral}
                  onChange={() => toggleLayer('cadastral')}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-slate-700 hover:bg-slate-50 p-1 rounded-lg cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  Survey (Drone/GNSS 2026)
                </span>
                <input
                  type="checkbox"
                  checked={activeLayers.survey}
                  onChange={() => toggleLayer('survey')}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-slate-700 hover:bg-slate-50 p-1 rounded-lg cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-600"></span>
                  Building Footprints
                </span>
                <input
                  type="checkbox"
                  checked={activeLayers.buildings}
                  onChange={() => toggleLayer('buildings')}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-slate-700 hover:bg-slate-50 p-1 rounded-lg cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  GNSS Control Points
                </span>
                <input
                  type="checkbox"
                  checked={activeLayers.points}
                  onChange={() => toggleLayer('points')}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-rose-700 font-semibold hover:bg-rose-50 p-1 rounded-lg cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse"></span>
                  Conflicts &amp; Overlaps
                </span>
                <input
                  type="checkbox"
                  checked={activeLayers.conflicts}
                  onChange={() => toggleLayer('conflicts')}
                  className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
              </label>

              {/* Opacity & Basemap Switcher */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Layer Opacity</span>
                  <span className="font-mono">{Math.round(opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                />

                <div className="flex gap-1 pt-1">
                  <button
                    onClick={() => setBasemap('light')}
                    className={`flex-1 py-1 text-[10px] font-semibold rounded-md border transition-all cursor-pointer ${
                      basemap === 'light'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Clean Light
                  </button>
                  <button
                    onClick={() => setBasemap('satellite')}
                    className={`flex-1 py-1 text-[10px] font-semibold rounded-md border transition-all cursor-pointer ${
                      basemap === 'satellite'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Satellite
                  </button>
                  <button
                    onClick={() => setBasemap('osm')}
                    className={`flex-1 py-1 text-[10px] font-semibold rounded-md border transition-all cursor-pointer ${
                      basemap === 'osm'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Streets
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Parcel Detail Drawer (PRD Section 16 & 41) */}
      {selectedParcelId && (
        <div className="absolute top-4 right-4 z-20 w-84 max-w-[calc(100vw-32px)] animate-in slide-in-from-right-4 duration-300">
          <div className="glass-card rounded-2xl p-5 shadow-2xl border border-slate-200/90 space-y-4 max-h-[calc(100vh-140px)] overflow-y-auto">
            {/* Header with Close */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Integrated Land Record
                </span>
                <h2 className="text-xl font-bold text-slate-900 m-0">PARCEL {selectedParcelId}</h2>
              </div>
              <button
                onClick={() => onSelectParcel(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isDetailLoading || !parcelDetail ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Loading parcel attributes...
              </div>
            ) : (
              <div className="space-y-4">
                {/* Metric Summary Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                      Harmonized Area
                    </span>
                    <span className="text-base font-bold text-slate-900">
                      {parcelDetail.area} m&sup2;
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                      Land Use
                    </span>
                    <span className="text-base font-bold text-slate-900">
                      {parcelDetail.land_use}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                      Building Footprint
                    </span>
                    <span className="text-sm font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                      <Building className="w-3.5 h-3.5 text-slate-600" />
                      {parcelDetail.building_count > 0 ? 'Yes (Present)' : 'Vacant Plot'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                      Contributing Sources
                    </span>
                    <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                      3 Authorities
                    </span>
                  </div>
                </div>

                {/* Spatial Match & AI Conflation (Module 6) */}
                <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200/60 space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold text-teal-900">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      AI Spatial Match
                    </span>
                    <span className="font-mono text-sm">{parcelDetail.spatial_match}%</span>
                  </div>
                  <div className="w-full bg-teal-100 rounded-full h-1.5">
                    <div
                      className="bg-teal-600 h-1.5 rounded-full"
                      style={{ width: `${parcelDetail.spatial_match}%` }}
                    ></div>
                  </div>
                </div>

                {/* Multi-Factor Confidence Score (Module 11 & 43) */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800">Overall Confidence</span>
                    <span
                      className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                        parcelDetail.confidence_score >= 85
                          ? 'bg-emerald-100 text-emerald-800'
                          : parcelDetail.confidence_score >= 60
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {parcelDetail.confidence_score}% &bull;{' '}
                      {parcelDetail.confidence_score >= 85 ? 'HIGH' : 'MEDIUM'}
                    </span>
                  </div>

                  {/* Factor Breakdown */}
                  <div className="space-y-1 text-[11px] text-slate-600 pt-1">
                    <div className="flex justify-between">
                      <span>Spatial Match</span>
                      <span className="font-mono font-semibold">{parcelDetail.spatial_match}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Source Agreement</span>
                      <span className="font-mono font-semibold">
                        {parcelDetail.source_agreement}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Data Quality</span>
                      <span className="font-mono font-semibold">{parcelDetail.data_quality}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Recency</span>
                      <span className="font-mono font-semibold">{parcelDetail.recency}%</span>
                    </div>
                  </div>
                </div>

                {/* Conflicts Notification if any */}
                {parcelDetail.conflicts && parcelDetail.conflicts.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>{parcelDetail.conflicts.length} Active Disagreement Detected</span>
                    </div>
                    <p className="text-[11px] text-amber-900 leading-snug m-0">
                      {parcelDetail.conflicts[0].type.replace('_', ' ')} between{' '}
                      {parcelDetail.conflicts[0].source_a} (
                      {parcelDetail.conflicts[0].value_a}) and{' '}
                      {parcelDetail.conflicts[0].source_b} ({parcelDetail.conflicts[0].value_b}).
                    </p>
                    <button
                      onClick={() => onNavigateReview(parcelDetail.conflicts[0].id)}
                      className="w-full py-1.5 text-xs font-semibold text-amber-900 bg-amber-200/80 hover:bg-amber-200 rounded-lg transition-colors cursor-pointer text-center"
                    >
                      Review Conflict Now &rarr;
                    </button>
                  </div>
                )}

                {/* Status & Approval Actions */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Record Verification:</span>
                    <span
                      className={`font-bold ${
                        parcelDetail.status === 'APPROVED' ? 'text-emerald-700' : 'text-slate-700'
                      }`}
                    >
                      {parcelDetail.status}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleApproveParcel}
                      disabled={parcelDetail.status === 'APPROVED'}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        parcelDetail.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800 cursor-default'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {parcelDetail.status === 'APPROVED' ? 'Record Approved' : 'Approve Record'}
                    </button>

                    <button
                      onClick={() => onNavigateReview()}
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title="View Reconciliation Evidence"
                    >
                      Evidence
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
