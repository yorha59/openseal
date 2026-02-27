
import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, Trash2, FileSearch, Zap, Activity, Settings, 
  Search, ShieldCheck, ChevronRight, HardDrive
} from 'lucide-react';
import { ViewType } from './types';
import Dashboard from './components/Dashboard';
import Cleaner from './components/Cleaner';
import LargeFiles from './components/LargeFiles';
import StartupItems from './components/StartupItems';
import ActivityMonitor from './components/ActivityMonitor';

// Tauri invoke setup
let tauriInvoke: any = null;
try {
  if ((window as any).__TAURI__) {
    import('@tauri-apps/api/tauri').then(mod => {
      tauriInvoke = mod.invoke;
    });
  }
} catch (e) {
  console.log("Not running in Tauri environment.");
}

export { tauriInvoke };

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>(ViewType.DASHBOARD);
  const [diskUsage, setDiskUsage] = useState({ used: 0, total: 0, free: 0, percent: 0, loading: true });

  useEffect(() => {
    const fetchDiskUsage = async () => {
      if (tauriInvoke) {
        try {
          const data = await tauriInvoke('get_disk_usage');
          setDiskUsage({
            used: Math.round(data.used_gb * 10) / 10,
            total: Math.round(data.total_gb * 10) / 10,
            free: Math.round(data.free_gb * 10) / 10,
            percent: Math.round(data.usage_percent * 10) / 10,
            loading: false,
          });
        } catch (e) {
          console.error("Failed to get disk usage:", e);
          setDiskUsage(prev => ({ ...prev, loading: false }));
        }
      } else {
        // Browser fallback: use navigator.storage
        try {
          const est = await navigator.storage.estimate();
          const totalGb = (est.quota || 0) / 1e9;
          const usedGb = (est.usage || 0) / 1e9;
          setDiskUsage({
            used: Math.round(usedGb * 10) / 10,
            total: Math.round(totalGb * 10) / 10,
            free: Math.round((totalGb - usedGb) * 10) / 10,
            percent: totalGb > 0 ? Math.round(usedGb / totalGb * 1000) / 10 : 0,
            loading: false,
          });
        } catch {
          setDiskUsage({ used: 0, total: 0, free: 0, percent: 0, loading: false });
        }
      }
    };
    fetchDiskUsage();
  }, []);

  const renderView = () => {
    switch (activeView) {
      case ViewType.DASHBOARD: return <Dashboard stats={diskUsage} />;
      case ViewType.CLEANER: return <Cleaner />;
      case ViewType.LARGE_FILES: return <LargeFiles />;
      case ViewType.STARTUP: return <StartupItems />;
      case ViewType.ACTIVITY: return <ActivityMonitor />;
      default: return <Dashboard stats={diskUsage} />;
    }
  };

  const navItems = [
    { id: ViewType.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: ViewType.CLEANER, label: 'Junk Cleaner', icon: Trash2 },
    { id: ViewType.LARGE_FILES, label: 'Large Files', icon: FileSearch },
    { id: ViewType.STARTUP, label: 'Startup Items', icon: Zap },
    { id: ViewType.ACTIVITY, label: 'Background', icon: Activity },
  ];

  const isTauri = !!(window as any).__TAURI__;

  return (
    <div className="flex h-screen w-full bg-[#f5f5f7] text-[#1d1d1f]">
      <aside className="w-64 glass flex flex-col border-r border-gray-200">
        <div className="p-6 flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <HardDrive className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">OpenSeal</h1>
        </div>

        <nav className="flex-1 px-3 mt-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 mb-1 rounded-lg transition-all duration-200 ${
                activeView === item.id 
                  ? 'bg-blue-500 text-white shadow-md' 
                  : 'text-gray-500 hover:bg-white/50 hover:text-gray-900'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
              {activeView === item.id && <ChevronRight className="ml-auto" size={16} />}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-gray-200/50">
          <div className="bg-gray-100 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-xs text-gray-400 mb-1">
              <ShieldCheck size={14} />
              <span>{isTauri ? '🟢 Native Mode' : '🟡 Browser Mode'}</span>
            </div>
            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full ${diskUsage.percent > 90 ? 'bg-red-500' : diskUsage.percent > 70 ? 'bg-amber-500' : 'bg-green-500'}`} 
                   style={{ width: `${Math.min(diskUsage.percent, 100)}%` }}></div>
            </div>
            {!diskUsage.loading && (
              <div className="text-[10px] text-gray-400 mt-1">
                {diskUsage.used} GB / {diskUsage.total} GB ({diskUsage.percent}%)
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative p-8">
        <header className="flex items-center justify-between mb-8 sticky top-0 bg-[#f5f5f7]/80 backdrop-blur-sm py-2 z-10">
          <div>
            <h2 className="text-3xl font-bold">{navItems.find(i => i.id === activeView)?.label}</h2>
            <p className="text-gray-500 text-sm mt-1 italic">
              {isTauri ? 'Powered by Rust + Surf scanning engine' : 'Running in browser preview mode'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm">
              <Settings size={20} />
            </button>
          </div>
        </header>

        <section className="max-w-6xl mx-auto">
          {renderView()}
        </section>
      </main>
    </div>
  );
};

export default App;
