#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod scanner;

use scanner::{ScanRequest, Scanner};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

// ── Tauri command types ────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
struct DiskUsage {
    total_bytes: u64,
    used_bytes: u64,
    free_bytes: u64,
    total_gb: f64,
    used_gb: f64,
    free_gb: f64,
    usage_percent: f64,
}

#[derive(Debug, Serialize)]
struct ScanResultResponse {
    summary: scanner::ScanSummary,
    top_files: Vec<FileInfo>,
    by_extension: Vec<scanner::ExtensionStat>,
    stale_files: Vec<FileInfo>,
}

#[derive(Debug, Serialize)]
struct FileInfo {
    path: String,
    size_bytes: u64,
    size_human: String,
    extension: Option<String>,
}

#[derive(Debug, Serialize)]
struct StartupItem {
    name: String,
    path: String,
    kind: String, // "LaunchAgent" or "LaunchDaemon"
    enabled: bool,
}

#[derive(Debug, Serialize)]
struct ProcessInfo {
    pid: u32,
    name: String,
    cpu_percent: f64,
    memory_mb: f64,
    command: String,
}

// ── O-5: Junk cleaner types ────────────────────────────────────────────────

#[derive(Debug, Serialize)]
struct JunkCategory {
    id: String,
    name: String,
    description: String,
    size_bytes: u64,
    size_human: String,
    items: Vec<JunkItem>,
}

#[derive(Debug, Serialize)]
struct JunkItem {
    path: String,
    size_bytes: u64,
    size_human: String,
}

#[derive(Debug, Serialize)]
struct CleanResult {
    freed_bytes: u64,
    freed_human: String,
    deleted_count: u32,
    errors: Vec<String>,
}

// ── O-7: Duplicate file types ──────────────────────────────────────────────

#[derive(Debug, Serialize)]
struct DuplicateGroup {
    hash: String,
    size_bytes: u64,
    size_human: String,
    files: Vec<String>,
}

#[derive(Debug, Serialize)]
struct DuplicateResult {
    groups: Vec<DuplicateGroup>,
    total_wasted_bytes: u64,
    total_wasted_human: String,
    total_groups: usize,
}

// ── Helper functions ───────────────────────────────────────────────────────

