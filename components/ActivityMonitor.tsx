
import React, { useState, useEffect, useRef } from 'react';
import { Activity, ShieldAlert, Cpu, XCircle, Sparkles } from 'lucide-react';

let tauriInvoke: any = null;
try {
  if ((window as any).__TAURI__) {
    import('@tauri-apps/api/tauri').then(mod => { tauriInvoke = mod.invoke; });
  }
} catch (e) {}

interface RealProcess {
  pid: number;
  name: string;
  cpu_percent: number;
  memory_mb: number;
  command: string;
}

const ActivityMonitor: React.FC = () => {
  const [processes, setProcesses] = useState<RealProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProcess, setSelectedProcess] = useState<RealProcess | null>(null);
  const intervalRef = useRef<any>(null);

  const fetchProcesses = async () => {
    if (tauriInvoke) {
      try {
        const data: RealProcess[] = await tauriInvoke('get_processes', { limit: 25 });
        setProcesses(data);
      } catch (e) {
        console.error("Failed to get processes:", e);
      }
    } else {
      // Browser fallback — can't get real processes
      setProcesses([
        { pid: 1, name: 'launchd', cpu_percent: 0.1, memory_mb: 5, command: '/sbin/launchd' },
        { pid: 100, name: 'WindowServer', cpu_percent: 4.2, memory_mb: 250, command: '/System/Library/PrivateFrameworks/...' },
      ]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProcesses();
    // Auto-refresh every 5 seconds
    intervalRef.current = setInterval(fetchProcesses, 5000);
    return () => clearInterval(intervalRef.current);
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 animate-pulse">Loading processes...</div>;
  }

  const totalCpu = processes.reduce((sum, p) => sum + p.cpu_percent, 0);
  const totalMem = processes.reduce((sum, p) => sum + p.memory_mb, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 glass rounded-3xl overflow-hidden flex flex-col h-[600px]">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold flex items-center space-x-2">
            <Activity size={20} className="text-blue-500" />
            <span>Active Processes</span>
          </h3>
          <div className="flex items-center space-x-4">
            <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
              CPU: {totalCpu.toFixed(1)}% · MEM: {(totalMem / 1024).toFixed(1)} GB
            </div>
            <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
              {processes.length} processes
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto overflow-x-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white/80 backdrop-blur-sm z-10 border-b border-gray-50">
              <tr className="text-[10px] font-bold uppercase text-gray-400">
                <th className="px-6 py-3">PID</th>
                <th className="px-4 py-3">Process Name</th>
                <th className="px-4 py-3 text-right">CPU %</th>
                <th className="px-4 py-3 text-right">Memory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {processes.map((proc) => (
                <tr 
                  key={proc.pid}
                  onClick={() => setSelectedProcess(proc)}
                  className={`cursor-pointer transition-colors ${
                    selectedProcess?.pid === proc.pid ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'
                  }`}
                >
                  <td className="px-6 py-3 text-xs text-gray-400 font-mono">{proc.pid}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-700 truncate max-w-[200px]">{proc.name}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-medium ${proc.cpu_percent > 10 ? 'text-red-500' : proc.cpu_percent > 5 ? 'text-amber-500' : 'text-gray-600'}`}>
                      {proc.cpu_percent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">
                    {proc.memory_mb > 1024 ? `${(proc.memory_mb / 1024).toFixed(1)} GB` : `${proc.memory_mb.toFixed(0)} MB`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Panel */}
      <div className="glass rounded-3xl p-8 flex flex-col h-[600px]">
        {selectedProcess ? (
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <Cpu size={32} />
              </div>
              <div>
                <h4 className="font-bold text-lg leading-tight">{selectedProcess.name}</h4>
                <p className="text-sm text-gray-400">PID: {selectedProcess.pid}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">CPU</div>
                  <div className={`text-lg font-bold ${selectedProcess.cpu_percent > 10 ? 'text-red-500' : 'text-gray-700'}`}>
                    {selectedProcess.cpu_percent.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Memory</div>
                  <div className="text-lg font-bold text-gray-700">
                    {selectedProcess.memory_mb > 1024 ? `${(selectedProcess.memory_mb / 1024).toFixed(1)} GB` : `${selectedProcess.memory_mb.toFixed(0)} MB`}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Command</div>
                <div className="text-xs font-mono text-gray-600 break-all">{selectedProcess.command}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
              <Activity size={40} />
            </div>
            <div>
              <h4 className="font-bold">No Process Selected</h4>
              <p className="text-sm text-gray-400 max-w-[200px] mt-2">Click a process to see details.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityMonitor;
