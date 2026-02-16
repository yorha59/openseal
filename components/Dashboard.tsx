
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Sparkles, ArrowRight, Zap, RefreshCcw, Trash2 } from 'lucide-react';
import { analyzeSystemHealth } from '../services/geminiService';

interface DashboardProps {
  stats: { used: number; total: number; free: number };
}

const Dashboard: React.FC<DashboardProps> = ({ stats }) => {
  const [aiAdvice, setAiAdvice] = useState<string>('Analyzing your system with Gemini AI...');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const data = [
    { name: 'Used', value: stats.used, color: '#3b82f6' },
    { name: 'Free', value: stats.free, color: '#e5e7eb' },
  ];

  const fetchAdvice = async () => {
    setIsRefreshing(true);
    const advice = await analyzeSystemHealth(stats);
    setAiAdvice(advice || "Keep your disk usage under 80% for optimal performance.");
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchAdvice();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Storage Summary */}
      <div className="md:col-span-2 glass rounded-3xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">Disk Storage</h3>
          <div className="text-sm font-medium text-blue-500">{stats.used}GB of {stats.total}GB used</div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="w-48 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex-1 space-y-4 w-full">
            <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
              <span className="text-gray-500">Available Space</span>
              <span className="font-bold">{stats.free} GB</span>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
              <span className="text-gray-500">Applications</span>
              <span className="font-bold">142 GB</span>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
              <span className="text-gray-500">System Data</span>
              <span className="font-bold">85 GB</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Recommendation */}
      <div className="glass rounded-3xl p-8 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 text-blue-600">
            <Sparkles size={20} />
            <h3 className="font-bold">AI Insights</h3>
          </div>
          <button 
            onClick={fetchAdvice}
            className={`p-1.5 hover:bg-white rounded-full transition-all ${isRefreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCcw size={16} />
          </button>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed flex-1">
          {aiAdvice}
        </p>
        <button className="mt-6 w-full py-3 bg-blue-500 text-white rounded-2xl font-semibold flex items-center justify-center space-x-2 hover:bg-blue-600 transition-colors shadow-lg shadow-blue-200">
          <span>Start Smart Scan</span>
          <ArrowRight size={18} />
        </button>
      </div>

      {/* Quick Stats Grid */}
      <div className="glass rounded-3xl p-6 flex items-center space-x-4">
        <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
          <Zap size={24} />
        </div>
        <div>
          <div className="text-xs text-gray-400 font-medium">STARTUP IMPACT</div>
          <div className="text-xl font-bold">8 Items</div>
        </div>
      </div>

      <div className="glass rounded-3xl p-6 flex items-center space-x-4">
        <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
          <RefreshCcw size={24} />
        </div>
        <div>
          <div className="text-xs text-gray-400 font-medium">LAST CLEANED</div>
          <div className="text-xl font-bold">2 days ago</div>
        </div>
      </div>

      <div className="glass rounded-3xl p-6 flex items-center space-x-4">
        <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
          {/* Trash2 is imported from lucide-react */}
          <Trash2 size={24} />
        </div>
        <div>
          <div className="text-xs text-gray-400 font-medium">RECOVERABLE</div>
          <div className="text-xl font-bold">12.4 GB</div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
