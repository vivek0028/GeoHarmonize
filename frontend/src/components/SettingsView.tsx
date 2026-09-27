import React, { useState } from 'react';
import {
  Cpu,
  Layers,
  Sliders,
  History,
  Shield,
  FileCheck,
  CheckCircle,
  HelpCircle,
  Code
} from 'lucide-react';

interface SettingsViewProps {
  auditLogs: any[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({ auditLogs }) => {
  const [spatialWeight, setSpatialWeight] = useState(0.35);
  const [sourceWeight, setSourceWeight] = useState(0.25);
  const [qualityWeight, setQualityWeight] = useState(0.25);
  const [recencyWeight, setRecencyWeight] = useState(0.15);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 m-0">System Architecture &amp; Governance</h1>
        <p className="text-xs sm:text-sm text-slate-500 m-0">
          Transparency into AI/ML Conflation, Deterministic GIS Algorithms, and Administrative Audit Trails.
        </p>
      </div>

      {/* PRD Section 46: What is Actually AI? */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 m-0">
              Architecture Transparency: AI vs. Deterministic GIS
            </h2>
            <p className="text-xs text-slate-500 m-0">
              Clear engineering boundary between Machine Learning and Exact GIS Geometry Algorithms.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          {/* AI / ML Module */}
          <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200/70 space-y-2">
            <div className="flex items-center gap-2 text-purple-900 font-bold text-xs uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
              AI / ML Conflation
            </div>
            <p className="text-xs text-purple-950 font-semibold m-0">
              Spatial Feature Matching
            </p>
            <ul className="text-[11px] text-purple-900/80 space-y-1 list-disc pl-4 m-0">
              <li>Pairwise shape embeddings</li>
              <li>IoU &amp; centroid proximity</li>
              <li>Compactness &amp; aspect ratio</li>
              <li>Probabilistic match confidence</li>
            </ul>
          </div>

          {/* GIS Algorithms */}
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/70 space-y-2">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              Deterministic GIS
            </div>
            <p className="text-xs text-blue-950 font-semibold m-0">
              Geometric Engines
            </p>
            <ul className="text-[11px] text-blue-900/80 space-y-1 list-disc pl-4 m-0">
              <li>CRS transformation (PyProj)</li>
              <li>Topology overlaps (Shapely)</li>
              <li>Metric area calculation</li>
              <li>Sliver gap detection</li>
            </ul>
          </div>

          {/* Rule Engine */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/70 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-amber-600"></span>
              Rule Engine
            </div>
            <p className="text-xs text-amber-950 font-semibold m-0">
              Governance &amp; Workflow
            </p>
            <ul className="text-[11px] text-amber-900/80 space-y-1 list-disc pl-4 m-0">
              <li>Authority precedence</li>
              <li>Conflict threshold triggers</li>
              <li>Review routing logic</li>
              <li>Schema attribute mapping</li>
            </ul>
          </div>

          {/* Confidence Engine */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/70 space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              Confidence Engine
            </div>
            <p className="text-xs text-emerald-950 font-semibold m-0">
              Multi-Factor Scoring
            </p>
            <ul className="text-[11px] text-emerald-900/80 space-y-1 list-disc pl-4 m-0">
              <li>Spatial match (35%)</li>
              <li>Source agreement (25%)</li>
              <li>Data quality (25%)</li>
              <li>Recency factor (15%)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Multi-Factor Confidence Weights Configuration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900 m-0">
              Confidence Engine Weight Calibration
            </h2>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-500">
            Total Weight: {Math.round((spatialWeight + sourceWeight + qualityWeight + recencyWeight) * 100)}%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex justify-between font-semibold">
              <span>Spatial Match</span>
              <span className="font-mono text-emerald-700">{Math.round(spatialWeight * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.6"
              step="0.05"
              value={spatialWeight}
              onChange={(e) => setSpatialWeight(parseFloat(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex justify-between font-semibold">
              <span>Source Agreement</span>
              <span className="font-mono text-emerald-700">{Math.round(sourceWeight * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.5"
              step="0.05"
              value={sourceWeight}
              onChange={(e) => setSourceWeight(parseFloat(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex justify-between font-semibold">
              <span>Data Quality</span>
              <span className="font-mono text-emerald-700">{Math.round(qualityWeight * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.5"
              step="0.05"
              value={qualityWeight}
              onChange={(e) => setQualityWeight(parseFloat(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex justify-between font-semibold">
              <span>Recency</span>
              <span className="font-mono text-emerald-700">{Math.round(recencyWeight * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.3"
              step="0.05"
              value={recencyWeight}
              onChange={(e) => setRecencyWeight(parseFloat(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Complete Audit Trail Table (PRD Section 32) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-700" />
            <h2 className="text-base font-bold text-slate-900 m-0">Complete Audit Trail Ledger</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">Immutable Log</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-2">Timestamp</th>
                <th className="pb-3">Officer / User</th>
                <th className="pb-3">Action</th>
                <th className="pb-3">Entity</th>
                <th className="pb-3">Previous State</th>
                <th className="pb-3 text-right pr-2">Adjudicated Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80">
                  <td className="py-2.5 pl-2 font-mono text-[11px] text-slate-500">
                    {log.created_at}
                  </td>
                  <td className="py-2.5 font-semibold text-slate-800">{log.user_name}</td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-600 font-medium">
                    {log.entity} ({log.entity_id})
                  </td>
                  <td className="py-2.5 text-slate-500 font-mono text-[11px]">{log.old_value}</td>
                  <td className="py-2.5 text-right pr-2 font-mono font-semibold text-emerald-800 text-[11px]">
                    {log.new_value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