fn human_size(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;
    if bytes >= GB {
        format!("{:.1} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.1} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.1} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}

// ── O-1: Real disk usage ───────────────────────────────────────────────────

#[tauri::command]
fn get_disk_usage() -> Result<DiskUsage, String> {
    use std::process::Command;
    let output = Command::new("df")
        .args(["-k", "/"])
        .output()
        .map_err(|e| format!("Failed to run df: {}", e))?;
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = stdout.lines().collect();
    if lines.len() < 2 {
        return Err("Unexpected df output".to_string());
    }
    
    let parts: Vec<&str> = lines[1].split_whitespace().collect();
    if parts.len() < 4 {
        return Err("Cannot parse df output".to_string());
    }
    
    let total_kb: u64 = parts[1].parse().unwrap_or(0);
    let used_kb: u64 = parts[2].parse().unwrap_or(0);
    let free_kb: u64 = parts[3].parse().unwrap_or(0);
    
    let total_bytes = total_kb * 1024;
    let used_bytes = used_kb * 1024;
    let free_bytes = free_kb * 1024;
    
    Ok(DiskUsage {
        total_bytes,
        used_bytes,
        free_bytes,
        total_gb: total_bytes as f64 / (1024.0 * 1024.0 * 1024.0),
        used_gb: used_bytes as f64 / (1024.0 * 1024.0 * 1024.0),
        free_gb: free_bytes as f64 / (1024.0 * 1024.0 * 1024.0),
        usage_percent: if total_bytes > 0 { used_bytes as f64 / total_bytes as f64 * 100.0 } else { 0.0 },
    })
}

// ── O-2: Disk scan using Surf engine ───────────────────────────────────────

#[tauri::command]
fn scan_directory(path: String, limit: Option<usize>, min_size_mb: Option<u64>) -> Result<ScanResultResponse, String> {
    let mut request = ScanRequest::new(&path);
    request.limit = Some(limit.unwrap_or(20));
    if let Some(mb) = min_size_mb {
        request.min_size = Some(mb * 1024 * 1024);
    }
    request.stale_days = Some(90);
    
    let scanner = Scanner::new();
    let result = scanner.scan_sync(&request).map_err(|e| format!("Scan failed: {}", e))?;
    
    let top_files: Vec<FileInfo> = result.top_files.iter().map(|f| FileInfo {
        path: f.path.to_string_lossy().to_string(),
        size_bytes: f.size_bytes,
        size_human: human_size(f.size_bytes),
        extension: f.extension.clone(),
    }).collect();
    
    let stale_files: Vec<FileInfo> = result.stale_files.iter().map(|f| FileInfo {
        path: f.path.to_string_lossy().to_string(),
        size_bytes: f.size_bytes,
        size_human: human_size(f.size_bytes),
        extension: f.extension.clone(),
    }).collect();
    
    Ok(ScanResultResponse {
        summary: result.summary,
        top_files,
        by_extension: result.by_extension,
        stale_files,
    })
}

// ── O-3: Startup items ─────────────────────────────────────────────────────

#[tauri::command]
fn get_startup_items() -> Vec<StartupItem> {
    let mut items = Vec::new();
    
    // User LaunchAgents
    let home = std::env::var("HOME").unwrap_or_default();
    let user_agents = format!("{}/Library/LaunchAgents", home);
    scan_launch_dir(&user_agents, "LaunchAgent", &mut items);
    
    // System LaunchAgents
    scan_launch_dir("/Library/LaunchAgents", "LaunchAgent", &mut items);
    
    // System LaunchDaemons
    scan_launch_dir("/Library/LaunchDaemons", "LaunchDaemon", &mut items);
    
    items
}

fn scan_launch_dir(dir: &str, kind: &str, items: &mut Vec<StartupItem>) {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map_or(false, |e| e == "plist") {
                let name = path.file_stem()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_default();
                
                // Check if disabled
                let enabled = !name.contains("disabled");
                
                items.push(StartupItem {
                    name,
                    path: path.to_string_lossy().to_string(),
                    kind: kind.to_string(),
                    enabled,
                });
            }
        }
    }
}

// ── O-4: Process monitor ───────────────────────────────────────────────────

#[tauri::command]
fn get_processes(limit: Option<usize>) -> Result<Vec<ProcessInfo>, String> {
    use std::process::Command;
    let output = Command::new("ps")
        .args(["-eo", "pid,pcpu,rss,comm", "-r"])
        .output()
        .map_err(|e| format!("Failed to run ps: {}", e))?;
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let max = limit.unwrap_or(20);
    let mut processes = Vec::new();
    
    for line in stdout.lines().skip(1).take(max) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 4 {
            let pid: u32 = parts[0].parse().unwrap_or(0);
            let cpu: f64 = parts[1].parse().unwrap_or(0.0);
            let rss_kb: f64 = parts[2].parse().unwrap_or(0.0);
            let command = parts[3..].join(" ");
            let name = command.split('/').last().unwrap_or(&command).to_string();
            
            processes.push(ProcessInfo {
                pid,
                name,
                cpu_percent: cpu,
                memory_mb: rss_kb / 1024.0,
                command,
            });
        }
    }
    
    Ok(processes)
}

// ── O-5: Junk cleaner ──────────────────────────────────────────────────────

fn scan_junk_dir(dir: &str, items: &mut Vec<JunkItem>) -> u64 {
    let mut total: u64 = 0;
    let path = Path::new(dir);
    if !path.exists() {
        return 0;
    }
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if let Ok(meta) = p.metadata() {
                if meta.is_file() {
                    let size = meta.len();
                    total += size;
                    items.push(JunkItem {
                        path: p.to_string_lossy().to_string(),
                        size_bytes: size,
                        size_human: human_size(size),
                    });
                } else if meta.is_dir() {
                    total += scan_junk_dir(&p.to_string_lossy(), items);
                }
            }
        }
    }
    total
}

