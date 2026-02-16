
import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, Cpu, HardDrive, BrainCircuit, XCircle, Search, Sparkles } from 'lucide-react';
import { ProcessItem } from '../types';
import { explainProcess } from '../services/geminiService';

const ActivityMonitor: React.FC = () => {
  const [processes, setProcesses] = useState<ProcessItem[]>([
    { pid: 142, name: 'Google Chrome Helper', cpu: 12.4, memory: 840, user: 'John' },
    { pid: 56, name: 'WindowServer', cpu: 4.2, memory: 250, user: 'root' },
    { pid: 88, name: 'Spotify Helper', cpu: 2.1, memory: 180, user: 'John' },
    { pid: 1, name: 'launchd', cpu: 0.1, memory: 5, user: 'root' },
    { pid: 212, name: 'Code', cpu: 18.5, memory: 1200, user: 'John' },
    { pid: 900, name: 'cloudd', cpu: 0.5, memory: 45, user: 'John' },
    { pid: 432, name: 'mds_stores', cpu: 15.2, memory: 92, user: 'root' },
  ]);

  const [selectedProcess, setSelectedProcess] = useState<ProcessItem | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchExplanation = async (name: string) => {
    setIsLoading(true);
    setExplanation(null);
    const text = await explainProcess(name);
    setExplanation(text);
    setIsLoading(false);
  };

  const killProcess = (pid: number) => {
    setProcesses(prev => prev.filter(p => p.pid !== pid));
    if (selectedProcess?.pid === pid) setSelectedProcess(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* List */}
      <div className="lg:col-span-2 glass rounded-3xl overflow-hidden flex flex-col h-[600px]">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold flex items-center space-x-2">
            <Activity size={20} className="text-blue-500" />
            <span>Active Processes</span>
          </h3>
          <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
            Showing {processes.length} background tasks
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto overflow-x-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white/80 backdrop-blur-sm z-10 border-b border-gray-50">
              <tr className="text-[10px] font-bold uppercase text-gray-400">
                <th className="px-6 py-3">Process Name</th>
                <th className="px-4 py-3 text-right">CPU %</th>
                <th className="px-4 py-3 text-right">Memory</th>
                <th className="px-6 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {processes.map((proc) => (
                <tr 
                  key={proc.pid}
                  onClick={() => {
                    setSelectedProcess(proc);
                    fetchExplanation(proc.name);
                  }}
                  className={`cursor-pointer transition-colors ${
                    selectedProcess?.pid === proc.pid ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-xs text-gray-400 font-mono">{proc.pid}</div>
                      <div className="font-semibold text-gray-700 truncate max-w-[150px]">{proc.name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={`text-sm font-medium ${proc.cpu > 10 ? 'text-red-500' : 'text-gray-600'}`}>
                      {proc.cpu}%
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right text-sm text-gray-600">
                    {proc.memory} MB
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        killProcess(proc.pid);
                      }}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <XCircle size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details & AI Panel */}
      <div className="glass rounded-3xl p-8 flex flex-col h-[600px] border-blue-100">
        {selectedProcess ? (
          <div className="flex-1 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <BrainCircuit size={32} />
              </div>
              <div>
                <h4 className="font-bold text-lg leading-tight">{selectedProcess.name}</h4>
                <p className="text-sm text-gray-400">PID: {selectedProcess.pid} • User: {selectedProcess.user}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <Sparkles size={16} />
                  <span className="text-xs font-bold uppercase tracking-widest">Gemini AI Insights</span>
                </div>
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-white/20 rounded animate-pulse w-full"></div>
                    <div className="h-4 bg-white/20 rounded animate-pulse w-4/5"></div>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-blue-50 font-medium">
                    {explanation}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">CPU Impact</div>
                  <div className="text-lg font-bold text-gray-700">{selectedProcess.cpu}%</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Memory Usage</div>
                  <div className="text-lg font-bold text-gray-700">{selectedProcess.memory} MB</div>
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start space-x-3">
                <ShieldAlert className="text-amber-600 shrink-0" size={18} />
                <p className="text-xs text-amber-800 leading-tight">
                  Forcing this process to quit might cause the parent application to crash or system instability.
                </p>
              </div>
            </div>

            <button 
              onClick={() => killProcess(selectedProcess.pid)}
              className="mt-auto w-full py-4 bg-red-500 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-red-600 transition-colors shadow-lg shadow-red-200"
            >
              <XCircle size={18} />
              <span>Quit Process</span>
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
              <Activity size={40} />
            </div>
            <div>
              <h4 className="font-bold">No Process Selected</h4>
              <p className="text-sm text-gray-400 max-w-[200px] mt-2">Select a process to see AI-powered details and health reports.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityMonitor;
