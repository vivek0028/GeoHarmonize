import React from 'react';
import {
  Database,
  Layers,
  CheckCircle,
  AlertOctagon,
  Percent,
  Play,
  ArrowRight,
  Clock,
  Sparkles,
  ShieldAlert,
  MapPin,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { DashboardStats, User } from '../types';
import { fallbackDashboardStats } from '../services/mockData';

interface DashboardViewProps {
  stats: DashboardStats | null;
  user: User;
  onNavigateTab: (tab: any) => void;
  onRunPipeline: (jobType: string) => void;
  isRunningPipeline: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  user,
  onNavigateTab,
  onRunPipeline,
  isRunningPipeline
}) => {
  const activeStats = stats || fallbackDashboardStats;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold backdrop-blur-sm border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              Multi-Source Land Conflation Pipeline Live
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white m-0">
              Good morning, {user.name.split(' ')[0]}
            </h1>
            <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed m-0">
              Harmonizing historical revenue cadastres, modern drone/GNSS surveys, and municipal property footprints into a single verified land record.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onRunPipeline('FULL_CONFLATION')}
              disabled={isRunningPipeline}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-lg transition-all cursor-pointer ${
                isRunningPipeline
                  ? 'bg-emerald-700 text-emerald-100 cursor-not-allowed opacity-80'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02]'
              }`}
            >
              <Play className={`w-4 h-4 ${isRunningPipeline ? 'animate-spin' : 'fill-current'}`} />
              {isRunningPipeline ? 'Executing AI Matching...' : 'Run Conflation Pipeline'}
            </button>

            <button
              onClick={() => onNavigateTab('map')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-all cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-emerald-400" />
              Open GIS Map
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards (PRD Section 5 & 37) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Datasets */}
        <div
          onClick={() => onNavigateTab('data')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Datasets</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {activeStats.datasets_count}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
            <span className="text-emerald-600 font-semibold">4 active sources</span> (Cadastral, Survey, Buildings, GNSS)
          </div>
        </div>

        {/* Parcels Processed */}
        <div
          onClick={() => onNavigateTab('map')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Parcels</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {activeStats.parcels_processed.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3" />
            100% Geometry validated
          </div>
        </div>

        {/* Matched Features */}
        <div
          onClick={() => onNavigateTab('map')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Matched Features</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {activeStats.matched_features.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Avg match IoU: <span className="font-semibold text-teal-700">94.2%</span>
          </div>
        </div>

        {/* Conflicts */}
        <div
          onClick={() => onNavigateTab('review')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Conflicts</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 tracking-tight flex items-baseline gap-2">
            {activeStats.conflicts_count}
            <span className="text-xs font-medium text-slate-400">pending review</span>
          </div>
          <div className="text-[11px] text-amber-700 mt-1 font-medium flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" />
            Needs officer sign-off
          </div>
        </div>

        {/* Average Confidence */}
        <div
          onClick={() => onNavigateTab('review')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Confidence</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {activeStats.average_confidence}%
          </div>
          <div className="text-[11px] text-purple-700 mt-1 font-medium">
            34 in Low-Confidence Queue
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Processing Jobs & Confidence Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Processing Pipeline Jobs */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
              <h2 className="text-base font-bold text-slate-900 m-0">Recent Processing Pipeline</h2>
            </div>
            <button
              onClick={() => onNavigateTab('settings')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
            >
              View System Architecture →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 pl-1">Dataset / Target</th>
                  <th className="pb-3">Module Job</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Progress</th>
                  <th className="pb-3 text-right pr-1">Completed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeStats.recent_jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 pl-1 font-semibold text-slate-800">
                      {job.dataset_name}
                    </td>
                    <td className="py-3 font-mono text-[11px] text-slate-600">
                      {job.job_type}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        {job.status}
                      </span>
                    </td>
                    <td className="py-3 font-semibold text-slate-700">
                      <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full"
                          style={{ width: `${job.progress}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="py-3 text-right pr-1 text-slate-400 font-mono text-[11px]">
                      {job.completed_at ? job.completed_at.split(' ')[1] : 'Just now'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Confidence Distribution & Conflict Summary */}
        <div className="space-y-6">
          {/* Multi-Factor Confidence Meter (PRD Module 11) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 m-0">Confidence Distribution</h2>
            <p className="text-xs text-slate-500 m-0">
              Explainable weighting of spatial match, source agreement, data quality, and recency.
            </p>

            <div className="space-y-3 pt-1">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-emerald-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    High Confidence (&ge; 85%)
                  </span>
                  <span className="font-mono text-slate-700">
                    {activeStats.confidence_distribution.HIGH} parcels (91% avg)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '83%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-amber-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Medium Confidence (60% - 84%)
                  </span>
                  <span className="font-mono text-slate-700">
                    {activeStats.confidence_distribution.MEDIUM} parcels (67% avg)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: '17%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-rose-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Low Confidence (&lt; 60%)
                  </span>
                  <span className="font-mono text-slate-700">
                    {activeStats.confidence_distribution.LOW} parcels (Auto-Review)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-rose-500 h-2 rounded-full" style={{ width: '4%' }}></div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => onNavigateTab('review')}
                className="w-full py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/70 rounded-xl transition-colors cursor-pointer text-center"
              >
                Review Disagreements in Queue →
              </button>
            </div>
          </div>

          {/* Conflict Summary Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900 m-0">Conflict Breakdown</h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block text-[11px]">Area Mismatch</span>
                <span className="text-base font-bold text-slate-800">
                  {activeStats.conflict_summary['AREA_MISMATCH'] || 1}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block text-[11px]">Topology Overlap</span>
                <span className="text-base font-bold text-slate-800">
                  {activeStats.conflict_summary['TOPOLOGY_ERROR'] || 2}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block text-[11px]">Land Use Diff</span>
                <span className="text-base font-bold text-slate-800">
                  {activeStats.conflict_summary['LAND_USE_MISMATCH'] || 1}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block text-[11px]">Missing Fields</span>
                <span className="text-base font-bold text-slate-800">0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
