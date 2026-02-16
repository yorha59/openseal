
import React, { useState } from 'react';
import { Zap, Shield, ToggleLeft, ToggleRight, Search, Info } from 'lucide-react';
import { StartupItem } from '../types';

const StartupItems: React.FC = () => {
  const [items, setItems] = useState<StartupItem[]>([
    { id: '1', name: 'Spotify', developer: 'Spotify AB', impact: 'High', enabled: true, description: 'Launches the music player immediately upon login.' },
    { id: '2', name: 'Docker', developer: 'Docker Inc.', impact: 'High', enabled: true, description: 'Container virtualization service.' },
    { id: '3', name: 'CleanMyMac Menu', developer: 'MacPaw', impact: 'Medium', enabled: true, description: 'System health monitoring in the menu bar.' },
    { id: '4', name: 'Dropbox', developer: 'Dropbox Inc.', impact: 'Medium', enabled: true, description: 'File synchronization and cloud backup.' },
    { id: '5', name: 'Magnet', developer: 'CrowdCafe', impact: 'Low', enabled: true, description: 'Window management utility.' },
    { id: '6', name: 'Paste', developer: 'Paste Team', impact: 'Low', enabled: false, description: 'Clipboard history manager.' },
  ]);

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item));
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High': return 'text-red-500 bg-red-50';
      case 'Medium': return 'text-amber-500 bg-amber-50';
      case 'Low': return 'text-emerald-500 bg-emerald-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-8 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
            <Zap size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold">Startup Optimization</h3>
            <p className="text-gray-500 text-sm">Disable items to speed up your Mac's boot time.</p>
          </div>
        </div>
        <div className="px-6 py-3 bg-amber-50 rounded-2xl text-amber-700 font-bold border border-amber-100">
          Potential Boot Speed Up: ~4.5s
        </div>
      </div>

      <div className="glass rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-gray-400 text-xs font-bold uppercase tracking-widest border-bottom border-gray-100">
                <th className="px-8 py-4">Application</th>
                <th className="px-4 py-4">Developer</th>
                <th className="px-4 py-4 text-center">Impact</th>
                <th className="px-4 py-4 text-center">Status</th>
                <th className="px-8 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center shadow-sm">
                        <Zap size={20} className={item.enabled ? 'text-blue-500' : 'text-gray-300'} />
                      </div>
                      <div>
                        <div className="font-bold text-gray-800">{item.name}</div>
                        <div className="text-xs text-gray-400">{item.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-5 text-sm text-gray-600">{item.developer}</td>
                  <td className="px-4 py-5 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${getImpactColor(item.impact)}`}>
                      {item.impact}
                    </span>
                  </td>
                  <td className="px-4 py-5 text-center">
                    <button 
                      onClick={() => toggleItem(item.id)}
                      className="transition-colors"
                    >
                      {item.enabled ? 
                        <ToggleRight className="text-blue-500" size={32} /> : 
                        <ToggleLeft className="text-gray-300" size={32} />
                      }
                    </button>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="text-gray-300 hover:text-gray-600 transition-colors">
                      <Info size={18} />
                    </button>
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

export default StartupItems;
