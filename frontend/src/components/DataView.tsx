import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Check,
  Database,
  ArrowRight,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { Dataset, ValidationResult } from '../types';

interface DataViewProps {
  datasets: Dataset[];
  onUploadSuccess: () => void;
  onNavigateMap: () => void;
  apiClient: any;
}

export const DataView: React.FC<DataViewProps> = ({
  datasets,
  onUploadSuccess,
  onNavigateMap,
  apiClient
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [datasetType, setDatasetType] = useState('cadastral');
  const [isUploading, setIsUploading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'list'>('upload');
  const [activeValidationDataset, setActiveValidationDataset] = useState<Dataset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    setDatasetName(baseName.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
    setSourceName('Urban Cadastral Survey Division');
    if (file.name.includes('survey')) setDatasetType('survey');
    else if (file.name.includes('building')) setDatasetType('buildings');
    else if (file.name.includes('point') || file.name.endsWith('.csv')) setDatasetType('points');
    else setDatasetType('cadastral');
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !datasetName) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', datasetName);
      formData.append('source', sourceName || 'Field Division');
      formData.append('dataset_type', datasetType);

      const newDs = await apiClient.uploadDataset(formData);
      // Run instant validation
      const val = await apiClient.validateDataset(newDs.id);
      setValidationResult(val);
      setActiveValidationDataset(newDs);
      onUploadSuccess();
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleInspectDataset = async (ds: Dataset) => {
    try {
      const val = await apiClient.validateDataset(ds.id);
      setValidationResult(val);
      setActiveValidationDataset(ds);
      setActiveTab('upload');
    } catch (err: any) {
      alert('Validation failed: ' + err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 m-0">Dataset Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 m-0">
            Ingest heterogeneous GIS datasets: Cadastral GeoJSON, Survey Vectors, Building Footprints, and GNSS RTK Points.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-200/60 p-1 rounded-xl flex items-center text-xs font-semibold">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'upload' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upload & Validate
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Datasets ({datasets.length})
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'upload' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Upload Dropzone & Metadata Form */}
          <div className="lg:col-span-7 space-y-4">
            <form onSubmit={handleUploadSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <h2 className="text-base font-bold text-slate-900 m-0">Upload Geospatial Dataset</h2>

              {/* Large Dropzone (PRD Section 39) */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
                  dragActive
                    ? 'border-emerald-500 bg-emerald-50/50 scale-[1.01]'
                    : selectedFile
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".geojson,.json,.csv,.zip,.shp,.tif,.tiff"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center">
                    <UploadCloud className="w-7 h-7" />
                  </div>

                  {selectedFile ? (
                    <div>
                      <p className="text-sm font-bold text-slate-800 m-0">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500 m-0 mt-1">
                        {(selectedFile.size / 1024).toFixed(1)} KB &bull; Click to change file
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-bold text-slate-800 m-0">Drag &amp; Drop your geospatial file here</p>
                      <p className="text-xs text-slate-500 m-0 mt-1">
                        or <span className="text-emerald-700 font-semibold underline">Browse Files</span> from your workstation
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-slate-200/50 text-[11px] text-slate-600 font-medium">
                    <span>GeoJSON</span>
                    <span>&bull;</span>
                    <span>Shapefile</span>
                    <span>&bull;</span>
                    <span>CSV</span>
                    <span>&bull;</span>
                    <span>GeoTIFF</span>
                  </div>
                </div>
              </div>

              {/* Form Metadata Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dataset Title
                  </label>
                  <input
                    type="text"
                    required
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                    placeholder="e.g. Ward 12 Cadastral Revision"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dataset Category
                  </label>
                  <select
                    value={datasetType}
                    onChange={(e) => setDatasetType(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none"
                  >
                    <option value="cadastral">Cadastral Revenue Records</option>
                    <option value="survey">Drone / Total Station Survey</option>
                    <option value="buildings">Municipal Building Footprints</option>
                    <option value="points">GNSS / Survey Control Points</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Originating Department / Source
                  </label>
                  <input
                    type="text"
                    value={sourceName}
                    onChange={(e) => setSourceName(e.target.value)}
                    placeholder="e.g. Department of Land Records & Survey"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!selectedFile || isUploading}
                className={`w-full py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  !selectedFile || isUploading
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                }`}
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Validating &amp; Ingesting...
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    Upload &amp; Run Automated Validation
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Automated Validation Report Card (PRD Section 7 & 39) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 m-0">Data Validation Report</h2>
                {validationResult && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Passed Core Checks
                  </span>
                )}
              </div>

              {validationResult ? (
                <div className="space-y-4">
                  {/* Validation Checks Checklist */}
                  <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                        File Readable &amp; Parsed
                      </span>
                      <span className="font-semibold text-emerald-700">Valid</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                        Geometry Integrity
                      </span>
                      <span className="font-semibold text-emerald-700">
                        {validationResult.geometry_valid ? 'No Self-Intersections' : 'Issues Found'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                        CRS Coordinate System
                      </span>
                      <span className="font-mono font-semibold text-slate-800">
                        {validationResult.crs_detected}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                        Total Features
                      </span>
                      <span className="font-mono font-semibold text-slate-800">
                        {validationResult.feature_count} features
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium flex items-center gap-2">
                        {validationResult.missing_fields_count === 0 ? (
                          <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        )}
                        Required Schema Fields
                      </span>
                      <span
                        className={`font-semibold ${
                          validationResult.missing_fields_count === 0
                            ? 'text-emerald-700'
                            : 'text-amber-600'
                        }`}
                      >
                        {validationResult.missing_fields_count === 0
                          ? 'All Present'
                          : `${validationResult.missing_fields_count} Missing Values`}
                      </span>
                    </div>
                  </div>

                  {/* Summary Metric Chips */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                      <span className="text-slate-500 block text-[11px]">Harmonized Target</span>
                      <span className="font-bold text-emerald-800">EPSG:4326 (WGS84)</span>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                      <span className="text-slate-500 block text-[11px]">Primary Geometry</span>
                      <span className="font-bold text-blue-800">
                        {validationResult.geometry_types.join(', ') || 'Polygon'}
                      </span>
                    </div>
                  </div>

                  {/* Continue CTA */}
                  <button
                    onClick={onNavigateMap}
                    className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <span>View Harmonized Layer on Map</span>
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <FileText className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs">
                    Upload or select any dataset from the catalog to view automated GIS validation checks.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Full Dataset Catalog Table (PRD Section 38) */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 m-0">Registered Dataset Catalog</h2>
            <span className="text-xs text-slate-500">{datasets.length} active layers</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Name</th>
                  <th className="pb-3">Source Agency</th>
                  <th className="pb-3">Format</th>
                  <th className="pb-3">CRS</th>
                  <th className="pb-3">Features</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {datasets.map((ds) => (
                  <tr key={ds.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 pl-2 font-semibold text-slate-800 flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-emerald-600" />
                      {ds.name}
                    </td>
                    <td className="py-3 text-slate-600">{ds.source}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
                        {ds.file_format}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-600">{ds.crs}</td>
                    <td className="py-3 font-semibold text-slate-700">
                      {ds.feature_count.toLocaleString()}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {ds.status}
                      </span>
                    </td>
                    <td className="py-3 text-right pr-2">
                      <button
                        onClick={() => handleInspectDataset(ds)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      >
                        Inspect Validation
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
