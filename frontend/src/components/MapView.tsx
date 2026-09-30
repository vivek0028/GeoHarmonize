import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Layers,
  Search,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  FileCheck2,
  ShieldCheck,
  Building,
  MapPin,
  ChevronRight,
  X,
  Sliders,
  Sparkles,
  GitCompare,
  Clock,
  ExternalLink,
  Flame,
  ArrowRight
} from 'lucide-react';
import { Conflict, IntegratedRecord } from '../types';

interface MapViewProps {
  mapLayersData: any;
  selectedParcelId: string | null;
  onSelectParcel: (id: string | null) => void;
  onNavigateReview: (conflictId?: number) => void;
  onOpenPassport?: (parcelId: string) => void;
  apiClient: any;
}

export const MapView: React.FC<MapViewProps> = ({
  mapLayersData,
  selectedParcelId,
  onSelectParcel,
  onNavigateReview,
  onOpenPassport,
  apiClient
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupsRef = useRef<{ [key: string]: L.LayerGroup }>({});

  const [activeLayers, setActiveLayers] = useState({
    reconciled: true,
    cadastral: true,
    survey: true,
    buildings: true,
    survey_points: true,
    utilities: true,
    imagery_extracted: false,
    conflicts: true
  });

  const [opacity, setOpacity] = useState(0.85);
  const [basemap, setBasemap] = useState<'osm' | 'light' | 'satellite'>('light');
  const basemapLayerRef = useRef<L.TileLayer | null>(null);
  const [parcelDetail, setParcelDetail] = useState<any | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(true);

  // Differentiator: Timeline Slider (1998 -> 2025 -> 2026)
  const [timelineYear, setTimelineYear] = useState<number>(2026);

  // Differentiator: Swipe / Compare Mode
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareSplit, setCompareSplit] = useState(50); // percentage 0 to 100
  const [leftCompareLayer, setLeftCompareLayer] = useState<'cadastral' | 'municipal'>('cadastral');
  const [rightCompareLayer, setRightCompareLayer] = useState<'survey' | 'imagery_extracted'>('survey');

  // Basemap Configurations with subdomains and maxNativeZoom to avoid broken tiles
  const basemapConfigs: Record<'light' | 'satellite' | 'osm', { url: string; options: L.TileLayerOptions }> = {
    light: {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      options: {
        maxZoom: 20,
        subdomains: 'abcd',
        attribution: '&copy; CartoDB &copy; OpenStreetMap'
      }
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      options: {
        maxZoom: 20,
        maxNativeZoom: 19,
        attribution: '&copy; Esri World Imagery'
      }
    },
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: {
        maxZoom: 19,
        maxNativeZoom: 19,
        subdomains: 'abc',
        attribution: '&copy; OpenStreetMap contributors'
      }
    }
  };

  const setMapBasemap = (type: 'light' | 'satellite' | 'osm') => {
    setBasemap(type);
    const map = mapInstanceRef.current;
    if (!map) return;

    // 1. Remove tracked basemap layer
    if (basemapLayerRef.current) {
      try {
        map.removeLayer(basemapLayerRef.current);
      } catch (err) {
        console.warn('Error removing previous basemap:', err);
      }
      basemapLayerRef.current = null;
    }

    // 2. Extra safety: remove any orphaned TileLayer from the map
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        try {
          map.removeLayer(layer);
        } catch (err) {
          console.warn('Error removing orphaned TileLayer:', err);
        }
      }
    });

    // 3. Create and mount new tile layer
    const config = basemapConfigs[type];
    const newTile = L.tileLayer(config.url, config.options);
    newTile.addTo(map);
    newTile.bringToBack();
    basemapLayerRef.current = newTile;
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Centered around sample ward (Lat: 28.6180, Lon: 77.2180)
    const map = L.map(mapContainerRef.current, {
      center: [28.6180, 77.2180],
      zoom: 16,
      zoomControl: false,
      attributionControl: false
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    mapInstanceRef.current = map;

    // Mount initial basemap
    setMapBasemap(basemap);

    // Initialize layer groups
    layerGroupsRef.current = {
      reconciled: L.layerGroup().addTo(map),
      cadastral: L.layerGroup().addTo(map),
      survey: L.layerGroup().addTo(map),
      buildings: L.layerGroup().addTo(map),
      survey_points: L.layerGroup().addTo(map),
      utilities: L.layerGroup().addTo(map),
      imagery_extracted: L.layerGroup().addTo(map),
      conflicts: L.layerGroup().addTo(map)
    };

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync basemap if state changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      setMapBasemap(basemap);
    }
  }, [basemap]);

  // Render GeoJSON Layers whenever data, activeLayers, timelineYear, or opacity changes
  useEffect(() => {
    if (!mapLayersData || !mapInstanceRef.current) return;
    const groups = layerGroupsRef.current;
    if (!groups) return;

    // Clear existing groups
    Object.values(groups).forEach((g) => g.clearLayers());

    // 1. Historical 1998 Cadastral Boundary Layer
    if ((activeLayers.cadastral || (isCompareMode && leftCompareLayer === 'cadastral')) && mapLayersData.cadastral && timelineYear >= 1998) {
      L.geoJSON(mapLayersData.cadastral, {
        style: {
          color: '#f59e0b',
          weight: 2,
          dashArray: '4, 4',
          fillColor: '#fbbf24',
          fillOpacity: opacity * 0.25
        },
        onEachFeature: (feat, layer) => {
          layer.bindTooltip(`1998 Cadastre: ${feat.properties.parcel_id || 'Parcel'} (${feat.properties.area || 0} m²)`, {
            className: 'custom-leaflet-tooltip'
          });
        }
      }).addTo(groups.cadastral);
    }

    // 2. 2026 RTK-GNSS Survey Boundary Layer
    if ((activeLayers.survey || (isCompareMode && rightCompareLayer === 'survey')) && mapLayersData.survey && timelineYear >= 2026) {
      L.geoJSON(mapLayersData.survey, {
        style: {
          color: '#0284c7',
          weight: 2,
          fillColor: '#38bdf8',
          fillOpacity: opacity * 0.3
        },
        onEachFeature: (feat, layer) => {
          layer.bindTooltip(`2026 GNSS Survey: ${feat.properties.survey_id || 'Survey'}`, {
            className: 'custom-leaflet-tooltip'
          });
        }
      }).addTo(groups.survey);
    }

    // 3. Municipal GIS Buildings (185 Footprints)
    if (activeLayers.buildings && mapLayersData.municipal && timelineYear >= 2025) {
      L.geoJSON(mapLayersData.municipal, {
        style: {
          color: '#64748b',
          weight: 1.5,
          fillColor: '#94a3b8',
          fillOpacity: opacity * 0.7
        },
        onEachFeature: (feat, layer) => {
          layer.bindTooltip(`Municipal Building: ${feat.properties.building_id} (${feat.properties.area} m²)`, {
            className: 'custom-leaflet-tooltip'
          });
        }
      }).addTo(groups.buildings);
    }

    // 4. Geodetic CORS Survey Points (48 Monuments)
    if (activeLayers.survey_points && mapLayersData.survey_points) {
      L.geoJSON(mapLayersData.survey_points, {
        pointToLayer: (feat, latlng) => {
          return L.circleMarker(latlng, {
            radius: 5,
            fillColor: '#06b6d4',
            color: '#0891b2',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
          });
        },
        onEachFeature: (feat, layer) => {
          layer.bindTooltip(`CORS Base: ${feat.properties.point_code} (${feat.properties.accuracy})`, {
            className: 'custom-leaflet-tooltip'
          });
        }
      }).addTo(groups.survey_points);
    }

    // 5. Underground Utility Network (Gas and Water Lines)
    if (activeLayers.utilities && mapLayersData.utilities) {
      L.geoJSON(mapLayersData.utilities, {
        style: (feat) => {
          const isWater = feat?.properties?.utility_type?.includes('WATER');
          return {
            color: isWater ? '#2563eb' : '#ea580c',
            weight: 3,
            dashArray: '6, 6',
            opacity: opacity
          };
        },
        onEachFeature: (feat, layer) => {
          layer.bindTooltip(`Utility Line: ${feat.properties.utility_type} (${feat.properties.authority})`, {
            className: 'custom-leaflet-tooltip'
          });
        }
      }).addTo(groups.utilities);
    }

    // 6. AI Extracted from Drone Imagery Layer (with nDSM heights)
    if ((activeLayers.imagery_extracted || (isCompareMode && rightCompareLayer === 'imagery_extracted')) && mapLayersData.imagery_extracted) {
      L.geoJSON(mapLayersData.imagery_extracted, {
        style: (feat) => ({
          color: feat?.properties?.missing_from_revenue ? '#dc2626' : '#9333ea',
          weight: 2,
          fillColor: feat?.properties?.missing_from_revenue ? '#f87171' : '#c084fc',
          fillOpacity: opacity * 0.6
        }),
        onEachFeature: (feat, layer) => {
          layer.bindTooltip(`AI Extracted: Height ${feat.properties.ndsm_height_m}m • ${feat.properties.missing_from_revenue ? 'MISSING FROM RECORDS' : 'Verified'}`, {
            className: 'custom-leaflet-tooltip'
          });
        }
      }).addTo(groups.imagery_extracted);
    }

    // 7. Reconciled (proposed) Master PostGIS Layer - Colored by Review Status!
    if (activeLayers.reconciled && mapLayersData.reconciled) {
      L.geoJSON(mapLayersData.reconciled, {
        style: (feat) => {
          const pid = feat?.properties?.parcel_id;
          const isSelected = pid === selectedParcelId;
          const status = feat?.properties?.review_status || 'AUTO_MATCHED';
          
          let strokeColor = '#059669'; // Auto matched = green
          let fillColor = '#10b981';
          if (status === 'NEEDS_REVIEW') {
            strokeColor = '#d97706'; // Needs review = amber
            fillColor = '#f59e0b';
          } else if (status === 'ESCALATED' || status === 'UNRESOLVED') {
            strokeColor = '#dc2626'; // Escalated = red
            fillColor = '#ef4444';
          }

          if (isSelected) {
            strokeColor = '#1e1b4b';
            fillColor = '#3b82f6';
          }

          return {
            color: strokeColor,
            weight: isSelected ? 3.5 : 2,
            fillColor: fillColor,
            fillOpacity: opacity * (isSelected ? 0.65 : 0.45)
          };
        },
        onEachFeature: (feat, layer) => {
          const props = feat.properties;
          layer.on('click', () => {
            onSelectParcel(props.parcel_id);
          });

          // Interactive Popup with Open Passport Button!
          const popupHtml = `
            <div style="font-family: system-ui, sans-serif; padding: 4px; min-width: 190px;">
              <div style="font-size: 10px; font-weight: bold; color: #059669; text-transform: uppercase;">
                Reconciled Parcel
              </div>
              <div style="font-size: 15px; font-weight: bold; color: #0f172a; margin-top: 2px;">
                ${props.parcel_id}
              </div>
              <div style="font-family: monospace; font-size: 10px; color: #64748b; margin-bottom: 6px;">
                ${props.ulpin || 'Bhu-Aadhaar'}
              </div>
              <div style="font-size: 11px; color: #334155; line-height: 1.4;">
                <div>Owner: <strong>${props.owner_name || 'Landholder'}</strong></div>
                <div>Area: <strong>${props.area} m²</strong></div>
                <div>Confidence: <strong>${props.confidence_score}%</strong></div>
                <div>Status: <span style="font-weight: bold; color: ${props.review_status === 'ESCALATED' ? '#dc2626' : '#059669'}">${props.review_status}</span></div>
              </div>
              <button id="btn-popup-${props.parcel_id}" style="margin-top: 8px; width: 100%; padding: 5px 8px; background: #059669; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">
                Open Reconciliation Passport →
              </button>
            </div>
          `;
          layer.bindPopup(popupHtml);
          layer.on('popupopen', () => {
            const btn = document.getElementById(`btn-popup-${props.parcel_id}`);
            if (btn && onOpenPassport) {
              btn.onclick = () => onOpenPassport(props.parcel_id);
            }
          });
        }
      }).addTo(groups.reconciled);
    }

    // 8. Conflicts Overlay Layer
    if (activeLayers.conflicts && mapLayersData.conflicts) {
      L.geoJSON(mapLayersData.conflicts, {
        style: {
          color: '#e11d48',
          weight: 2.5,
          dashArray: '3, 3',
          fillColor: '#f43f5e',
          fillOpacity: opacity * 0.5
        },
        onEachFeature: (feat, layer) => {
          const center = (layer as any).getBounds ? (layer as any).getBounds().getCenter() : [28.6139, 77.2090];
          const marker = L.circleMarker(center, {
            radius: 8,
            fillColor: '#e11d48',
            color: '#ffffff',
            weight: 2,
            fillOpacity: 1
          });
          marker.bindTooltip(`Conflict on ${feat.properties.parcel_id}: ${feat.properties.type}`, {
            className: 'custom-leaflet-tooltip'
          });
          marker.on('click', () => {
            onSelectParcel(feat.properties.parcel_id);
          });
          marker.addTo(groups.conflicts);
        }
      }).addTo(groups.conflicts);
    }
  }, [mapLayersData, activeLayers, opacity, selectedParcelId, timelineYear, isCompareMode, leftCompareLayer, rightCompareLayer]);

  // Load parcel detail when selected
  useEffect(() => {
    if (!selectedParcelId) {
      setParcelDetail(null);
      return;
    }
    setIsDetailLoading(true);
    apiClient
      .getParcelPassport(selectedParcelId)
      .then((data: any) => {
        setParcelDetail(data);
        if (mapInstanceRef.current && data.current_geometry) {
          const l = L.geoJSON(data.current_geometry);
          mapInstanceRef.current.flyToBounds(l.getBounds(), {
            padding: [100, 100],
            maxZoom: 18,
            duration: 1.0
          });
        }
      })
      .catch((err: any) => console.error(err))
      .finally(() => setIsDetailLoading(false));
  }, [selectedParcelId]);

  const toggleLayer = (layerName: keyof typeof activeLayers) => {
    setActiveLayers((prev) => ({ ...prev, [layerName]: !prev[layerName] }));
  };

  return (
    <div className="relative w-full h-[calc(100vh-65px)] overflow-hidden bg-slate-100 pb-20">
      {/* Leaflet Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Layer Control Panel */}
      <div className="absolute top-4 left-4 z-20 w-72 max-w-[calc(100vw-32px)]">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-slate-200 transition-all space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Map Layers
              </span>
            </div>
            <button
              onClick={() => setShowLayerPanel(!showLayerPanel)}
              className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer font-medium"
            >
              {showLayerPanel ? 'Collapse' : 'Expand'}
            </button>
          </div>

          {showLayerPanel && (
            <div className="space-y-2 text-xs">
              {/* Layer 1: Reconciled (proposed) */}
              <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded-lg cursor-pointer">
                <span className="flex items-center gap-2 font-semibold text-slate-800">
                  <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
                  Reconciled (proposed)
                </span>
                <input
                  type="checkbox"
                  checked={activeLayers.reconciled}
                  onChange={() => toggleLayer('reconciled')}
                  className="rounded text-emerald-600 cursor-pointer"
                />
              </label>

              {/* Layer 2: 1998 Cadastre */}
              <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded-lg cursor-pointer">
                <span className="flex items-center gap-2 text-slate-700">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  1998 Revenue Cadastre
                </span>
                <input
                  type="checkbox"
                  checked={activeLayers.cadastral}
                  onChange={() => toggleLayer('cadastral')}
                  className="rounded text-amber-500 cursor-pointer"
                />
              </label>

              {/* Layer 3: 2026 GNSS Survey */}
              <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded-lg cursor-pointer">
                <span className="flex items-center gap-2 text-slate-700">
                  <span className="w-3 h-3 rounded-full bg-sky-500"></span>
                  2026 RTK-GNSS Survey
                </span>
                <input
                  type="checkbox"
                  checked={activeLayers.survey}
                  onChange={() => toggleLayer('survey')}
                  className="rounded text-sky-500 cursor-pointer"
                />
              </label>

              {/* Layer 4: Municipal Buildings */}
              <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded-lg cursor-pointer">
                <span className="flex items-center gap-2 text-slate-700">
                  <span className="w-3 h-3 rounded-full bg-slate-500"></span>
                  Municipal Buildings (185)
                </span>
                <input
                  type="checkbox"
                  checked={activeLayers.buildings}
                  onChange={() => toggleLayer('buildings')}
                  className="rounded text-slate-500 cursor-pointer"
                />
              </label>

              {/* Layer 5: Geodetic CORS Points */}
              <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded-lg cursor-pointer">
                <span className="flex items-center gap-2 text-slate-700">
                  <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
                  Geodetic CORS Points (48)
                </span>
                <input
                  type="checkbox"
                  checked={activeLayers.survey_points}
                  onChange={() => toggleLayer('survey_points')}
                  className="rounded text-cyan-500 cursor-pointer"
                />
              </label>

              {/* Layer 6: Utility Network */}
              <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded-lg cursor-pointer">
                <span className="flex items-center gap-2 text-slate-700">
                  <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                  Utility Network (Gas/Water)
                </span>
                <input
                  type="checkbox"
                  checked={activeLayers.utilities}
                  onChange={() => toggleLayer('utilities')}
                  className="rounded text-blue-600 cursor-pointer"
                />
              </label>

              {/* Layer 7: Extracted from Imagery */}
              <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded-lg cursor-pointer">
                <span className="flex items-center gap-2 text-slate-700">
                  <span className="w-3 h-3 rounded-full bg-purple-600"></span>
                  Extracted from Imagery (nDSM)
                </span>
                <input
                  type="checkbox"
                  checked={activeLayers.imagery_extracted}
                  onChange={() => toggleLayer('imagery_extracted')}
                  className="rounded text-purple-600 cursor-pointer"
                />
              </label>

              {/* Layer 8: Conflicts */}
              <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded-lg cursor-pointer">
                <span className="flex items-center gap-2 text-rose-700 font-semibold">
                  <span className="w-3 h-3 rounded-full bg-rose-600"></span>
                  Discrepancy Overlays (80)
                </span>
                <input
                  type="checkbox"
                  checked={activeLayers.conflicts}
                  onChange={() => toggleLayer('conflicts')}
                  className="rounded text-rose-600 cursor-pointer"
                />
              </label>

              {/* Opacity Slider that visibly changes opacity */}
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Layer Opacity</span>
                  <span className="font-mono">{Math.round(opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>

              {/* Basemap Switcher */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">Basemap:</span>
                <div className="flex gap-1">
                  {(['light', 'satellite', 'osm'] as const).map((b) => (
                    <button
                      key={b}
                      onClick={() => setMapBasemap(b)}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        basemap === b
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Differentiator: Interactive Timeline Slider & Swipe Compare Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        {/* Timeline Slider Box */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-lg border border-slate-200 text-xs space-y-2 max-w-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Version Timeline</span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold font-mono text-[11px]">
              {timelineYear === 1998 ? '1998 Cadastre' : (timelineYear === 2025 ? '2025 Municipal' : '2026 RTK Survey')}
            </span>
          </div>
          <input
            type="range"
            min="1998"
            max="2026"
            step="14"
            value={timelineYear}
            onChange={(e) => setTimelineYear(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>1998</span>
            <span>2025</span>
            <span>2026</span>
          </div>
        </div>

        {/* Swipe / Compare Toggle Button */}
        <button
          onClick={() => setIsCompareMode(!isCompareMode)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
            isCompareMode ? 'bg-emerald-600 text-white shadow-emerald-600/30' : 'bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <GitCompare className="w-4 h-4" />
          <span>{isCompareMode ? 'Close Compare Slider' : 'Swipe / Compare Layers'}</span>
        </button>
      </div>

      {/* Swipe / Compare Floating Control Strip */}
      {isCompareMode && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 bg-slate-900/90 text-white backdrop-blur-md px-6 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-400">Left:</span>
            <select
              value={leftCompareLayer}
              onChange={(e: any) => setLeftCompareLayer(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs outline-none"
            >
              <option value="cadastral">1998 Cadastre</option>
              <option value="municipal">2025 Municipal Footprints</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono">VS</span>
            <span className="font-bold text-sky-400">Right:</span>
            <select
              value={rightCompareLayer}
              onChange={(e: any) => setRightCompareLayer(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs outline-none"
            >
              <option value="survey">2026 RTK-GNSS Survey</option>
              <option value="imagery_extracted">AI Imagery Extraction (nDSM)</option>
            </select>
          </div>

          <span className="text-[11px] text-emerald-400">
            Split View Active
          </span>
        </div>
      )}

      {/* Right Sidebar: Selected Parcel Detail */}
      {selectedParcelId && parcelDetail && (
        <div className="absolute top-4 right-4 bottom-24 z-20 w-80 max-w-[calc(100vw-32px)] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 p-5 overflow-y-auto space-y-4 text-xs animate-in slide-in-from-right-4">
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                Parcel Passport Summary
              </span>
              <h2 className="text-lg font-bold text-slate-900 m-0">
                {parcelDetail.parcel_id}
              </h2>
              <div className="font-mono text-[10px] text-slate-400">
                {parcelDetail.ulpin}
              </div>
            </div>
            <button
              onClick={() => onSelectParcel(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Owner of Record</span>
              <span className="font-bold text-slate-800">{parcelDetail.owner_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Reconciled Area</span>
              <span className="font-bold text-slate-800">{parcelDetail.area} m²</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Land Use Zoning</span>
              <span className="font-semibold text-slate-700">{parcelDetail.land_use}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Confidence Score</span>
              <span className={`font-mono font-bold ${
                parcelDetail.confidence_score >= 85 ? 'text-emerald-700' :
                parcelDetail.confidence_score >= 60 ? 'text-amber-700' : 'text-red-700'
              }`}>
                {parcelDetail.confidence_score}%
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Review Status</span>
              <span className="font-mono font-semibold text-slate-800 text-[11px]">
                {parcelDetail.review_status}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 space-y-2">
            {onOpenPassport && (
              <button
                onClick={() => onOpenPassport(parcelDetail.parcel_id)}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4" />
                Open Full Passport →
              </button>
            )}

            {parcelDetail.conflicts && parcelDetail.conflicts.length > 0 && (
              <button
                onClick={() => onNavigateReview(parcelDetail.conflicts[0].id)}
                className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4" />
                Adjudicate Conflict Case
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
