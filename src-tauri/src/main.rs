#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod scanner;

use scanner::{ScanRequest, Scanner};
use serde::Serialize;

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

// ── App entry point ────────────────────────────────────────────────────────

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_disk_usage,
            scan_directory,
            get_startup_items,
            get_processes,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
