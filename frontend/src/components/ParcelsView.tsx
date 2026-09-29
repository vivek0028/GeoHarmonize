import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Share2,
  GitBranch,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { IntegratedRecord } from '../types';
import { api } from '../services/api';

interface ParcelsViewProps {
  onOpenPassport: (parcelId: string) => void;
  onOpenEvidenceGraph: (parcelId: string) => void;
}

export const ParcelsView: React.FC<ParcelsViewProps> = ({
  onOpenPassport,
  onOpenEvidenceGraph
}) => {
  const [parcels, setParcels] = useState<IntegratedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    loadParcels();
  }, [statusFilter]);

  const loadParcels = async () => {
    setIsLoading(true);
    try {
      const data = await api.getParcels(
        searchInput || undefined,
        undefined,
        statusFilter !== 'ALL' ? statusFilter : undefined
      );
      setParcels(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadParcels();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-32 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 m-0">
            Parcel Reconciliation Registry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 m-0">
            Every parcel has a history. Every decision has evidence. Inspect reconciliation passports, lineage timelines, and evidence graphs.
          </p>
        </div>

        <button
          onClick={loadParcels}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          Refresh Registry
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Parcel ID, ULPIN, or Owner..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-20 py-2 text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl outline-none transition-all font-mono"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg cursor-pointer"
          >
            Filter
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto text-xs">
          <span className="text-slate-400 font-medium">Status:</span>
          {['ALL', 'AUTO_MATCHED', 'NEEDS_REVIEW', 'ESCALATED', 'APPROVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {st === 'ALL' ? 'All (200)' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Registry Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 pl-4">Parcel ID &amp; ULPIN</th>
                <th className="py-3">Owner of Record</th>
                <th className="py-3">Area (m²)</th>
                <th className="py-3">Land Use</th>
                <th className="py-3">Confidence</th>
                <th className="py-3">Review Status</th>
                <th className="py-3 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading PostGIS parcels...
                  </td>
                </tr>
              ) : parcels.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No parcels match the selected criteria.
                  </td>
                </tr>
              ) : (
                parcels.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 pl-4">
                      <div className="font-bold text-slate-900">{p.parcel_id}</div>
                      <div className="font-mono text-[10px] text-slate-400">{p.ulpin}</div>
                    </td>
                    <td className="py-3 font-medium text-slate-800">
                      {p.owner_name}
                    </td>
                    <td className="py-3 font-mono font-semibold text-slate-700">
                      {p.area} m²
                    </td>
                    <td className="py-3 text-slate-600">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium">
                        {p.land_use}
                      </span>
                    </td>
                    <td className="py-3 font-mono">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        p.confidence_score >= 85 ? 'bg-emerald-100 text-emerald-800' :
                        p.confidence_score >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {p.confidence_score}%
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                        p.review_status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        p.review_status === 'AUTO_MATCHED' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                        p.review_status === 'NEEDS_REVIEW' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {p.review_status || 'AUTO_MATCHED'}
                      </span>
                    </td>
                    <td className="py-3 text-right pr-4 space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => onOpenPassport(p.parcel_id)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer inline-flex items-center gap-1 shadow-xs"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        Passport
                      </button>
                      <button
                        onClick={() => onOpenEvidenceGraph(p.parcel_id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer inline-flex items-center gap-1"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Graph
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