#[tauri::command]
fn scan_junk() -> Vec<JunkCategory> {
    let home = std::env::var("HOME").unwrap_or_default();
    let mut categories = Vec::new();

    // 1. System caches (user-level)
    {
        let mut items = Vec::new();
        let dir = format!("{}/Library/Caches", home);
        let size = scan_junk_dir(&dir, &mut items);
        categories.push(JunkCategory {
            id: "system_cache".into(),
            name: "System & App Cache".into(),
            description: "Temporary cached data from applications and macOS".into(),
            size_bytes: size,
            size_human: human_size(size),
            items,
        });
    }

    // 2. Application logs
    {
        let mut items = Vec::new();
        let dir = format!("{}/Library/Logs", home);
        let size = scan_junk_dir(&dir, &mut items);
        categories.push(JunkCategory {
            id: "app_logs".into(),
            name: "Application Logs".into(),
            description: "Log files generated by applications".into(),
            size_bytes: size,
            size_human: human_size(size),
            items,
        });
    }

    // 3. Trash
    {
        let mut items = Vec::new();
        let dir = format!("{}/.Trash", home);
        let size = scan_junk_dir(&dir, &mut items);
        categories.push(JunkCategory {
            id: "trash".into(),
            name: "Trash Bin".into(),
            description: "Files you've deleted but not emptied from Trash".into(),
            size_bytes: size,
            size_human: human_size(size),
            items,
        });
    }

    // 4. Temporary files
    {
        let mut items = Vec::new();
        let mut size: u64 = 0;
        for dir in &["/tmp", "/var/tmp"] {
            size += scan_junk_dir(dir, &mut items);
        }
        categories.push(JunkCategory {
            id: "temp_files".into(),
            name: "Temporary Files".into(),
            description: "System temp files in /tmp and /var/tmp".into(),
            size_bytes: size,
            size_human: human_size(size),
            items,
        });
    }

    // 5. Xcode derived data (if exists)
    {
        let xcode_dir = format!("{}/Library/Developer/Xcode/DerivedData", home);
        if Path::new(&xcode_dir).exists() {
            let mut items = Vec::new();
            let size = scan_junk_dir(&xcode_dir, &mut items);
            categories.push(JunkCategory {
                id: "xcode_derived".into(),
                name: "Xcode Derived Data".into(),
                description: "Build artifacts from Xcode projects".into(),
                size_bytes: size,
                size_human: human_size(size),
                items,
            });
        }
    }

    // 6. npm/yarn cache
    {
        let mut items = Vec::new();
        let mut size: u64 = 0;
        let npm_cache = format!("{}/.npm/_cacache", home);
        if Path::new(&npm_cache).exists() {
            size += scan_junk_dir(&npm_cache, &mut items);
        }
        let yarn_cache = format!("{}/Library/Caches/Yarn", home);
        if Path::new(&yarn_cache).exists() {
            size += scan_junk_dir(&yarn_cache, &mut items);
        }
        if size > 0 {
            categories.push(JunkCategory {
                id: "npm_cache".into(),
                name: "npm/Yarn Cache".into(),
                description: "Cached packages from npm and Yarn".into(),
                size_bytes: size,
                size_human: human_size(size),
                items,
            });
        }
    }

    // Sort by size descending
    categories.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
    categories
}

#[tauri::command]
fn clean_junk(category_ids: Vec<String>) -> CleanResult {
    let home = std::env::var("HOME").unwrap_or_default();
    let mut freed: u64 = 0;
    let mut deleted: u32 = 0;
    let mut errors = Vec::new();

    let dir_map: HashMap<&str, Vec<String>> = HashMap::from([
        ("system_cache", vec![format!("{}/Library/Caches", home)]),
        ("app_logs", vec![format!("{}/Library/Logs", home)]),
        ("trash", vec![format!("{}/.Trash", home)]),
        ("temp_files", vec!["/tmp".into(), "/var/tmp".into()]),
        ("xcode_derived", vec![format!("{}/Library/Developer/Xcode/DerivedData", home)]),
        ("npm_cache", vec![
            format!("{}/.npm/_cacache", home),
            format!("{}/Library/Caches/Yarn", home),
        ]),
    ]);

    for cat_id in &category_ids {
        if let Some(dirs) = dir_map.get(cat_id.as_str()) {
            for dir in dirs {
                let path = Path::new(dir);
                if !path.exists() { continue; }
                if let Ok(entries) = std::fs::read_dir(path) {
                    for entry in entries.flatten() {
                        let p = entry.path();
                        match if p.is_dir() {
                            std::fs::remove_dir_all(&p)
                        } else {
                            std::fs::remove_file(&p)
                        } {
                            Ok(()) => {
                                if let Ok(meta) = entry.metadata() {
                                    freed += meta.len();
                                }
                                deleted += 1;
                            },
                            Err(e) => {
                                errors.push(format!("{}: {}", p.display(), e));
                            }
                        }
                    }
                }
            }
        }
    }

    CleanResult {
        freed_bytes: freed,
        freed_human: human_size(freed),
        deleted_count: deleted,
        errors: if errors.len() > 10 { errors[..10].to_vec() } else { errors },
    }
}

