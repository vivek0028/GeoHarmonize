import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { FloatingNav, NavTab } from './components/FloatingNav';
import { DashboardView } from './components/DashboardView';
import { DataView } from './components/DataView';
import { MapView } from './components/MapView';
import { ReviewView } from './components/ReviewView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { api } from './services/api';
import { DashboardStats, Dataset, Conflict, User } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [currentUser, setCurrentUser] = useState<User>({
    id: 2,
    name: 'Alex Mercer',
    email: 'analyst@geoharmonize.gov',
    role: 'GIS_ANALYST',
    department: 'Directorate of Land Records & Cadastral GIS'
  });

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [mapLayersData, setMapLayersData] = useState<any>(null);
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);

  // Initial load
  useEffect(() => {
    refreshAllData();
  }, []);

  const refreshAllData = async () => {
    setIsRefreshing(true);
    try {
      const [statsData, datasetsData, conflictsData, layersData] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getDatasets().catch(() => []),
        api.getConflicts().catch(() => []),
        api.getMapLayers().catch(() => null)
      ]);

      if (statsData) setStats(statsData);
      setDatasets(datasetsData);
      setConflicts(conflictsData);
      if (layersData) setMapLayersData(layersData);
    } catch (err) {
      console.error('Data refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSwitchRole = (role: 'ADMIN' | 'GIS_ANALYST') => {
    if (role === 'ADMIN') {
      setCurrentUser({
        id: 1,
        name: 'JD Admin (Director)',
        email: 'admin@geoharmonize.gov',
        role: 'ADMIN',
        department: 'Cadastral Administration & Revenue'
      });
    } else {
      setCurrentUser({
        id: 2,
        name: 'Alex Mercer',
        email: 'analyst@geoharmonize.gov',
        role: 'GIS_ANALYST',
        department: 'Directorate of Land Records & Cadastral GIS'
      });
    }
  };

  const handleSearchParcel = (parcelId: string) => {
    setSelectedParcelId(parcelId);
    setActiveTab('map');
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

  const handleResolveConflict = async (conflictId: number, action: string, customValue?: string) => {
    await api.resolveConflict(conflictId, action, customValue);
    await refreshAllData();
  };

  const pendingConflictsCount = conflicts.filter((c) => c.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-emerald-200">
      {/* Top Header */}
      <Header
        user={currentUser}
        onSwitchRole={handleSwitchRole}
        onSearchParcel={handleSearchParcel}
        pendingConflictsCount={pendingConflictsCount}
        onTriggerRefresh={refreshAllData}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full relative">
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
              onNavigateReview={() => {
                setActiveTab('review');
              }}
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
              auditLogs={stats?.audit_logs || []}
            />
          )}

          {activeTab === 'reports' && <ReportsView apiClient={api} />}

          {activeTab === 'settings' && <SettingsView auditLogs={stats?.audit_logs || []} />}
        </ErrorBoundary>
      </main>

      {/* Floating Pill Navigation (PRD Section 34-36) */}
      <FloatingNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingConflictsCount={pendingConflictsCount}
      />
    </div>
  );
}

export default App;
