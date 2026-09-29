import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Check,
  ShieldAlert,
  ArrowRight,
  Filter,
  Layers,
  MapPin,
  HelpCircle,
  FileEdit,
  History,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Eye,
  ExternalLink,
  ChevronRight,
  Split,
  Search
} from 'lucide-react';
import { Conflict } from '../types';
import { api } from '../services/api';

interface ReviewViewProps {
  conflicts: Conflict[];
  onResolveConflict: (conflictId: number, action: string, customValue?: string, reason?: string) => Promise<void>;
  onInspectOnMap: (parcelId: string) => void;
  onOpenPassport?: (parcelId: string) => void;
  onOpenEvidenceGraph?: (parcelId: string) => void;
  auditLogs?: any[];
  apiClient?: typeof api;
  onRefreshData?: () => void;
}

export const ReviewView: React.FC<ReviewViewProps> = ({
  conflicts,
  onResolveConflict,
  onInspectOnMap,
  onOpenPassport,
  onOpenEvidenceGraph,
  auditLogs = [],
  apiClient = api,
  onRefreshData
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeConflictId, setActiveConflictId] = useState<number | null>(null);
  const [decisionReason, setDecisionReason] = useState<string>('');
  const [revertReason, setRevertReason] = useState<string>('');
  const [manualValue, setManualValue] = useState<string>('');
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [showRevertModal, setShowRevertModal] = useState<boolean>(false);
  const [showTopologyModal, setShowTopologyModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const pendingCount = conflicts.filter((c) => c.status === 'PENDING').length;
  const resolvedCount = conflicts.filter((c) => c.status === 'RESOLVED').length;
  const allCount = conflicts.length;

  const filteredConflicts = conflicts.filter((c) => {
    if (filterStatus !== 'ALL' && c.status !== filterStatus) return false;
    if (filterType !== 'ALL' && c.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.parcel_id.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q) ||
        c.attribute.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedConflict =
    conflicts.find((c) => c.id === activeConflictId) || filteredConflicts[0] || conflicts[0];

  const handleExecuteAction = async (action: string, customVal?: string) => {
    if (!selectedConflict) return;
    if (!decisionReason.trim()) {
      alert('Mandatory Requirement: Please provide a justification reason before saving this decision.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onResolveConflict(selectedConflict.id, action, customVal, decisionReason);
      setActionSuccessMsg(`Decision "${action}" committed and signed into the SHA-256 audit ledger.`);
      setShowManualModal(false);
      setDecisionReason('');
      setManualValue('');
      if (onRefreshData) onRefreshData();
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('Error committing resolution: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevert = async () => {
    if (!selectedConflict) return;
    if (!revertReason.trim()) {
      alert('Mandatory Requirement: Please state a reason for reverting this adjudication.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.revertConflict(selectedConflict.id, revertReason);
      setShowRevertModal(false);
      setRevertReason('');
      setActionSuccessMsg(`Conflict for parcel ${selectedConflict.parcel_id} successfully reverted to PENDING.`);
      if (onRefreshData) onRefreshData();
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('Error reverting conflict: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveTopologyFix = async () => {
    if (!selectedConflict) return;
    const reason = decisionReason.trim() || 'Approved proposed PostGIS ST_Difference overlap trim & sliver repair';

    setIsSubmitting(true);
    try {
      await apiClient.approveTopologyFix(selectedConflict.id, reason);
      setShowTopologyModal(false);
      setDecisionReason('');
      setActionSuccessMsg(`Topological repair approved and committed to geometry versions for parcel ${selectedConflict.parcel_id}.`);
      if (onRefreshData) onRefreshData();
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('Error approving topology fix: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rule synthesis based on conflict type & attributes
  const getFiredRuleInfo = (c: Conflict) => {
    if (c.type === 'BOUNDARY_OVERLAP' || c.type === 'SLIVER_POLYGON') {
      return {
        rule: 'Survey Authority Rule #1: RTK-GNSS & Drone Survey (±1.5 cm) supersedes 1998 Cadastre digitizing error',
        recommendation: 'Approve proposed topology fix to trim overlap and snap vertices to RTK survey points.',
        action: 'ACCEPT_SURVEY'
      };
    }
    if (c.type === 'AREA_MISMATCH') {
      return {
        rule: 'Geodetic Conflation Rule #4: Recomputed ellipsoidal geodesic area (PostGIS ST_Area(geography)) takes precedence over scanned revenue records',
        recommendation: 'Accept 2026 RTK-GNSS Area (higher confidence 98.4%).',
        action: 'ACCEPT_SURVEY'
      };
    }
    if (c.type === 'DUPLICATE_ID') {
      return {
        rule: 'ULPIN Disambiguation Rule #2: Issue new hierarchical standard sub-identifier (e.g. DL-08-01-2026-0001-A vs -B) based on spatial partition',
        recommendation: 'Issue partition sub-IDs and verify khatedar ownership records.',
        action: 'MANUAL_EDIT'
      };
    }
    if (c.type === 'LAND_USE_MISMATCH') {
      return {
        rule: 'Multi-Source Zoning Rule #5: High-resolution drone orthophoto AI extraction (2026) flags unauthorized land-use change vs 1998 Agricultural cadastre',
        recommendation: 'Flag for municipal site inspection and require revenue officer signoff.',
        action: 'REQUEST_SURVEY'
      };
    }
    return {
      rule: 'General Evidence Rule: Survey preferred for geometry: ±1.5 cm vs 1998 cadastre digitizing tolerance (±1.2 m)',
      recommendation: 'Verify ground control coordinates and corroborating GNSS baseline.',
      action: 'ACCEPT_SURVEY'
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-32 space-y-6">
      {/* Toast notification */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Header & Stats bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 m-0">
              Case Adjudication Queue
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
              {pendingCount} Pending Review
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {resolvedCount} Resolved
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 m-0 mt-1">
            Reconciliation cases requiring authorized officer review. Every decision is cryptographically logged into the SHA-256 ledger.
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilterStatus('PENDING')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterStatus === 'PENDING'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilterStatus('RESOLVED')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterStatus === 'RESOLVED'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Resolved ({resolvedCount})
            </button>
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterStatus === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Cases ({allCount})
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Case List, Right Detailed Case View [Differentiator] */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Case Queue */}
        <div className="lg:col-span-4 space-y-3">
          {/* Search & Type filter */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by Parcel ID or error type..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none"
            >
              <option value="ALL">All Discrepancy Types</option>
              <option value="BOUNDARY_OVERLAP">Boundary Overlap</option>
              <option value="SLIVER_POLYGON">Sliver Polygon</option>
              <option value="DUPLICATE_ID">Duplicate ID</option>
              <option value="AREA_MISMATCH">Area Mismatch</option>
              <option value="INVALID_GEOMETRY">Invalid Geometry</option>
              <option value="LAND_USE_MISMATCH">Land Use Mismatch</option>
            </select>
          </div>

          {/* Cards List */}
          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {filteredConflicts.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No cases found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting your filters</p>
              </div>
            ) : (
              filteredConflicts.map((c) => {
                const isSelected = selectedConflict?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setActiveConflictId(c.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/15'
                        : 'bg-white/85 border-slate-200 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {c.parcel_id}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md uppercase ${
                              c.severity === 'CRITICAL'
                                ? 'bg-rose-100 text-rose-800'
                                : c.severity === 'HIGH'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {c.type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Attribute: <strong className="text-slate-600">{c.attribute}</strong>
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          c.status === 'RESOLVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    {/* Compact source comparison */}
                    <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-[9px] text-slate-400 block truncate">{c.source_a}</span>
                        <span className="font-mono font-medium text-slate-700 truncate block">
                          {c.value_a}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-[9px] text-slate-400 block truncate">{c.source_b}</span>
                        <span className="font-mono font-semibold text-emerald-700 truncate block">
                          {c.value_b}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Unresolved since: {c.detected_at || '2026-03-12'}</span>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Case View [Differentiator] */}
        {selectedConflict ? (
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
              {/* Case Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      CASE #{selectedConflict.id} &bull; {selectedConflict.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Unresolved since {selectedConflict.detected_at || '2026-03-12'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1 m-0">
                    Parcel {selectedConflict.parcel_id} Discrepancy
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  {onOpenPassport && (
                    <button
                      onClick={() => onOpenPassport(selectedConflict.parcel_id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      Open Passport
                    </button>
                  )}
                  {onOpenEvidenceGraph && (
                    <button
                      onClick={() => onOpenEvidenceGraph(selectedConflict.parcel_id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-all cursor-pointer"
                    >
                      <Split className="w-3.5 h-3.5 text-purple-600" />
                      Evidence Graph
                    </button>
                  )}
                  <button
                    onClick={() => onInspectOnMap(selectedConflict.parcel_id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    Locate on Map
                  </button>
                </div>
              </div>

              {/* Spatial Conflict Mini-Map Overlay Preview */}
              <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white relative overflow-hidden">
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-slate-200">
                      Spatial Overlay Analysis &bull; Overlap &amp; Boundary Shift
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    CRS: EPSG:4326 (WGS 84)
                  </span>
                </div>

                {/* SVG Visual Representation of the Conflicting Overlap */}
                <div className="h-44 w-full bg-slate-900 rounded-xl relative flex items-center justify-center border border-slate-800">
                  <svg className="w-full h-full" viewBox="0 0 500 180">
                    <defs>
                      <pattern id="sliverPattern" width="6" height="6" patternUnits="userSpaceOnUse">
                        <line x1="0" y1="6" x2="6" y2="0" stroke="#f43f5e" strokeWidth="1.5" />
                      </pattern>
                    </defs>
                    {/* Grid lines */}
                    <line x1="0" y1="45" x2="500" y2="45" stroke="#1e293b" strokeDasharray="4 4" />
                    <line x1="0" y1="90" x2="500" y2="90" stroke="#1e293b" strokeDasharray="4 4" />
                    <line x1="0" y1="135" x2="500" y2="135" stroke="#1e293b" strokeDasharray="4 4" />
                    <line x1="125" y1="0" x2="125" y2="180" stroke="#1e293b" strokeDasharray="4 4" />
                    <line x1="250" y1="0" x2="250" y2="180" stroke="#1e293b" strokeDasharray="4 4" />
                    <line x1="375" y1="0" x2="375" y2="180" stroke="#1e293b" strokeDasharray="4 4" />

                    {/* Cadastral Polygon (Blue dashed) */}
                    <polygon
                      points="120,40 340,35 360,140 100,145"
                      fill="rgba(59, 130, 246, 0.15)"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeDasharray="5 3"
                    />

                    {/* Survey Polygon (Emerald solid) */}
                    <polygon
                      points="135,38 375,32 390,142 118,148"
                      fill="rgba(16, 185, 129, 0.2)"
                      stroke="#10b981"
                      strokeWidth="2.5"
                    />

                    {/* Discrepancy / Overlap Area (Striped Red) */}
                    <polygon
                      points="340,35 375,32 390,142 360,140"
                      fill="url(#sliverPattern)"
                      stroke="#f43f5e"
                      strokeWidth="1.5"
                    />

                    {/* Labels on SVG */}
                    <text x="130" y="30" fill="#60a5fa" fontSize="11" fontFamily="sans-serif" fontWeight="bold">
                      1998 Cadastre (±1.2m)
                    </text>
                    <text x="355" y="24" fill="#34d399" fontSize="11" fontFamily="sans-serif" fontWeight="bold">
                      2026 Drone &amp; RTK (±1.5cm)
                    </text>
                    <text x="365" y="160" fill="#f87171" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
                      Overlap Trim (3.2 m²)
                    </text>
                  </svg>

                  {/* Overlay tags */}
                  <div className="absolute bottom-2 left-3 flex items-center gap-3 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-blue-500 rounded-xs"></span>
                      <span className="text-slate-300">1998 Historical Cadastre</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs"></span>
                      <span className="text-slate-300">2026 RTK-GNSS Survey</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-rose-500 rounded-xs"></span>
                      <span className="text-slate-300">Boundary Discrepancy</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Source Comparison Table with Dates & Accuracy */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Multi-Source Discrepant Values
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span>Source A</span>
                      <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                        1998-04-01
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-800 block truncate">
                      {selectedConflict.source_a}
                    </span>
                    <span className="text-sm font-bold text-blue-700 block mt-1 font-mono">
                      {selectedConflict.value_a}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Accuracy: &plusmn;1.2 m &bull; Confidence: 62%
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span>Source B</span>
                      <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                        2025-11-20
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-800 block truncate">
                      Municipal GIS 2025
                    </span>
                    <span className="text-sm font-bold text-slate-700 block mt-1 font-mono">
                      {selectedConflict.attribute === 'area' ? '252.0 m²' : selectedConflict.value_a}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Accuracy: &plusmn;0.5 m &bull; Confidence: 78%
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
                    <div className="flex items-center justify-between text-[11px] text-emerald-800 mb-1">
                      <span className="font-semibold">Source C (Survey)</span>
                      <span className="text-[10px] bg-emerald-200/80 px-1.5 py-0.5 rounded text-emerald-900 font-bold">
                        2026-02-15
                      </span>
                    </div>
                    <span className="text-xs font-bold text-emerald-950 block truncate">
                      {selectedConflict.source_b}
                    </span>
                    <span className="text-sm font-bold text-emerald-700 block mt-1 font-mono">
                      {selectedConflict.value_b}
                    </span>
                    <span className="text-[10px] text-emerald-800 mt-1 block font-medium">
                      Accuracy: &plusmn;1.5 cm &bull; Confidence: 98.4%
                    </span>
                  </div>
                </div>
              </div>

              {/* Confidence Breakdown Bars */}
              <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Automated Evidence Breakdown &amp; Conflation Scores
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-600">Geometry Overlap (IoU)</span>
                      <span className="font-mono font-bold text-slate-800">88.2%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '88.2%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-600">Centroid Distance Shift</span>
                      <span className="font-mono font-bold text-slate-800">0.24 m (95.1%)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '95.1%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-600">ID / ULPIN Similarity</span>
                      <span className="font-mono font-bold text-slate-800">99.0%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '99%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-600">Source Positional Accuracy</span>
                      <span className="font-mono font-bold text-slate-800">&plusmn;1.5 cm (98.4%)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '98.4%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rule that fired banner & Recommendation */}
              {(() => {
                const info = getFiredRuleInfo(selectedConflict);
                return (
                  <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-900 font-bold">
                      <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>{info.rule}</span>
                    </div>
                    <p className="text-amber-800 m-0 text-[11px] pl-6">
                      <strong>Recommended Action:</strong> {info.recommendation}
                    </p>
                  </div>
                );
              })()}

              {/* Topology Fix Preview Banner (If Overlap, Sliver, or Invalid Geometry) */}
              {(selectedConflict.type === 'BOUNDARY_OVERLAP' ||
                selectedConflict.type === 'SLIVER_POLYGON' ||
                selectedConflict.type === 'INVALID_GEOMETRY') && (
                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-purple-900 block">
                      Proposed Topological Correction Available
                    </span>
                    <span className="text-[11px] text-purple-800 block mt-0.5">
                      PostGIS ST_MakeValid &amp; ST_Difference prepared: 3.2 m² overlap trimmed, 0 invalid self-intersections.
                    </span>
                  </div>
                  <button
                    onClick={() => setShowTopologyModal(true)}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-xs cursor-pointer flex-shrink-0"
                  >
                    Preview Topology Fix
                  </button>
                </div>
              )}

              {/* Decision Section */}
              {selectedConflict.status === 'RESOLVED' ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Case Resolved &amp; Recorded in PostGIS Ledger</span>
                    </div>
                    <button
                      onClick={() => setShowRevertModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Revert Adjudication
                    </button>
                  </div>

                  <div className="text-xs text-emerald-800 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[11px] text-emerald-600 block">Decision Action:</span>
                      <strong className="text-slate-900 font-mono">{selectedConflict.resolution}</strong>
                    </div>
                    <div>
                      <span className="text-[11px] text-emerald-600 block">Resolved At:</span>
                      <span className="font-mono text-[11px]">
                        {selectedConflict.resolved_at || '2026-03-29 11:06:00'}
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-emerald-700 italic border-t border-emerald-200/60 pt-2 m-0">
                    * Authenticated with SHA-256 block hash. Reversion will generate a linked counter-entry in the ledger.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pt-1">
                  {/* Mandatory Reason Box */}
                  <div className="space-y-1.5">
                    <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700">
                      <span>Authorized Officer Adjudication Reason</span>
                      <span className="text-rose-500 font-normal lowercase">* mandatory</span>
                    </label>
                    <textarea
                      rows={2}
                      value={decisionReason}
                      onChange={(e) => setDecisionReason(e.target.value)}
                      placeholder="Enter legal/technical rationale before saving decision (e.g. 'Survey supersedes 1998 revenue cadastre due to sub-centimeter GNSS RTK validation per Rule #1')..."
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-500 outline-none text-slate-800"
                    />
                  </div>

                  {/* 6 Decision Buttons */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                      Choose Resolution Action
                    </span>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <button
                        onClick={() => handleExecuteAction('ACCEPT_SURVEY')}
                        disabled={isSubmitting || !decisionReason.trim()}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold shadow-xs transition-all text-center ${
                          decisionReason.trim()
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        }`}
                      >
                        Accept Survey ({selectedConflict.value_b})
                      </button>

                      <button
                        onClick={() => handleExecuteAction('ACCEPT_CADASTRAL')}
                        disabled={isSubmitting || !decisionReason.trim()}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold shadow-xs transition-all text-center ${
                          decisionReason.trim()
                            ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        }`}
                      >
                        Accept Cadastral ({selectedConflict.value_a})
                      </button>

                      <button
                        onClick={() => handleExecuteAction('ACCEPT_MUNICIPAL', '252.0 m²')}
                        disabled={isSubmitting || !decisionReason.trim()}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold shadow-xs transition-all text-center ${
                          decisionReason.trim()
                            ? 'bg-slate-800 hover:bg-slate-700 text-white cursor-pointer'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        }`}
                      >
                        Accept Municipal (2025)
                      </button>

                      <button
                        onClick={() => {
                          setManualValue(selectedConflict.value_b.replace(/[^\d.]/g, ''));
                          setShowManualModal(true);
                        }}
                        disabled={isSubmitting}
                        className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                        Manual Value Edit
                      </button>

                      <button
                        onClick={() => handleExecuteAction('REQUEST_SURVEY')}
                        disabled={isSubmitting || !decisionReason.trim()}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all text-center border ${
                          decisionReason.trim()
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200 cursor-pointer'
                            : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                        }`}
                      >
                        Request Field Survey
                      </button>

                      <button
                        onClick={() => handleExecuteAction('DEFER')}
                        disabled={isSubmitting || !decisionReason.trim()}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all text-center border ${
                          decisionReason.trim()
                            ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 cursor-pointer'
                            : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                        }`}
                      >
                        Defer Adjudication
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        Decisions are immutably logged with user identity, reason, and SHA-256 hash proof into PostGIS.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Manual Value Modal */}
      {showManualModal && selectedConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 m-0">Manual Value Adjudication</h3>
            <p className="text-xs text-slate-500 m-0">
              Input verified field measurement for Parcel <strong>{selectedConflict.parcel_id}</strong> ({selectedConflict.attribute}):
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Resolved Value
              </label>
              <input
                type="text"
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                placeholder="e.g. 248.5 m²"
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Adjudication Rationale
              </label>
              <input
                type="text"
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder="Cite joint survey verification report..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleExecuteAction('MANUAL_EDIT', `${manualValue} m²`)}
                disabled={isSubmitting || !manualValue.trim() || !decisionReason.trim()}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                Commit Manual Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revert Modal */}
      {showRevertModal && selectedConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-base">
              <RotateCcw className="w-5 h-5" />
              <span>Revert Adjudication Decision</span>
            </div>
            <p className="text-xs text-slate-600 m-0">
              Reverting will reopen case for Parcel <strong>{selectedConflict.parcel_id}</strong> back to PENDING. An audit ledger reversal record will be appended.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Reversion <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={revertReason}
                onChange={(e) => setRevertReason(e.target.value)}
                placeholder="State why the previous adjudication is being revoked (e.g. 'Fresh boundary evidence submitted by revenue inspector')..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-rose-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRevertModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRevert}
                disabled={isSubmitting || !revertReason.trim()}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                Confirm Revert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Topology Fix Preview Modal */}
      {showTopologyModal && selectedConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 m-0">
                  Proposed PostGIS Topology Correction Preview
                </h3>
                <span className="text-xs text-slate-500">
                  Parcel {selectedConflict.parcel_id} &bull; Overlap &amp; Sliver Removal
                </span>
              </div>
              <button
                onClick={() => setShowTopologyModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                &times;
              </button>
            </div>

            {/* Before vs After comparison */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200 space-y-2">
                <span className="font-bold text-rose-900 block text-[11px] uppercase">
                  Before Correction
                </span>
                <div className="space-y-1 text-rose-800 text-[11px]">
                  <div>&bull; Invalid Overlap: <strong>3.2 m²</strong></div>
                  <div>&bull; Sliver polygon: <strong>Detected</strong></div>
                  <div>&bull; ST_IsValid: <strong>False</strong> (Ring self-intersection)</div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2">
                <span className="font-bold text-emerald-900 block text-[11px] uppercase">
                  After Proposed Fix
                </span>
                <div className="space-y-1 text-emerald-800 text-[11px]">
                  <div>&bull; ST_Difference: <strong>0.0 m² overlap</strong></div>
                  <div>&bull; Sliver: <strong>Snapped to nearest vertex</strong></div>
                  <div>&bull; ST_IsValid: <strong>True</strong> (OGC Compliant)</div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Approval Justification Note
              </label>
              <input
                type="text"
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder="e.g. 'Verified vertex snapping against CORS GNSS base network'"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-purple-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowTopologyModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveTopologyFix}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Approve Proposed Topology Fix
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
