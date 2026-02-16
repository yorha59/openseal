
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Trash2, 
  FileSearch, 
  Zap, 
  Activity, 
  Settings, 
  Search, 
  ShieldCheck, 
  ChevronRight,
  HardDrive
} from 'lucide-react';
import { ViewType } from './types';
import Dashboard from './components/Dashboard';
import Cleaner from './components/Cleaner';
import LargeFiles from './components/LargeFiles';
import StartupItems from './components/StartupItems';
import ActivityMonitor from './components/ActivityMonitor';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>(ViewType.DASHBOARD);
  const [diskUsage, setDiskUsage] = useState({ used: 75.4, total: 512, free: 436.6 });

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

  return (
    <div className="flex h-screen w-full bg-[#f5f5f7] text-[#1d1d1f]">
      {/* Sidebar */}
      <aside className="w-64 glass flex flex-col border-r border-gray-200">
        <div className="p-6 flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <HardDrive className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">MacPulse <span className="text-blue-500">AI</span></h1>
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
              <span>System Status: Healthy</span>
            </div>
            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 w-[95%]"></div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative p-8">
        <header className="flex items-center justify-between mb-8 sticky top-0 bg-[#f5f5f7]/80 backdrop-blur-sm py-2 z-10">
          <div>
            <h2 className="text-3xl font-bold">{navItems.find(i => i.id === activeView)?.label}</h2>
            <p className="text-gray-500 text-sm mt-1 italic">MacPulse AI is scanning your system in real-time...</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-10 pr-4 py-2 bg-white rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all w-64 shadow-sm"
              />
            </div>
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
