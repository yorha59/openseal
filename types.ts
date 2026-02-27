
export enum ViewType {
  DASHBOARD = 'DASHBOARD',
  CLEANER = 'CLEANER',
  LARGE_FILES = 'LARGE_FILES',
  DUPLICATES = 'DUPLICATES',
  STARTUP = 'STARTUP',
  ACTIVITY = 'ACTIVITY'
}

export interface FileItem {
  name: string;
  path: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface JunkCategory {
  id: string;
  name: string;
  description: string;
  size: number;
  checked: boolean;
  items?: FileItem[];
}

export interface StartupItem {
  id: string;
  name: string;
  developer: string;
  impact: 'High' | 'Medium' | 'Low';
  enabled: boolean;
  description: string;
}

export interface ProcessItem {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  user: string;
  description?: string;
}
