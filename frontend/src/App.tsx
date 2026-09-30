import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { FloatingNav, NavTab } from './components/FloatingNav';
import { DashboardView } from './components/DashboardView';
import { DataView } from './components/DataView';
import { MapView } from './components/MapView';
import { ReviewView } from './components/ReviewView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { ParcelsView } from './components/ParcelsView';
import { PassportModal } from './components/PassportModal';
import { EvidenceGraphModal } from './components/EvidenceGraphModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { api } from './services/api';
import {
  fallbackDashboardStats,
  fallbackDatasets,
  fallbackConflicts,
  fallbackMapLayers
} from './services/mockData';
import { DashboardStats, Dataset, Conflict, User } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [currentUser, setCurrentUser] = useState<User>({
    id: 2,
    name: 'Alex Mercer',
    email: 'analyst@geoharmonize.gov',
    role: 'ANALYST',
    department: 'Directorate of Land Records & Cadastral GIS'
  });

  // Cached PostGIS state
  const [stats, setStats] = useState<DashboardStats>(fallbackDashboardStats);
  const [datasets, setDatasets] = useState<Dataset[]>(fallbackDatasets);
  const [conflicts, setConflicts] = useState<Conflict[]>(fallbackConflicts);
  const [mapLayersData, setMapLayersData] = useState<any>(fallbackMapLayers);
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [selectedPassportParcelId, setSelectedPassportParcelId] = useState<string | null>(null);
  const [selectedEvidenceParcelId, setSelectedEvidenceParcelId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);
  const [isLiveBackend, setIsLiveBackend] = useState(false);

  // Initial load
  useEffect(() => {
    refreshAllData();
  }, []);

  const refreshAllData = async () => {
    setIsRefreshing(true);
    try {
      const [statsData, datasetsData, conflictsData, layersData] = await Promise.all([
        api.getDashboardStats().catch(() => fallbackDashboardStats),
        api.getDatasets().catch(() => fallbackDatasets),
        api.getConflicts().catch(() => fallbackConflicts),
        api.getMapLayers().catch(() => fallbackMapLayers)
      ]);

      if (statsData) setStats(statsData);
      if (datasetsData && datasetsData.length > 0) setDatasets(datasetsData);
      if (conflictsData && conflictsData.length > 0) setConflicts(conflictsData);
      if (layersData) setMapLayersData(layersData);

      setIsLiveBackend(api.getIsLiveBackend());
    } catch (err) {
      console.warn('Data refresh fell back to PostGIS cache:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSwitchRole = (role: 'APPROVER' | 'ANALYST' | 'UPLOADER' | 'READ_ONLY') => {
    switch (role) {
      case 'APPROVER':
        setCurrentUser({
          id: 1,
          name: 'JD Admin (Director)',
          email: 'director@geoharmonize.gov',
          role: 'APPROVER',
          department: 'State Land Revenue Commission'
        });
        break;
      case 'ANALYST':
        setCurrentUser({
          id: 2,
          name: 'Alex Mercer',
          email: 'analyst@geoharmonize.gov',
          role: 'ANALYST',
          department: 'Directorate of Land Records & Cadastral GIS'
        });
        break;
      case 'UPLOADER':
        setCurrentUser({
          id: 3,
          name: 'Rohan Sharma',
          email: 'surveyor@geoharmonize.gov',
          role: 'UPLOADER',
          department: 'Field Survey & Drone Operations Wing'
        });
        break;
      case 'READ_ONLY':
        setCurrentUser({
          id: 4,
          name: 'Public Inquirer',
          email: 'citizen@gov.in',
          role: 'READ_ONLY',
          department: 'Citizen Transparency Portal'
        });
        break;
    }
  };

  const handleSearchParcel = (parcelId: string) => {
    setSelectedParcelId(parcelId);
    setSelectedPassportParcelId(parcelId);
  };

  const handleRunPipeline = async (jobType: string) => {
    setIsRunningPipeline(true);
    try {
      await api.runPipelineJob(jobType);
      await refreshAllData();
    } catch (err: any) {
      alert('Pipeline execution error: ' + err.message);
    } finally {
      setIsRunningPipeline(false);
    }
  };

  const handleResolveConflict = async (
    conflictId: number,
    action: string,
    customValue?: string,
    reason?: string
  ) => {
    await api.resolveConflict(conflictId, action, customValue, reason);
    await refreshAllData();
  };

  const pendingConflictsCount = conflicts.filter((c) => c.status === 'PENDING').length;
  const totalParcelsCount = stats?.parcels_processed ?? 200;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-emerald-200">
      {/* Top Header */}
      <Header
        user={currentUser}
        onSwitchRole={handleSwitchRole}
        onSearchParcel={handleSearchParcel}
        onOpenPassport={(pId) => setSelectedPassportParcelId(pId)}
        pendingConflictsCount={pendingConflictsCount}
        totalParcelsCount={totalParcelsCount}
        onTriggerRefresh={refreshAllData}
        isRefreshing={isRefreshing}
        isLiveBackend={isLiveBackend}
      />

      {/* Main Content Area with Bottom Padding to never be covered by Floating Nav */}
      <main className="flex-1 w-full relative pb-32">
        <ErrorBoundary fallbackTitle="View Rendering Notice">
          {activeTab === 'overview' && (
            <DashboardView
              stats={stats}
              user={currentUser}
              onNavigateTab={setActiveTab}
              onRunPipeline={handleRunPipeline}
              isRunningPipeline={isRunningPipeline}
            />
          )}

          {activeTab === 'parcels' && (
            <ParcelsView
              onOpenPassport={(pId) => setSelectedPassportParcelId(pId)}
              onOpenEvidenceGraph={(pId) => setSelectedEvidenceParcelId(pId)}
            />
          )}

          {activeTab === 'data' && (
            <DataView
              datasets={datasets}
              onUploadSuccess={refreshAllData}
              onNavigateMap={() => setActiveTab('map')}
              apiClient={api}
            />
          )}

          {activeTab === 'map' && (
            <MapView
              mapLayersData={mapLayersData}
              selectedParcelId={selectedParcelId}
              onSelectParcel={setSelectedParcelId}
              onNavigateReview={() => setActiveTab('review')}
              onOpenPassport={(pId) => setSelectedPassportParcelId(pId)}
              apiClient={api}
            />
          )}

          {activeTab === 'review' && (
            <ReviewView
              conflicts={conflicts}
              onResolveConflict={handleResolveConflict}
              onInspectOnMap={(parcelId) => {
                setSelectedParcelId(parcelId);
                setActiveTab('map');
              }}
              onOpenPassport={(pId) => setSelectedPassportParcelId(pId)}
              onOpenEvidenceGraph={(pId) => setSelectedEvidenceParcelId(pId)}
              auditLogs={stats?.audit_logs || []}
              apiClient={api}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'reports' && <ReportsView apiClient={api} />}

          {activeTab === 'settings' && (
            <SettingsView auditLogs={stats?.audit_logs || []} apiClient={api} />
          )}
        </ErrorBoundary>
      </main>

      {/* Floating Pill Navigation */}
      <FloatingNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingConflictsCount={pendingConflictsCount}
      />

      {/* Parcel Reconciliation Passport Modal [Differentiator] */}
      {selectedPassportParcelId && (
        <PassportModal
          parcelId={selectedPassportParcelId}
          onClose={() => setSelectedPassportParcelId(null)}
          onOpenEvidenceGraph={(pId) => {
            setSelectedPassportParcelId(null);
            setSelectedEvidenceParcelId(pId);
          }}
          onRefreshData={refreshAllData}
          onOpenMap={(pId) => {
            setSelectedParcelId(pId);
            setSelectedPassportParcelId(null);
            setActiveTab('map');
          }}
          onOpenLedger={() => {
            setSelectedPassportParcelId(null);
            setActiveTab('settings');
          }}
        />
      )}

      {/* Evidence Graph Modal [Differentiator] */}
      {selectedEvidenceParcelId && (
        <EvidenceGraphModal
          parcelId={selectedEvidenceParcelId}
          onClose={() => setSelectedEvidenceParcelId(null)}
          onOpenPassport={(pId) => {
            setSelectedEvidenceParcelId(null);
            setSelectedPassportParcelId(pId);
          }}
        />
      )}
    </div>
  );
}

export default App;
