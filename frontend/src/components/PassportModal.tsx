import React, { useState, useEffect } from 'react';
import {
  X,
  FileCheck2,
  GitBranch,
  Shield,
  Layers,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Share2,
  Info,
  RefreshCw
} from 'lucide-react';
import { ParcelPassport } from '../types';
import { api } from '../services/api';
import { downloadParcelPdfFile } from '../utils/downloadHelpers';

interface PassportModalProps {
  parcelId: string;
  onClose: () => void;
  onOpenEvidenceGraph?: (parcelId: string) => void;
  onRefreshData?: () => void;
}

export const PassportModal: React.FC<PassportModalProps> = ({
  parcelId,
  onClose,
  onOpenEvidenceGraph,
  onRefreshData
}) => {
  const [passport, setPassport] = useState<ParcelPassport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'provenance' | 'lineage' | 'versions' | 'correction'>('provenance');
  const [isApproving, setIsApproving] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadPassport();
  }, [parcelId]);

  const loadPassport = async () => {
    setIsLoading(true);
    try {
      const data = await api.getParcelPassport(parcelId);
      setPassport(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!passport) return;
    setIsApproving(true);
    try {
      await api.approveParcel(passport.parcel_id, 'Official reconciliation sign-off in Passport');
      setActionSuccess(`Parcel ${passport.parcel_id} successfully approved and logged to SHA-256 ledger.`);
      await loadPassport();
      if (onRefreshData) onRefreshData();
    } catch (e: any) {
      alert('Approval failed: ' + e.message);
    } finally {
      setIsApproving(false);
    }
  };

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleDownloadPDF = async () => {
    if (!passport) return;
    setIsExportingPdf(true);
    try {
      await downloadParcelPdfFile(passport.parcel_id, {
        ulpin: passport.ulpin,
        owner_name: passport.owner_name,
        area: passport.area,
        land_use: passport.land_use,
        spatial_match_pct: passport.spatial_match_pct,
        source_agreement_pct: passport.source_agreement_pct,
        confidence_score: passport.confidence_score,
        review_status: passport.review_status,
        feature_hash: passport.feature_hash
      });
      setActionSuccess(`Official Parcel Passport PDF for ${passport.parcel_id} downloaded successfully.`);
    } catch (e: any) {
      alert('PDF export failed: ' + e.message);
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (isLoading || !passport) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-700">Loading Parcel Reconciliation Passport...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 text-white flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                OFFICIAL PARCEL RECONCILIATION PASSPORT
              </span>
              <span className="text-xs text-slate-400 font-mono">Bhu-Aadhaar Standard</span>
            </div>
            <div className="flex items-baseline gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white m-0">
                Parcel ID: {passport.parcel_id}
              </h1>
              <span className="text-xs font-mono text-emerald-400 bg-white/10 px-2.5 py-0.5 rounded-md">
                ULPIN: {passport.ulpin}
              </span>
            </div>
            <p className="text-xs text-slate-300 m-0">
              Owner: <strong>{passport.owner_name}</strong> • Recorded Area: <strong>{passport.area} m²</strong> • Land Use: <strong>{passport.land_use}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={isExportingPdf}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer text-xs flex items-center gap-1.5 disabled:opacity-60"
              title="Download Certificate"
            >
              {isExportingPdf ? (
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{isExportingPdf ? 'Exporting...' : 'Export PDF'}</span>
            </button>
            {onOpenEvidenceGraph && (
              <button
                onClick={() => {
                  onClose();
                  onOpenEvidenceGraph(passport.parcel_id);
                }}
                className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer text-xs flex items-center gap-1.5"
                title="Open Evidence Graph"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Evidence Graph</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Confidence & Review Status Strip */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold">
              <span className="text-slate-600">Reconciliation Confidence:</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                passport.confidence_score >= 85 ? 'bg-emerald-100 text-emerald-800' :
                passport.confidence_score >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
              }`}>
                {passport.confidence_score}%
              </span>
            </div>
            <div className="text-slate-400">|</div>
            <div className="flex items-center gap-1 font-semibold text-slate-700">
              <span>Status:</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-mono text-[11px]">
                {passport.review_status}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {passport.review_status !== 'APPROVED' ? (
              <button
                onClick={handleApprove}
                disabled={isApproving}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isApproving ? 'Approving...' : 'Approve Reconciled Record'}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-semibold text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Officially Approved
              </span>
            )}
          </div>
        </div>

        {actionSuccess && (
          <div className="mx-6 mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 bg-white">
          <button
            onClick={() => setActiveTab('provenance')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'provenance'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Field Provenance &amp; Attribution
          </button>
          <button
            onClick={() => setActiveTab('lineage')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'lineage'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Lineage Timeline ({passport.lineage_events.length})
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'versions'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Geometry Versions ({passport.geometry_versions.length})
          </button>
          <button
            onClick={() => setActiveTab('correction')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'correction'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Proposed Correction
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {activeTab === 'provenance' && (
            <div className="space-y-5">
              {/* Field Table */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2.5 pl-3">Attribute</th>
                      <th className="py-2.5">Reconciled Value</th>
                      <th className="py-2.5">Winning Source Dataset</th>
                      <th className="py-2.5">Source Date</th>
                      <th className="py-2.5 text-right pr-3">Authority / Conf</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {passport.attributes.map((attr, idx) => (
                      <tr key={idx} className="hover:bg-white transition-colors">
                        <td className="py-2.5 pl-3 font-semibold text-slate-800 font-mono text-[11px]">
                          {attr.key}
                        </td>
                        <td className="py-2.5 font-bold text-slate-900">
                          {attr.value}
                        </td>
                        <td className="py-2.5 text-slate-600 font-medium">
                          {attr.source_name}
                        </td>
                        <td className="py-2.5 text-slate-500 font-mono text-[11px]">
                          {attr.source_date || '—'}
                        </td>
                        <td className="py-2.5 text-right pr-3 font-mono">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {attr.confidence_score}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Plain Language Reasons for Confidence */}
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Plain-Language Confidence Explanation
                </div>
                <ul className="text-xs text-emerald-950 space-y-1.5 list-disc pl-4 m-0">
                  {passport.confidence_breakdown_reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              {/* Cryptographic Hash */}
              <div className="p-3 rounded-lg bg-slate-100 font-mono text-[11px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block">TAMPER-EVIDENT FEATURE HASH (SHA-256):</span>
                <span className="break-all">{passport.feature_hash}</span>
              </div>
            </div>
          )}

          {activeTab === 'lineage' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500">
                Timeline tracking all historical events (1998 Revenue Settlement → 2025 Municipal → 2026 RTK-GNSS Conflation).
              </div>
              <div className="relative border-l-2 border-emerald-500/40 ml-4 space-y-6 py-2">
                {passport.lineage_events.map((ev, idx) => (
                  <div key={idx} className="relative pl-6">
                    <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white ring-2 ring-emerald-500/30"></span>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">{ev.event_type}</span>
                        <span className="font-mono text-slate-500 text-[11px]">{ev.event_date}</span>
                      </div>
                      <p className="text-xs text-slate-700 m-0">{ev.description}</p>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Source Dataset: <span className="font-semibold text-emerald-700">{ev.source_dataset}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'versions' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500">
                <strong>Differentiator:</strong> Originals are never overwritten. Every revision creates a permanent geometry version.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {passport.geometry_versions.map((ver) => (
                  <div key={ver.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-slate-200 text-slate-800">
                        Version {ver.version_num} ({ver.status.toUpperCase()})
                      </span>
                      <span className="font-bold text-slate-900 text-xs">{ver.area_sqm} m²</span>
                    </div>
                    <div className="text-xs text-slate-600">
                      <strong>Source:</strong> {ver.source_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      <strong>Reason:</strong> {ver.change_reason || 'Initial Ingestion'}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Recorded: {ver.created_at.split('T')[0]} by {ver.created_by}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'correction' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1">
                <span className="font-bold block">Proposed Reconciled Correction</span>
                <p className="m-0">
                  {passport.proposed_correction?.rule_applied || 'Authority Rule #1: RTK Survey high-precision boundary supersedes 1998 revenue sketch.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-slate-500 block font-medium">Historical Revenue Area</span>
                  <span className="text-xl font-bold text-slate-800">
                    {passport.proposed_correction?.before_area || passport.area} m²
                  </span>
                  <span className="text-[11px] text-slate-500 block">1998 Village Cadastre</span>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <span className="text-emerald-700 block font-medium">Reconciled Survey Area</span>
                  <span className="text-xl font-bold text-emerald-800">
                    {passport.proposed_correction?.after_area || passport.area} m²
                  </span>
                  <span className="text-[11px] text-emerald-600 block">2026 RTK-GNSS CORS Conflation</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
