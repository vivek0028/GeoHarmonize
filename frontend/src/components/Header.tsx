import React, { useState } from 'react';
import { Layers, Search, Bell, Shield, User as UserIcon, CheckCircle2, RefreshCw } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  user: User;
  onSwitchRole: (role: 'ADMIN' | 'GIS_ANALYST') => void;
  onSearchParcel: (parcelId: string) => void;
  pendingConflictsCount: number;
  onTriggerRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onSwitchRole,
  onSearchParcel,
  pendingConflictsCount,
  onTriggerRefresh,
  isRefreshing
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearchParcel(searchInput.trim().toUpperCase());
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-slate-900">GeoHarmonize</span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded">
                v1.0 GIS Core
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block font-medium">
              One Map. Multiple Sources. Trusted Land Records.
            </p>
          </div>
        </div>

        {/* Center: Search Parcel */}
        <div className="flex-1 max-w-md mx-2 hidden md:block">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search parcel by ID (e.g. P-101, P-102)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-20 py-1.5 text-xs bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-full outline-none transition-all placeholder:text-slate-400 font-mono"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-0.5 text-[11px] font-semibold bg-slate-200/70 hover:bg-slate-300 text-slate-700 rounded-full transition-colors cursor-pointer"
            >
              Locate
            </button>
          </form>
        </div>

        {/* Right: Engine Status, Notifications, Role Switcher */}
        <div className="flex items-center gap-3">
          {/* Refresh Pipeline Button */}
          <button
            onClick={onTriggerRefresh}
            title="Refresh Data & Processing Status"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          {/* Engine Status Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            PostGIS & AI Conflation Active
          </div>

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

          {/* User Profile & Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-all cursor-pointer text-left"
            >
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
                {user.role === 'ADMIN' ? 'JD' : 'AM'}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-slate-800 leading-tight">
                  {user.name.split(' ')[0]}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {user.role === 'ADMIN' ? 'Administrator' : 'GIS Analyst'}
                </div>
              </div>
            </button>

            {/* Dropdown Menu */}
            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-800">{user.name}</p>
                  <p className="text-[11px] text-slate-500">{user.email}</p>
                  <p className="text-[10px] text-emerald-600 font-medium mt-0.5">{user.department}</p>
                </div>
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Switch Active Role
                  </div>
                  <button
                    onClick={() => {
                      onSwitchRole('GIS_ANALYST');
                      setShowRoleMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                      user.role === 'GIS_ANALYST' ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <UserIcon className="w-3.5 h-3.5" />
                      GIS Analyst (Main User)
                    </span>
                    {user.role === 'GIS_ANALYST' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>

                  <button
                    onClick={() => {
                      onSwitchRole('ADMIN');
                      setShowRoleMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                      user.role === 'ADMIN' ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5" />
                      Administrator
                    </span>
                    {user.role === 'ADMIN' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
