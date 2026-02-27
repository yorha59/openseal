
import React, { useState } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { File, HardDrive, FileSearch, Loader, ExternalLink } from 'lucide-react';

let tauriInvoke: any = null;
try {
  if ((window as any).__TAURI__) {
    import('@tauri-apps/api/tauri').then(mod => { tauriInvoke = mod.invoke; });
  }
} catch (e) {}

interface ScanFile {
  path: string;
  size_bytes: number;
  size_human: string;
  extension: string | null;
}

interface ExtStat {
  extension: string;
  file_count: number;
  total_size_bytes: number;
}

const LargeFiles: React.FC = () => {
  const [topFiles, setTopFiles] = useState<ScanFile[]>([]);
  const [extStats, setExtStats] = useState<ExtStat[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [scanPath, setScanPath] = useState('/Users');
  const [summary, setSummary] = useState<any>(null);

  const startScan = async () => {
    setScanning(true);
    setTopFiles([]);
    setExtStats([]);
    
    if (tauriInvoke) {
      try {
        const result = await tauriInvoke('scan_directory', { 
          path: scanPath, 
          limit: 20,
          minSizeMb: 1 
        });
        setTopFiles(result.top_files);
        setExtStats(result.by_extension.slice(0, 15));
        setSummary(result.summary);
      } catch (e) {
        console.error("Scan failed:", e);
      }
    } else {
      // Browser fallback
      await new Promise(r => setTimeout(r, 1000));
      setTopFiles([
        { path: '/Users/demo/Downloads/installer.pkg', size_bytes: 15e9, size_human: '15.0 GB', extension: 'pkg' },
        { path: '/Users/demo/Movies/video.mp4', size_bytes: 4.5e9, size_human: '4.5 GB', extension: 'mp4' },
        { path: '/Users/demo/Library/Caches/large.cache', size_bytes: 2.1e9, size_human: '2.1 GB', extension: 'cache' },
      ]);
      setExtStats([
        { extension: 'mp4', file_count: 12, total_size_bytes: 15e9 },
        { extension: 'pkg', file_count: 3, total_size_bytes: 10e9 },
        { extension: 'zip', file_count: 45, total_size_bytes: 5e9 },
      ]);
    }
    
    setScanning(false);
    setScanned(true);
  };

  const formatSize = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  };

  const treemapData = extStats.length > 0 ? [{
    name: 'Extensions',
    children: extStats.map(e => ({
      name: e.extension || 'no ext',
      size: e.total_size_bytes,
      count: e.file_count,
    })),
  }] : [];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-xl border border-gray-100 text-xs">
          <p className="font-bold mb-1">.{data.name}</p>
          <p className="text-gray-500">Size: {formatSize(data.size)}</p>
          <p className="text-gray-500">Files: {data.count}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Scan Controls */}
      <div className="glass rounded-3xl p-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
            <FileSearch size={24} />
          </div>
          <div>
            <h3 className="font-bold">Disk Scanner</h3>
            <p className="text-sm text-gray-400">
              {scanned && summary ? 
                `Scanned ${summary.total_files?.toLocaleString()} files in ${summary.elapsed_seconds?.toFixed(1)}s` :
                'Scan your disk to find large files'
              }
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <input 
            type="text" 
            value={scanPath}
            onChange={(e) => setScanPath(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Path to scan"
          />
          <button 
            onClick={startScan}
            disabled={scanning}
            className="px-6 py-2.5 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {scanning ? <Loader size={16} className="animate-spin" /> : <FileSearch size={16} />}
            <span>{scanning ? 'Scanning...' : 'Scan'}</span>
          </button>
        </div>
      </div>

      {scanned && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Treemap */}
          {treemapData.length > 0 && (
            <div className="lg:col-span-2 glass rounded-3xl p-8 flex flex-col h-[500px]">
              <h3 className="text-lg font-bold mb-6">Space by File Type</h3>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap data={treemapData} dataKey="size" aspectRatio={4 / 3} stroke="#fff" fill="#3b82f6">
                    <Tooltip content={<CustomTooltip />} />
                  </Treemap>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* File List */}
          <div className={`glass rounded-3xl p-6 flex flex-col ${treemapData.length > 0 ? '' : 'lg:col-span-3'}`}>
            <h3 className="text-lg font-bold mb-4">Top {topFiles.length} Largest Files</h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[420px]">
              {topFiles.map((file, i) => (
                <div key={i} className="group p-3 bg-white hover:bg-blue-50 border border-gray-100 rounded-xl transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="p-2 bg-gray-50 group-hover:bg-blue-100 text-gray-400 group-hover:text-blue-600 rounded-lg transition-colors shrink-0">
                        <File size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm truncate">{file.path.split('/').pop()}</div>
                        <div className="text-[10px] text-gray-400 font-mono truncate">{file.path}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="text-xs font-bold text-gray-700">{file.size_human}</div>
                      {file.extension && <div className="text-[10px] text-gray-400">.{file.extension}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!scanned && !scanning && (
        <div className="glass rounded-3xl p-16 flex flex-col items-center justify-center text-center">
          <HardDrive size={48} className="text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-600">Ready to Scan</h3>
          <p className="text-sm text-gray-400 mt-2">Click Scan to find large files on your disk</p>
        </div>
      )}
    </div>
  );
};

export default LargeFiles;
