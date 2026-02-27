
// O-8: System analysis service
// Provides intelligent analysis based on real system data
// Falls back to local heuristics when Gemini API is unavailable

let tauriInvoke: any = null;
try {
  if ((window as any).__TAURI__) {
    import('@tauri-apps/api/tauri').then(mod => { tauriInvoke = mod.invoke; });
  }
} catch (e) {}

interface SystemReport {
  disk: { used_gb: number; total_gb: number; percent: number };
  junkCategories?: { name: string; size_human: string; size_bytes: number }[];
  processCount?: number;
  highCpuProcesses?: { name: string; cpu_percent: number }[];
  startupCount?: number;
}

export const generateSystemReport = async (): Promise<SystemReport> => {
  const report: SystemReport = {
    disk: { used_gb: 0, total_gb: 0, percent: 0 },
  };

  if (!tauriInvoke) return report;

  try {
    const disk = await tauriInvoke('get_disk_usage');
    report.disk = {
      used_gb: Math.round(disk.used_gb * 10) / 10,
      total_gb: Math.round(disk.total_gb * 10) / 10,
      percent: Math.round(disk.usage_percent * 10) / 10,
    };
  } catch (e) {}

  try {
    const procs = await tauriInvoke('get_processes', { limit: 50 });
    report.processCount = procs.length;
    report.highCpuProcesses = procs
      .filter((p: any) => p.cpu_percent > 5)
      .slice(0, 5)
      .map((p: any) => ({ name: p.name, cpu_percent: p.cpu_percent }));
  } catch (e) {}

  try {
    const items = await tauriInvoke('get_startup_items');
    report.startupCount = items.length;
  } catch (e) {}

  return report;
};

export const analyzeSystemHealth = (report: SystemReport): string[] => {
  const tips: string[] = [];

  // Disk analysis
  if (report.disk.percent > 90) {
    tips.push(`⚠️ Critical: Disk is ${report.disk.percent}% full (${report.disk.used_gb}/${report.disk.total_gb} GB). Free up space immediately to avoid system slowdowns.`);
  } else if (report.disk.percent > 75) {
    tips.push(`📊 Disk usage is ${report.disk.percent}% — consider running Junk Cleaner or checking Large Files.`);
  } else {
    tips.push(`✅ Disk health is good at ${report.disk.percent}% usage.`);
  }

  // CPU analysis
  if (report.highCpuProcesses && report.highCpuProcesses.length > 0) {
    const names = report.highCpuProcesses.map(p => `${p.name} (${p.cpu_percent.toFixed(1)}%)`).join(', ');
    tips.push(`🔥 High CPU processes: ${names}. Check Background tab for details.`);
  }

  // Startup analysis
  if (report.startupCount && report.startupCount > 20) {
    tips.push(`⚡ ${report.startupCount} startup items detected — consider disabling unused ones to speed up boot time.`);
  } else if (report.startupCount) {
    tips.push(`🚀 ${report.startupCount} startup items — looks reasonable.`);
  }

  return tips;
};

// Legacy exports for compatibility
export const explainProcess = async (processName: string): Promise<string> => {
  // Common macOS processes
  const known: Record<string, string> = {
    'launchd': 'Core macOS system process that manages all other processes and services. It\'s the first process started by the kernel.',
    'WindowServer': 'Handles all window drawing, compositing, and display management. Essential for the GUI.',
    'kernel_task': 'macOS kernel — manages hardware, memory, and CPU scheduling. High CPU may indicate thermal throttling.',
    'mds': 'Spotlight indexing daemon — indexes files for fast search. High CPU is normal after large file changes.',
    'mds_stores': 'Spotlight metadata store — caches search index data.',
    'cloudd': 'iCloud sync daemon — handles file sync with iCloud Drive.',
    'nsurlsessiond': 'Handles background network downloads and uploads for apps.',
    'loginwindow': 'Manages the login screen and user session.',
    'Dock': 'Manages the macOS Dock, Mission Control, and Launchpad.',
    'Finder': 'macOS file manager — handles desktop, file browsing, and Trash.',
  };

  if (known[processName]) {
    return known[processName];
  }

  return `${processName} is a background process on your Mac. Check Activity Monitor for more details.`;
};
