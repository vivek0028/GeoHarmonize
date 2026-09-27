import React from 'react';
import { LayoutDashboard, Database, MapPin, AlertTriangle, FileSpreadsheet, Sliders } from 'lucide-react';

export type NavTab = 'overview' | 'data' | 'map' | 'review' | 'reports' | 'settings';

interface FloatingNavProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  pendingConflictsCount: number;
}

export const FloatingNav: React.FC<FloatingNavProps> = ({
  activeTab,
  setActiveTab,
  pendingConflictsCount
}) => {
  const navItems = [
    { id: 'overview' as NavTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'data' as NavTab, label: 'Data', icon: Database },
    { id: 'map' as NavTab, label: 'Map', icon: MapPin },
    { id: 'review' as NavTab, label: 'Review', icon: AlertTriangle, badge: pendingConflictsCount },
    { id: 'reports' as NavTab, label: 'Reports', icon: FileSpreadsheet },
    { id: 'settings' as NavTab, label: 'Settings', icon: Sliders }
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center">
      <div className="glass-pill px-2 py-1.5 rounded-full flex items-center gap-1 shadow-2xl transition-all duration-300 ring-1 ring-slate-900/5 hover:ring-slate-900/10">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/25 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>{item.label}</span>

              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`ml-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full transition-all ${
                    isActive ? 'bg-amber-500 text-slate-950' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
