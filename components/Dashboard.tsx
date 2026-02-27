
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Sparkles, ArrowRight, Zap, RefreshCcw, Trash2 } from 'lucide-react';
import { generateSystemReport, analyzeSystemHealth } from '../services/geminiService';

interface DashboardProps {
  stats: { used: number; total: number; free: number; percent?: number; loading?: boolean };
}

const Dashboard: React.FC<DashboardProps> = ({ stats }) => {
  const [healthTips, setHealthTips] = useState<string[]>([]);

  const data = [
    { name: 'Used', value: stats.used || 1, color: '#3b82f6' },
    { name: 'Free', value: stats.free || 1, color: '#e5e7eb' },
  ];

  useEffect(() => {
    const analyze = async () => {
      const report = await generateSystemReport();
      // Use real data if available, otherwise use props
      if (report.disk.total_gb > 0) {
        setHealthTips(analyzeSystemHealth(report));
      } else {
        setHealthTips(analyzeSystemHealth({
          disk: { used_gb: stats.used, total_gb: stats.total, percent: stats.percent || 0 },
        }));
      }
    };
    if (!stats.loading) analyze();
  }, [stats]);

  if (stats.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 animate-pulse">Scanning disk...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 glass rounded-3xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">Disk Storage</h3>
          <div className="text-sm font-medium text-blue-500">
            {stats.used} GB of {stats.total} GB used
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="w-48 h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.percent || Math.round(stats.used / stats.total * 100)}%</div>
                <div className="text-xs text-gray-400">used</div>
              </div>
            </div>
          </div>
          
          <div className="flex-1 space-y-4 w-full">
            <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
              <span className="text-gray-500">Total Capacity</span>
              <span className="font-bold">{stats.total} GB</span>
            </div>
            <div className="p-4 bg-blue-50 rounded-2xl flex items-center justify-between">
              <span className="text-blue-500">Used Space</span>
              <span className="font-bold text-blue-600">{stats.used} GB</span>
            </div>
            <div className="p-4 bg-green-50 rounded-2xl flex items-center justify-between">
              <span className="text-green-500">Available Space</span>
              <span className="font-bold text-green-600">{stats.free} GB</span>
            </div>
          </div>
        </div>
      </div>

      <div className="glass rounded-3xl p-8 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 flex flex-col">
        <div className="flex items-center space-x-2 text-blue-600 mb-4">
          <Sparkles size={20} />
          <h3 className="font-bold">System Health</h3>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed flex-1">
          {healthTips.length > 0 ? (
            <ul className="space-y-2">
              {healthTips.map((tip, i) => <li key={i}>{tip}</li>)}
            </ul>
          ) : 'Analyzing system...'}
        </p>
        <button className="mt-6 w-full py-3 bg-blue-500 text-white rounded-2xl font-semibold flex items-center justify-center space-x-2 hover:bg-blue-600 transition-colors shadow-lg shadow-blue-200">
          <span>Start Smart Scan</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
