
import React, { useState, useEffect } from 'react';
import { Trash2, AlertCircle, CheckCircle2, Loader2, Info, RefreshCcw, HardDrive } from 'lucide-react';

let tauriInvoke: any = null;
try {
  if ((window as any).__TAURI__) {
    import('@tauri-apps/api/tauri').then(mod => { tauriInvoke = mod.invoke; });
  }
} catch (e) {}

interface JunkCategoryData {
  id: string;
  name: string;
  description: string;
  size_bytes: number;
  size_human: string;
  items: { path: string; size_bytes: number; size_human: string }[];
}

const Cleaner: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<any>(null);
  const [categories, setCategories] = useState<(JunkCategoryData & { checked: boolean })[]>([]);
  const [scanned, setScanned] = useState(false);

  const startScan = async () => {
    setScanning(true);
    setCleanResult(null);

    if (tauriInvoke) {
      try {
        const data: JunkCategoryData[] = await tauriInvoke('scan_junk');
        setCategories(data.map(c => ({ ...c, checked: c.id !== 'trash' }))); // Don't check trash by default
      } catch (e) {
        console.error("Scan junk failed:", e);
        setCategories([]);
      }
    } else {
      // Browser fallback
      await new Promise(r => setTimeout(r, 1500));
      setCategories([
        { id: 'system_cache', name: 'System & App Cache', description: 'Cached data', size_bytes: 4.5e9, size_human: '4.5 GB', items: [], checked: true },
        { id: 'app_logs', name: 'Application Logs', description: 'Log files', size_bytes: 1.2e9, size_human: '1.2 GB', items: [], checked: true },
        { id: 'trash', name: 'Trash Bin', description: 'Deleted files', size_bytes: 800e6, size_human: '800 MB', items: [], checked: false },
      ]);
    }
    
    setScanning(false);
    setScanned(true);
  };

  const startClean = async () => {
    const selectedIds = categories.filter(c => c.checked).map(c => c.id);
    if (selectedIds.length === 0) return;

    setCleaning(true);
    
    if (tauriInvoke) {
      try {
        const result = await tauriInvoke('clean_junk', { categoryIds: selectedIds });
        setCleanResult(result);
      } catch (e) {
        console.error("Clean failed:", e);
        setCleanResult({ freed_human: '0 B', deleted_count: 0, errors: [String(e)] });
      }
    } else {
      await new Promise(r => setTimeout(r, 2000));
      const total = categories.filter(c => c.checked).reduce((s, c) => s + c.size_bytes, 0);
      setCleanResult({ freed_bytes: total, freed_human: formatSize(total), deleted_count: 42, errors: [] });
    }

    setCleaning(false);
  };

  const toggleCategory = (id: string) => {
    setCategories(cats => cats.map(c => c.id === id ? { ...c, checked: !c.checked } : c));
  };

  const formatSize = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(0)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const totalSelected = categories.filter(c => c.checked).reduce((s, c) => s + c.size_bytes, 0);

  if (cleanResult) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={48} />
        </div>
        <h3 className="text-2xl font-bold mb-2">Cleaning Complete!</h3>
        <p className="text-gray-500 mb-2">Freed <span className="font-bold text-emerald-600">{cleanResult.freed_human}</span></p>
        <p className="text-gray-400 text-sm mb-6">{cleanResult.deleted_count} items removed</p>
        {cleanResult.errors?.length > 0 && (
          <div className="mb-6 p-3 bg-amber-50 rounded-xl text-xs text-amber-700 max-w-md">
            {cleanResult.errors.length} items couldn't be removed (permission denied)
          </div>
        )}
        <button 
          onClick={() => { setCleanResult(null); setScanned(false); setCategories([]); }}
          className="px-8 py-3 bg-blue-500 text-white rounded-2xl font-semibold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-200"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-8 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-500">
            {scanning ? <Loader2 className="animate-spin" size={32} /> : <Trash2 size={32} />}
          </div>
          <div>
            <h3 className="text-xl font-bold">Deep Cleaning</h3>
            <p className="text-gray-500 text-sm">
              {scanned ? `Found ${categories.length} categories` : 'Scan your system to find junk files'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {scanned && (
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-500">{formatSize(totalSelected)}</div>
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">selected</div>
            </div>
          )}
          <button 
            onClick={startScan}
            disabled={scanning}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-2xl font-semibold text-gray-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            <RefreshCcw size={16} className={scanning ? 'animate-spin' : ''} />
            <span>{scanning ? 'Scanning...' : scanned ? 'Rescan' : 'Scan'}</span>
          </button>
        </div>
      </div>

      {scanned && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((cat) => (
              <div 
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`glass rounded-2xl p-5 cursor-pointer border transition-all duration-200 flex items-center space-x-4 ${
                  cat.checked ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/30' : 'border-transparent hover:bg-white/80'
                }`}
              >
                <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
                  cat.checked ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-300'
                }`}>
                  {cat.checked && <CheckCircle2 size={14} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{cat.name}</span>
                    <span className={`font-medium ${cat.size_bytes > 1e9 ? 'text-red-500' : 'text-gray-500'}`}>
                      {cat.size_human}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-1">{cat.description}</p>
                  <p className="text-[10px] text-gray-300 mt-0.5">{cat.items.length} items</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center mt-8">
            {!cleaning ? (
              <button 
                onClick={startClean}
                disabled={totalSelected === 0}
                className="px-12 py-4 bg-red-500 text-white rounded-2xl font-bold text-lg hover:bg-red-600 transition-all shadow-xl shadow-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clean {formatSize(totalSelected)}
              </button>
            ) : (
              <div className="flex flex-col items-center">
                <Loader2 className="animate-spin text-red-500 mb-4" size={40} />
                <p className="text-red-500 font-medium">Cleaning System Files...</p>
              </div>
            )}
          </div>
        </>
      )}

      {!scanned && !scanning && (
        <div className="glass rounded-3xl p-16 flex flex-col items-center justify-center text-center">
          <HardDrive size={48} className="text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-600">Ready to Clean</h3>
          <p className="text-sm text-gray-400 mt-2">Click Scan to find junk files on your system</p>
        </div>
      )}

      <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
        <AlertCircle className="text-amber-600 shrink-0" size={20} />
        <p className="text-xs text-amber-800 leading-relaxed">
          Cleaning system cache is safe. Some apps might take slightly longer to open the first time as they rebuild their cache. Trash items will be permanently deleted.
        </p>
      </div>
    </div>
  );
};

export default Cleaner;
