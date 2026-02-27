
import React, { useState } from 'react';
import { Copy, Loader, Trash2, FileSearch, FolderOpen } from 'lucide-react';

let tauriInvoke: any = null;
try {
  if ((window as any).__TAURI__) {
    import('@tauri-apps/api/tauri').then(mod => { tauriInvoke = mod.invoke; });
  }
} catch (e) {}

interface DuplicateGroup {
  hash: string;
  size_bytes: number;
  size_human: string;
  files: string[];
}

interface DuplicateResult {
  groups: DuplicateGroup[];
  total_wasted_bytes: number;
  total_wasted_human: string;
  total_groups: number;
}

const Duplicates: React.FC = () => {
  const [scanPath, setScanPath] = useState('/Users');
  const [minSize, setMinSize] = useState(1);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<DuplicateResult | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const startScan = async () => {
    setScanning(true);
    setResult(null);

    if (tauriInvoke) {
      try {
        const data = await tauriInvoke('find_duplicates', { 
          path: scanPath, 
          minSizeMb: minSize 
        });
        setResult(data);
      } catch (e) {
        console.error("Duplicate scan failed:", e);
      }
    } else {
      await new Promise(r => setTimeout(r, 2000));
      setResult({
        groups: [
          { hash: 'abc123', size_bytes: 52428800, size_human: '50.0 MB', files: ['/Users/demo/file1.zip', '/Users/demo/backup/file1.zip', '/Users/demo/old/file1.zip'] },
          { hash: 'def456', size_bytes: 15728640, size_human: '15.0 MB', files: ['/Users/demo/photo.jpg', '/Users/demo/copy/photo.jpg'] },
        ],
        total_wasted_bytes: 115343360,
        total_wasted_human: '110.0 MB',
        total_groups: 2,
      });
    }

    setScanning(false);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="glass rounded-3xl p-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
            <Copy size={24} />
          </div>
          <div>
            <h3 className="font-bold">Duplicate Finder</h3>
            <p className="text-sm text-gray-400">
              {result ? `Found ${result.total_groups} duplicate groups (${result.total_wasted_human} wasted)` : 'Find duplicate files wasting your disk space'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <input 
            type="text" value={scanPath} onChange={(e) => setScanPath(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm w-40 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Path"
          />
          <select 
            value={minSize} onChange={(e) => setMinSize(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value={1}>≥ 1 MB</option>
            <option value={5}>≥ 5 MB</option>
            <option value={10}>≥ 10 MB</option>
            <option value={50}>≥ 50 MB</option>
          </select>
          <button 
            onClick={startScan} disabled={scanning}
            className="px-6 py-2.5 bg-purple-500 text-white rounded-xl font-semibold hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {scanning ? <Loader size={16} className="animate-spin" /> : <FileSearch size={16} />}
            <span>{scanning ? 'Scanning...' : 'Find Duplicates'}</span>
          </button>
        </div>
      </div>

      {/* Results */}
      {result && result.groups.length > 0 && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="glass rounded-3xl p-6 flex items-center justify-around">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-500">{result.total_groups}</div>
              <div className="text-xs text-gray-400 uppercase">Duplicate Groups</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-500">{result.total_wasted_human}</div>
              <div className="text-xs text-gray-400 uppercase">Wasted Space</div>
            </div>
          </div>

          {/* Groups */}
          <div className="space-y-3">
            {result.groups.map((group, idx) => (
              <div key={group.hash} className="glass rounded-2xl overflow-hidden">
                <div 
                  onClick={() => setExpandedGroup(expandedGroup === group.hash ? null : group.hash)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-bold text-sm">
                      {group.files.length}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{group.files[0].split('/').pop()}</div>
                      <div className="text-xs text-gray-400">{group.files.length} copies · {group.size_human} each</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-red-500">
                      {formatWaste(group.size_bytes, group.files.length)} wasted
                    </div>
                  </div>
                </div>
                
                {expandedGroup === group.hash && (
                  <div className="border-t border-gray-100 bg-gray-50/30 p-4 space-y-2">
                    {group.files.map((file, fi) => (
                      <div key={fi} className="flex items-center justify-between p-2 bg-white rounded-lg">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <FolderOpen size={14} className="text-gray-400 shrink-0" />
                          <span className="text-xs font-mono text-gray-600 truncate">{file}</span>
                        </div>
                        {fi > 0 && (
                          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded ml-2 shrink-0">duplicate</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {result && result.groups.length === 0 && (
        <div className="glass rounded-3xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-4">
            <Copy size={40} />
          </div>
          <h3 className="text-lg font-bold text-gray-600">No Duplicates Found</h3>
          <p className="text-sm text-gray-400 mt-2">Your files are unique! Try lowering the minimum size.</p>
        </div>
      )}

      {!result && !scanning && (
        <div className="glass rounded-3xl p-16 flex flex-col items-center justify-center text-center">
          <Copy size={48} className="text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-600">Find Duplicate Files</h3>
          <p className="text-sm text-gray-400 mt-2">Scan a directory to find files that have identical copies</p>
        </div>
      )}
    </div>
  );
};

function formatWaste(sizeBytes: number, count: number): string {
  const waste = sizeBytes * (count - 1);
  const gb = waste / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = waste / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

export default Duplicates;
