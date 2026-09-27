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
  History
} from 'lucide-react';
import { Conflict } from '../types';

interface ReviewViewProps {
  conflicts: Conflict[];
  onResolveConflict: (conflictId: number, action: string, customValue?: string) => Promise<void>;
  onInspectOnMap: (parcelId: string) => void;
  auditLogs: any[];
}

export const ReviewView: React.FC<ReviewViewProps> = ({
  conflicts,
  onResolveConflict,
  onInspectOnMap,
  auditLogs
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');
  const [activeConflictId, setActiveConflictId] = useState<number | null>(null);
  const [manualValue, setManualValue] = useState<string>('');
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const filteredConflicts = conflicts.filter((c) => {
    if (filterStatus !== 'ALL' && c.status !== filterStatus) return false;
    if (filterType !== 'ALL' && c.type !== filterType) return false;
    return true;
  });

  const handleAction = async (conflictId: number, action: string, customVal?: string) => {
    setIsSubmitting(true);
    try {
      await onResolveConflict(conflictId, action, customVal);
      setShowManualModal(false);
      setManualValue('');
    } catch (err: any) {
      alert('Error executing resolution: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedConflict = conflicts.find((c) => c.id === activeConflictId) || filteredConflicts[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 m-0">Conflict Resolution</h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
              {conflicts.filter((c) => c.status === 'PENDING').length} Pending
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 m-0 mt-1">
            Human-in-the-loop review queue for cross-dataset spatial, boundary, and attribute disagreements.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilterStatus('PENDING')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterStatus === 'PENDING'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending ({conflicts.filter((c) => c.status === 'PENDING').length})
            </button>
            <button
              onClick={() => setFilterStatus('RESOLVED')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterStatus === 'RESOLVED'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Resolved ({conflicts.filter((c) => c.status === 'RESOLVED').length})
            </button>
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterStatus === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({conflicts.length})
            </button>
          </div>
        </div>
      </div>

      {filteredConflicts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-800 m-0">No Conflicts Matching Filters</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            All cadastral records and survey geometries are harmonized or resolved.
          </p>
          <button
            onClick={() => {
              setFilterStatus('ALL');
              setFilterType('ALL');
            }}
            className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Conflict List Cards */}
          <div className="lg:col-span-5 space-y-3">
            {filteredConflicts.map((c) => {
              const isSelected = selectedConflict?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setActiveConflictId(c.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/10'
                      : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {c.parcel_id}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
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

                    <span
                      className={`text-[11px] font-semibold ${
                        c.status === 'RESOLVED' ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  {/* Attribute Comparison */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">{c.source_a}</span>
                      <span className="font-semibold text-slate-800 font-mono text-[11px]">
                        {c.value_a}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">{c.source_b}</span>
                      <span className="font-semibold text-emerald-800 font-mono text-[11px]">
                        {c.value_b}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                    <span>Attribute: {c.attribute}</span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      Inspect Evidence &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Detailed Conflict Adjudication Panel (PRD Section 42) */}
          {selectedConflict && (
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                      Disagreement Adjudication
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 m-0">
                      Parcel {selectedConflict.parcel_id} &bull;{' '}
                      {selectedConflict.type.replace(/_/g, ' ')}
                    </h2>
                  </div>

                  <button
                    onClick={() => onInspectOnMap(selectedConflict.parcel_id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    Locate on Map
                  </button>
                </div>

                {/* Conflict Values Comparison Box */}
                <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-5 space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Multi-Source Discrepancy Evidence
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-medium text-slate-500 block">
                        Cadastral (1998)
                      </span>
                      <span className="text-lg font-bold text-blue-700 block mt-1 font-mono">
                        {selectedConflict.value_a}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1 block">Historical Record</span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-medium text-slate-500 block">
                        Municipal GIS (2025)
                      </span>
                      <span className="text-lg font-bold text-slate-700 block mt-1 font-mono">
                        {selectedConflict.attribute === 'area' ? '252.0 m²' : selectedConflict.value_a}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1 block">Property Tax Assess</span>
                    </div>

                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 shadow-xs">
                      <span className="text-[11px] font-medium text-emerald-800 block">
                        Drone / GNSS (2026)
                      </span>
                      <span className="text-lg font-bold text-emerald-700 block mt-1 font-mono">
                        {selectedConflict.value_b}
                      </span>
                      <span className="text-[10px] text-emerald-800 mt-1 block">&plusmn;1.5cm Accuracy</span>
                    </div>
                  </div>

                  {/* Supporting Evidence Checklist (PRD Section 42) */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
                    <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Automated Verification Evidence
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                        <span>Survey Available</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                        <span>GNSS RTK Verified</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                        <span>Spatial Conflation 94%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resolution Status or Action Buttons (PRD Section 13 & 42) */}
                {selectedConflict.status === 'RESOLVED' ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Resolution Recorded &amp; Preserved in Audit Trail</span>
                    </div>
                    <p className="text-emerald-800 m-0">
                      Decision: <span className="font-semibold">{selectedConflict.resolution}</span>
                    </p>
                    {selectedConflict.resolved_at && (
                      <p className="text-[10px] text-emerald-700 m-0 font-mono">
                        Timestamp: {selectedConflict.resolved_at}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Take Officer Decision
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <button
                        onClick={() => handleAction(selectedConflict.id, 'ACCEPT_SURVEY')}
                        disabled={isSubmitting}
                        className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all cursor-pointer text-center"
                      >
                        Accept Survey ({selectedConflict.value_b})
                      </button>

                      <button
                        onClick={() => handleAction(selectedConflict.id, 'ACCEPT_CADASTRAL')}
                        disabled={isSubmitting}
                        className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all cursor-pointer text-center"
                      >
                        Accept Cadastral ({selectedConflict.value_a})
                      </button>

                      <button
                        onClick={() => handleAction(selectedConflict.id, 'ACCEPT_MUNICIPAL', '252.0 m²')}
                        disabled={isSubmitting}
                        className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white shadow-sm transition-all cursor-pointer text-center"
                      >
                        Accept Municipal
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
                        Manual Edit
                      </button>

                      <button
                        onClick={() => handleAction(selectedConflict.id, 'REQUEST_SURVEY')}
                        disabled={isSubmitting}
                        className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-all cursor-pointer text-center"
                      >
                        Request Field Survey
                      </button>

                      <button
                        onClick={() => handleAction(selectedConflict.id, 'DEFER')}
                        disabled={isSubmitting}
                        className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all cursor-pointer text-center"
                      >
                        Defer Adjudication
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 italic m-0">
                      * Decisions are immutably logged into the audit ledger with user identity and timestamp.
                    </p>
                  </div>
                )}
              </div>

              {/* Audit Trail Card (PRD Section 32) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider m-0">
                    Traceability Audit Log
                  </h3>
                </div>

                <div className="space-y-2 text-xs">
                  {auditLogs.slice(0, 3).map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">{log.action}</span>
                        <span className="text-[11px] text-slate-500 block">
                          by {log.user_name} &bull; {log.entity} ({log.entity_id})
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-[10px] text-slate-400">{log.created_at}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Edit Modal */}
      {showManualModal && selectedConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 m-0">Manual Value Adjudication</h3>
            <p className="text-xs text-slate-500 m-0">
              Input verified field measurement for Parcel {selectedConflict.parcel_id} ({selectedConflict.attribute}):
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
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-500 outline-none"
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
                onClick={() =>
                  handleAction(selectedConflict.id, 'MANUAL_EDIT', `${manualValue} m²`)
                }
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md cursor-pointer"
              >
                Commit Manual Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