// ── O-7: Duplicate file detection ──────────────────────────────────────────

#[tauri::command]
fn find_duplicates(path: String, min_size_mb: Option<u64>) -> Result<DuplicateResult, String> {
    use std::collections::HashMap;
    use std::io::Read;

    let min_bytes = min_size_mb.unwrap_or(1) * 1024 * 1024;
    
    // Phase 1: Group files by size
    let mut size_map: HashMap<u64, Vec<PathBuf>> = HashMap::new();
    let root = Path::new(&path);
    
    fn walk_dir(dir: &Path, size_map: &mut HashMap<u64, Vec<PathBuf>>, min_bytes: u64) {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_symlink() { continue; }
                if p.is_dir() {
                    // Skip hidden dirs and system dirs
                    let name = p.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
                    if name.starts_with('.') || name == "node_modules" || name == "target" || name == ".git" {
                        continue;
                    }
                    walk_dir(&p, size_map, min_bytes);
                } else if let Ok(meta) = p.metadata() {
                    if meta.len() >= min_bytes {
                        size_map.entry(meta.len()).or_default().push(p);
                    }
                }
            }
        }
    }
    
    walk_dir(root, &mut size_map, min_bytes);
    
    // Phase 2: For files with same size, compare by partial hash (first 4KB)
    let mut groups: Vec<DuplicateGroup> = Vec::new();
    
    for (size, files) in &size_map {
        if files.len() < 2 { continue; }
        
        let mut hash_map: HashMap<String, Vec<String>> = HashMap::new();
        for file in files {
            if let Ok(mut f) = std::fs::File::open(file) {
                let mut buf = vec![0u8; 4096.min(*size as usize)];
                if f.read_exact(&mut buf).is_ok() {
                    // Simple hash: use the bytes as a hex digest
                    let hash = format!("{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",
                        buf[0], buf[1.min(buf.len()-1)], buf[2.min(buf.len()-1)], buf[3.min(buf.len()-1)],
                        buf[buf.len()/4], buf[buf.len()/2], buf[buf.len()*3/4], buf[buf.len()-1]);
                    hash_map.entry(hash).or_default().push(file.to_string_lossy().to_string());
                }
            }
        }
        
        for (hash, paths) in hash_map {
            if paths.len() >= 2 {
                groups.push(DuplicateGroup {
                    hash,
                    size_bytes: *size,
                    size_human: human_size(*size),
                    files: paths,
                });
            }
        }
    }
    
    groups.sort_by(|a, b| {
        let a_waste = a.size_bytes * (a.files.len() as u64 - 1);
        let b_waste = b.size_bytes * (b.files.len() as u64 - 1);
        b_waste.cmp(&a_waste)
    });
    
    // Limit to top 50 groups
    groups.truncate(50);
    
    let total_wasted: u64 = groups.iter().map(|g| g.size_bytes * (g.files.len() as u64 - 1)).sum();
    let total_groups = groups.len();
    
    Ok(DuplicateResult {
        groups,
        total_wasted_bytes: total_wasted,
        total_wasted_human: human_size(total_wasted),
        total_groups,
    })
}

// ── App entry point ────────────────────────────────────────────────────────

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_disk_usage,
            scan_directory,
            get_startup_items,
            get_processes,
            scan_junk,
            clean_junk,
            find_duplicates,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
