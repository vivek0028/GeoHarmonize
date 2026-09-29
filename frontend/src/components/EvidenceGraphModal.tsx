import React, { useState, useEffect } from 'react';
import { X, Share2, Layers, Shield, FileText, CheckCircle2, AlertTriangle, ArrowRight, Info } from 'lucide-react';
import { EvidenceGraph, EvidenceNode, EvidenceEdge } from '../types';
import { api } from '../services/api';

interface EvidenceGraphModalProps {
  parcelId: string;
  onClose: () => void;
  onOpenPassport?: (parcelId: string) => void;
}

export const EvidenceGraphModal: React.FC<EvidenceGraphModalProps> = ({
  parcelId,
  onClose,
  onOpenPassport
}) => {
  const [graphData, setGraphData] = useState<EvidenceGraph | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<EvidenceNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<EvidenceEdge | null>(null);

  useEffect(() => {
    loadGraph();
  }, [parcelId]);

  const loadGraph = async () => {
    setIsLoading(true);
    try {
      const data = await api.getParcelEvidence(parcelId);
      setGraphData(data);
      if (data.nodes.length > 0) setSelectedNode(data.nodes[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'PARCEL': return 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-600/30';
      case 'SURVEY': return 'bg-teal-600 text-white border-teal-700 shadow-teal-600/30';
      case 'SOURCE_RECORD': return 'bg-amber-600 text-white border-amber-700 shadow-amber-600/30';
      case 'DOCUMENT': return 'bg-blue-600 text-white border-blue-700 shadow-blue-600/30';
      case 'DECISION': return 'bg-purple-600 text-white border-purple-700 shadow-purple-600/30';
      default: return 'bg-slate-700 text-white border-slate-800 shadow-slate-700/30';
    }
  };

  const getEdgeBadge = (type: string) => {
    switch (type) {
      case 'matched_to': return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'supersedes': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'contradicts': return 'bg-red-100 text-red-800 border-red-300';
      case 'corroborated_by': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'split_from': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'merged_into': return 'bg-amber-100 text-amber-800 border-amber-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-900 p-5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white m-0">Evidence Graph: {parcelId}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {graphData?.ulpin || 'Bhu-Aadhaar'}
                </span>
              </div>
              <p className="text-xs text-slate-400 m-0">
                Connected surveys, records, documents, and adjudication decisions linked with typed evidence relationships.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenPassport && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPassport(parcelId);
                }}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                View Passport
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Canvas & Sidebar */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-[460px]">
          {/* Visual Network Canvas */}
          <div className="flex-1 bg-slate-950 p-6 flex flex-col justify-between relative overflow-hidden">
            {/* Background grid pattern */}
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

            {/* Top legend */}
            <div className="relative z-10 flex flex-wrap gap-2 text-[11px] font-medium">
              <span className="px-2 py-1 rounded-md bg-emerald-950 border border-emerald-800 text-emerald-300">
                ● Parcel Node
              </span>
              <span className="px-2 py-1 rounded-md bg-teal-950 border border-teal-800 text-teal-300">
                ● 2026 RTK Survey
              </span>
              <span className="px-2 py-1 rounded-md bg-amber-950 border border-amber-800 text-amber-300">
                ● 1998 Cadastre
              </span>
              <span className="px-2 py-1 rounded-md bg-blue-950 border border-blue-800 text-blue-300">
                ● Municipal Tax Doc
              </span>
            </div>

            {/* Central Node Display */}
            {isLoading ? (
              <div className="flex items-center justify-center h-64 text-emerald-400 text-xs">
                Loading Evidence Network...
              </div>
            ) : (
              <div className="relative z-10 py-12 flex flex-col items-center justify-center space-y-8">
                {/* Top Nodes */}
                <div className="flex flex-wrap items-center justify-center gap-6">
                  {graphData?.nodes.filter(n => n.node_type !== 'PARCEL').map(node => (
                    <button
                      key={node.id}
                      onClick={() => {
                        setSelectedNode(node);
                        setSelectedEdge(null);
                      }}
                      className={`p-3.5 rounded-2xl border text-left shadow-lg transition-all transform hover:scale-105 cursor-pointer max-w-[200px] ${
                        getNodeColor(node.node_type)
                      } ${selectedNode?.id === node.id ? 'ring-2 ring-white scale-105' : 'opacity-90'}`}
                    >
                      <span className="text-[10px] block opacity-80 uppercase tracking-wider font-bold">
                        {node.node_type}
                      </span>
                      <span className="text-xs font-bold block truncate">
                        {node.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Edges visualization */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {graphData?.edges.map(edge => (
                    <button
                      key={edge.id}
                      onClick={() => {
                        setSelectedEdge(edge);
                        setSelectedNode(null);
                      }}
                      className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer shadow-sm ${
                        getEdgeBadge(edge.edge_type)
                      } ${selectedEdge?.id === edge.id ? 'ring-2 ring-emerald-500 scale-105' : ''}`}
                    >
                      → {edge.edge_type.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                {/* Central Parcel Target Node */}
                {graphData?.nodes.filter(n => n.node_type === 'PARCEL').map(node => (
                  <button
                    key={node.id}
                    onClick={() => {
                      setSelectedNode(node);
                      setSelectedEdge(null);
                    }}
                    className={`p-5 rounded-2xl border-2 text-center shadow-2xl transition-all cursor-pointer ${
                      getNodeColor('PARCEL')
                    } ${selectedNode?.id === node.id ? 'ring-4 ring-emerald-400/50 scale-105' : ''}`}
                  >
                    <span className="text-[10px] block opacity-80 uppercase tracking-wider font-bold">
                      CORE RECONCILED PARCEL
                    </span>
                    <span className="text-base font-extrabold block">
                      {node.label}
                    </span>
                    <span className="text-xs opacity-90 block mt-1">
                      Target of Multi-Source Provenance
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Bottom Note */}
            <div className="relative z-10 text-[11px] text-slate-400">
              Click any node or relationship edge to inspect cryptographic provenance metadata.
            </div>
          </div>

          {/* Details Sidebar */}
          <div className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-slate-200 p-5 space-y-4 text-xs">
            <h3 className="font-bold text-slate-900 text-sm m-0 border-b border-slate-100 pb-2">
              Inspector Details
            </h3>

            {selectedNode && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Node Type
                  </span>
                  <div className="font-bold text-slate-900 text-sm">
                    {selectedNode.node_type}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Label
                  </span>
                  <div className="font-semibold text-slate-800">
                    {selectedNode.label}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Metadata Payload
                  </span>
                  <pre className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-700 overflow-x-auto">
                    {JSON.stringify(selectedNode.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {selectedEdge && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Relationship Edge
                  </span>
                  <div className="font-bold text-slate-900 text-sm">
                    {selectedEdge.edge_type.toUpperCase()}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Confidence Weight
                  </span>
                  <div className="font-mono text-emerald-700 font-bold text-sm">
                    {selectedEdge.weight * 100}%
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Evidence Verification Details
                  </span>
                  <pre className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-700 overflow-x-auto">
                    {JSON.stringify(selectedEdge.evidence_details, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
