import React, { useState } from 'react';
import { Layers, Search, Bell, Shield, User as UserIcon, CheckCircle2, RefreshCw, Database, Server, X, Wifi, WifiOff } from 'lucide-react';
import { User } from '../types';
import { api, getApiBaseUrl, setCustomBackendUrl } from '../services/api';

interface HeaderProps {
  user: User;
  onSwitchRole: (role: 'APPROVER' | 'ANALYST' | 'UPLOADER' | 'READ_ONLY') => void;
  onSearchParcel: (parcelId: string) => void;
  onOpenPassport?: (parcelId: string) => void;
  pendingConflictsCount: number;
  totalParcelsCount?: number;
  onTriggerRefresh: () => void;
  isRefreshing: boolean;
  isLiveBackend: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onSwitchRole,
  onSearchParcel,
  onOpenPassport,
  pendingConflictsCount,
  totalParcelsCount = 200,
  onTriggerRefresh,
  isRefreshing,
  isLiveBackend
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showBackendModal, setShowBackendModal] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState(() => {
    return localStorage.getItem('GEOHARMONIZE_BACKEND_URL') || '';
  });
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      const q = searchInput.trim().toUpperCase();
      if (onOpenPassport) {
        onOpenPassport(q);
      } else {
        onSearchParcel(q);
      }
    }
  };

  const handleTestAndSave = async (urlToTest: string) => {
    setTestStatus('testing');
    const isHealthy = await api.checkHealth(urlToTest);
    if (isHealthy) {
      setTestStatus('success');
      setCustomBackendUrl(urlToTest);
      setTimeout(() => {
        setShowBackendModal(false);
        onTriggerRefresh();
      }, 800);
    } else {
      setTestStatus('failed');
    }
  };

  const handleResetUrl = () => {
    setCustomBackendUrl(null);
    setCustomUrlInput('');
    setTestStatus('idle');
    setShowBackendModal(false);
    onTriggerRefresh();
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-2.5 transition-all shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & New Positioning Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-700 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-slate-900">GeoHarmonize</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100/70 text-emerald-800 border border-emerald-300/60 rounded">
                Parcel-Trust v2.0
              </span>
            </div>
            {/* New Positioning Line */}
            <p className="text-[11px] text-slate-500 hidden sm:block font-medium italic">
              Every parcel has a history. Every decision has evidence.
            </p>
          </div>
        </div>

        {/* Center: Search Parcel -> Opens Passport */}
        <div className="flex-1 max-w-md mx-2 hidden md:block">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search parcel by ID or ULPIN (e.g. P-101, DL-08...)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-24 py-1.5 text-xs bg-slate-100/90 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-full outline-none transition-all placeholder:text-slate-400 font-mono"
            />
            <button
              type="submit"
              title="Locate and open Parcel Reconciliation Passport"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-full transition-colors cursor-pointer shadow-xs"
            >
              Passport
            </button>
          </form>
        </div>

        {/* Right: Live Status, PostGIS Badge, Notifications, Role Switcher */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Refresh Pipeline Button */}
          <button
            onClick={onTriggerRefresh}
            title="Refresh Data & Processing Status"
            className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          {/* Section B. Header Live Case Status */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100/80 border border-slate-200 text-slate-700 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>{pendingConflictsCount} cases need review • {totalParcelsCount} parcels loaded</span>
          </div>

          {/* PostGIS Live Status Badge */}
          <button
            onClick={() => setShowBackendModal(true)}
            title="Click to view or configure PostGIS backend connection"
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              isLiveBackend
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isLiveBackend ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            ></span>
            <span>{isLiveBackend ? 'PostGIS 16 Connected' : 'Reconnecting PostGIS...'}</span>
          </button>

          {/* Notification bell */}
          <div className="relative">
            <button
              title={`${pendingConflictsCount} Pending Conflicts`}
              className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {pendingConflictsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white"></span>
              )}
            </button>
          </div>

          {/* User Profile & Role Switcher (Section A.9: uploader, analyst, approver, read_only) */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-all cursor-pointer text-left"
            >
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
                {user.role === 'APPROVER' || user.role === 'ADMIN' ? 'JD' : (user.role === 'UPLOADER' ? 'PS' : 'AM')}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-slate-800 leading-tight">
                  {user.name.split(' ')[0]}
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">
                  {user.role}
                </div>
              </div>
            </button>

            {/* Dropdown Menu */}
            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">{user.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-md">
                    Role: {user.role}
                  </span>
                </div>

                <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Active User Role (RBAC)
                </div>

                <button
                  onClick={() => {
                    onSwitchRole('ANALYST');
                    setShowRoleMenu(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    user.role === 'ANALYST' ? 'text-emerald-600 font-semibold bg-emerald-50/50' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Alex Mercer (Analyst)</span>
                  </div>
                  {user.role === 'ANALYST' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </button>

                <button
                  onClick={() => {
                    onSwitchRole('APPROVER');
                    setShowRoleMenu(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    user.role === 'APPROVER' || user.role === 'ADMIN' ? 'text-emerald-600 font-semibold bg-emerald-50/50' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" />
                    <span>JD Admin (Director / Approver)</span>
                  </div>
                  {(user.role === 'APPROVER' || user.role === 'ADMIN') && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </button>

                <button
                  onClick={() => {
                    onSwitchRole('UPLOADER');
                    setShowRoleMenu(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    user.role === 'UPLOADER' ? 'text-emerald-600 font-semibold bg-emerald-50/50' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Pooja Sharma (Uploader)</span>
                  </div>
                  {user.role === 'UPLOADER' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </button>

                <button
                  onClick={() => {
                    onSwitchRole('READ_ONLY');
                    setShowRoleMenu(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    user.role === 'READ_ONLY' ? 'text-emerald-600 font-semibold bg-emerald-50/50' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Public Audit Officer (Read-Only)</span>
                  </div>
                  {user.role === 'READ_ONLY' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </button>

                <div className="border-t border-slate-100 mt-2 pt-2 px-3">
                  <button
                    onClick={() => {
                      setShowRoleMenu(false);
                      setShowBackendModal(true);
                    }}
                    className="w-full text-left text-xs text-slate-600 hover:text-emerald-700 flex items-center gap-2 py-1"
                  >
                    <Server className="w-3.5 h-3.5" />
                    <span>Configure Backend URL</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Backend Configuration Modal */}
      {showBackendModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base m-0">PostGIS Backend Connection</h3>
                  <p className="text-xs text-slate-500 m-0">FastAPI + PostgreSQL 16 + PostGIS 3.4</p>
                </div>
              </div>
              <button
                onClick={() => setShowBackendModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                isLiveBackend
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/70 border-amber-200 text-amber-900'
              }`}
            >
              {isLiveBackend ? (
                <Wifi className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <WifiOff className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 text-xs">
                <p className="font-bold m-0">
                  {isLiveBackend ? 'Connected to Live PostGIS Engine (Port 5435/8000)' : 'Reconnecting to PostGIS Engine...'}
                </p>
                <p className="m-0 text-slate-600">
                  Active Endpoint: <code>{getApiBaseUrl()}</code>
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Backend API URL (Render or Localhost)
              </label>
              <input
                type="text"
                placeholder="e.g. https://geoharmonize.onrender.com or http://127.0.0.1:8000"
                value={customUrlInput}
                onChange={(e) => {
                  setCustomUrlInput(e.target.value);
                  setTestStatus('idle');
                }}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-500 outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-slate-400 font-medium">Presets:</span>
              <button
                type="button"
                onClick={() => setCustomUrlInput('http://127.0.0.1:8000')}
                className="px-2 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono cursor-pointer"
              >
                Localhost:8000
              </button>
              <button
                type="button"
                onClick={handleResetUrl}
                className="px-2 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Reset Default
              </button>
            </div>

            {testStatus === 'failed' && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                Could not reach <code>{customUrlInput}</code>. Ensure the backend server is running.
              </div>
            )}

            {testStatus === 'success' && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Connection verified! Saved as active backend.
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBackendModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={testStatus === 'testing' || !customUrlInput.trim()}
                onClick={() => handleTestAndSave(customUrlInput.trim())}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-sm"
              >
                {testStatus === 'testing' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  'Test & Connect'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
