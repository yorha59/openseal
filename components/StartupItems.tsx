
import React, { useState, useEffect } from 'react';
import { Zap, Shield, ToggleLeft, ToggleRight, Info, FolderOpen } from 'lucide-react';

let tauriInvoke: any = null;
try {
  if ((window as any).__TAURI__) {
    import('@tauri-apps/api/tauri').then(mod => { tauriInvoke = mod.invoke; });
  }
} catch (e) {}

interface RealStartupItem {
  name: string;
  path: string;
  kind: string;
  enabled: boolean;
}

const StartupItems: React.FC = () => {
  const [items, setItems] = useState<RealStartupItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (tauriInvoke) {
        try {
          const data: RealStartupItem[] = await tauriInvoke('get_startup_items');
          setItems(data);
        } catch (e) {
          console.error("Failed to get startup items:", e);
        }
      } else {
        // Browser fallback
        setItems([
          { name: 'com.example.agent', path: '~/Library/LaunchAgents/com.example.agent.plist', kind: 'LaunchAgent', enabled: true },
          { name: 'com.docker.helper', path: '~/Library/LaunchAgents/com.docker.helper.plist', kind: 'LaunchAgent', enabled: true },
        ]);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const getKindColor = (kind: string) => {
    return kind === 'LaunchDaemon' ? 'text-red-500 bg-red-50' : 'text-blue-500 bg-blue-50';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 animate-pulse">Loading startup items...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-8 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
            <Zap size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold">Startup Items</h3>
            <p className="text-gray-500 text-sm">Found {items.length} launch agents and daemons</p>
          </div>
        </div>
        <div className="px-6 py-3 bg-amber-50 rounded-2xl text-amber-700 font-bold border border-amber-100">
          {items.filter(i => i.kind === 'LaunchDaemon').length} Daemons · {items.filter(i => i.kind === 'LaunchAgent').length} Agents
        </div>
      </div>

      <div className="glass rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-gray-400 text-xs font-bold uppercase tracking-widest">
                <th className="px-8 py-4">Name</th>
                <th className="px-4 py-4">Kind</th>
                <th className="px-4 py-4">Path</th>
                <th className="px-4 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center shadow-sm">
                        <Zap size={20} className={item.enabled ? 'text-blue-500' : 'text-gray-300'} />
                      </div>
                      <div className="font-bold text-gray-800 max-w-[200px] truncate">{item.name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${getKindColor(item.kind)}`}>
                      {item.kind}
                    </span>
                  </td>
                  <td className="px-4 py-5 text-xs text-gray-400 max-w-[250px] truncate font-mono">{item.path}</td>
                  <td className="px-4 py-5 text-center">
                    {item.enabled ? 
                      <span className="text-green-500 text-xs font-bold">Active</span> : 
                      <span className="text-gray-400 text-xs">Disabled</span>
                    }
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
