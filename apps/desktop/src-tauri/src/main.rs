// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{State, Manager, Emitter};
use notify::{Watcher, RecursiveMode, Event};
use std::sync::mpsc::{channel, Sender, Receiver, RecvTimeoutError};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Duration;
use rusqlite::Connection;

// ── Veri Modelleri ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OMRPayload {
    pub student_id: String,
    pub exam_id: String,
    pub exam_type: String,
    pub answer_string: String,
    pub raw_text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncStatus {
    pub total_queued: usize,
    pub total_synced: usize,
    pub total_failed: usize,
    pub last_sync: String,
    pub is_online: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub api_endpoint: String,
    pub api_token: String,
    pub watch_path: String,
}

// ── Application State ──

struct AppState {
    watch_path: Mutex<String>,
    api_endpoint: std::sync::Arc<Mutex<String>>,
    api_token: std::sync::Arc<Mutex<String>>,
    omr_sender: Mutex<Sender<(i64, serde_json::Value)>>,
    sync_status: std::sync::Arc<Mutex<SyncStatus>>,
    db_path: Mutex<String>,
    active_watcher: Mutex<Option<notify::RecommendedWatcher>>,
}

// ── Bulut API Endpoint ──

fn get_cloud_endpoint(state: &AppState) -> String {
    let endpoint = state.api_endpoint.lock().unwrap();
    if endpoint.is_empty() {
        std::env::var("CLOUD_API_ENDPOINT")
            .unwrap_or_else(|_| String::from("https://aydim.com"))
    } else {
        endpoint.clone()
    }
}

fn get_api_token(state: &AppState) -> String {
    let token = state.api_token.lock().unwrap();
    if token.is_empty() {
        std::env::var("API_TOKEN").unwrap_or_default()
    } else {
        token.clone()
    }
}

// ── SQLite Offline Cache ──

fn open_db(db_path: &str) -> rusqlite::Result<Connection> {
    let conn = Connection::open(db_path)?;
    conn.busy_timeout(Duration::from_millis(5000))?;
    let _ = conn.execute("PRAGMA journal_mode=WAL;", []);
    let _ = conn.execute("PRAGMA synchronous=NORMAL;", []);
    Ok(conn)
}

fn init_sqlite(db_path: &str) -> rusqlite::Result<()> {
    let conn = open_db(db_path)?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS omr_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            payload TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            synced INTEGER DEFAULT 0,
            retries INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sync_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            details TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );"
    )?;

    // Create indices on omr_queue(synced) and sync_log(created_at)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_omr_queue_synced ON omr_queue(synced);", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_sync_log_created_at ON sync_log(created_at);", [])?;

    Ok(())
}

fn prune_sync_data(db_path: &str) {
    if let Ok(conn) = open_db(db_path) {
        match conn.execute(
            "DELETE FROM omr_queue WHERE synced = 1 AND created_at < datetime('now', '-30 days')",
            [],
        ) {
            Ok(deleted) => {
                if deleted > 0 {
                    log_sync_event(db_path, "PRUNE_SUCCESS", &format!("{} adet 30 günden eski senkronize edilmiş kayıt temizlendi.", deleted));
                    println!("Pruned {} old synced items", deleted);
                }
            }
            Err(e) => {
                log_sync_event(db_path, "PRUNE_ERROR", &e.to_string());
            }
        }
    }
}

fn save_to_offline_cache(db_path: &str, payload: &serde_json::Value) -> rusqlite::Result<i64> {
    let conn = open_db(db_path)?;
    conn.execute(
        "INSERT INTO omr_queue (payload) VALUES (?1)",
        [payload.to_string()],
    )?;
    Ok(conn.last_insert_rowid())
}

fn get_pending_from_cache(db_path: &str) -> rusqlite::Result<Vec<(i64, serde_json::Value)>> {
    let conn = open_db(db_path)?;
    let mut stmt = conn.prepare("SELECT id, payload FROM omr_queue WHERE synced = 0 ORDER BY id LIMIT 100")?;
    let rows = stmt.query_map([], |row| {
        let id: i64 = row.get(0)?;
        let payload_str: String = row.get(1)?;
        let payload: serde_json::Value = serde_json::from_str(&payload_str).unwrap_or(json!({}));
        Ok((id, payload))
    })?;
    rows.collect()
}

fn mark_synced(db_path: &str, ids: &[i64]) -> rusqlite::Result<()> {
    let conn = open_db(db_path)?;
    for id in ids {
        conn.execute("UPDATE omr_queue SET synced = 1 WHERE id = ?1", [id])?;
    }
    Ok(())
}

fn mark_failed(db_path: &str, ids: &[i64]) -> rusqlite::Result<()> {
    let conn = open_db(db_path)?;
    for id in ids {
        conn.execute("UPDATE omr_queue SET synced = -1 WHERE id = ?1", [id])?;
    }
    Ok(())
}

fn increment_retries(db_path: &str, ids: &[i64]) -> rusqlite::Result<()> {
    let conn = open_db(db_path)?;
    for id in ids {
        conn.execute("UPDATE omr_queue SET retries = retries + 1 WHERE id = ?1", [id])?;
    }
    Ok(())
}

fn save_config(db_path: &str, key: &str, value: &str) -> rusqlite::Result<()> {
    let conn = open_db(db_path)?;
    conn.execute(
        "INSERT OR REPLACE INTO config (key, value) VALUES (?1, ?2)",
        [key, value],
    )?;
    Ok(())
}

fn load_config(db_path: &str, key: &str) -> rusqlite::Result<Option<String>> {
    let conn = open_db(db_path)?;
    let mut stmt = conn.prepare("SELECT value FROM config WHERE key = ?1")?;
    let result = stmt.query_row([key], |row| row.get(0)).ok();
    Ok(result)
}

fn log_sync_event(db_path: &str, event_type: &str, details: &str) {
    if let Ok(conn) = open_db(db_path) {
        let _ = conn.execute(
            "INSERT INTO sync_log (event_type, details) VALUES (?1, ?2)",
            [event_type, details],
        );
    }
}

// ── OMR Dosya Ayrıştırıcı (Gerçek Parsing) ──

fn read_file_with_retry(path: &PathBuf) -> Result<String, std::io::Error> {
    let mut retries = 5;
    let mut delay = Duration::from_millis(100);
    loop {
        match std::fs::read_to_string(path) {
            Ok(content) => {
                if !content.trim().is_empty() {
                    return Ok(content);
                } else if retries == 0 {
                    return Ok(content);
                }
            }
            Err(e) => {
                if retries == 0 {
                    return Err(e);
                }
            }
        }
        std::thread::sleep(delay);
        retries -= 1;
        delay *= 2;
    }
}

fn parse_omr_file(file_path: &PathBuf) -> Option<Vec<OMRPayload>> {
    let content = read_file_with_retry(file_path).ok()?;
    let mut results = Vec::new();

    // Desteklenen OMR formatları:
    // Format 1 (Satır bazlı): Her satır bir öğrenci → "OgrenciNo|SinavKodu|SinavTipi|CevapDizisi"
    // Format 2 (Toplu dosya): "SINAV:TYT-001\nOGRENCILER:\nNo:123,Cevap:ABCDE..."
    // Format 3 (CSV tabanlı): "ogrenci_no,sinav_id,cevap"

    let lines: Vec<&str> = content.lines().collect();

    if lines.is_empty() {
        return None;
    }

    // Format 2 (Toplu dosya) denemesi:
    if content.contains("SINAV:") && content.contains("OGRENCILER:") {
        let mut current_exam_id = String::new();
        let mut reading_students = false;

        for line in lines.iter() {
            let line = line.trim();
            if line.is_empty() { continue; }

            if line.starts_with("SINAV:") {
                current_exam_id = line["SINAV:".len()..].trim().to_string();
            } else if line.starts_with("OGRENCILER:") {
                reading_students = true;
            } else if reading_students {
                let parts: Vec<&str> = line.split(',').collect();
                let mut student_id = String::new();
                let mut answer_string = String::new();
                for part in parts {
                    let kv: Vec<&str> = part.split(':').collect();
                    if kv.len() == 2 {
                        let key = kv[0].trim().to_lowercase();
                        let val = kv[1].trim().to_string();
                        if key == "no" || key == "student" || key == "id" {
                            student_id = val;
                        } else if key == "cevap" || key == "answer" {
                            answer_string = val;
                        }
                    }
                }
                if !student_id.is_empty() && !answer_string.is_empty() {
                    let exam_type = if current_exam_id.to_uppercase().contains("AYT") {
                        if current_exam_id.to_uppercase().contains("SAY") {
                            "AYT_SAY".to_string()
                        } else if current_exam_id.to_uppercase().contains("EA") {
                            "AYT_EA".to_string()
                        } else if current_exam_id.to_uppercase().contains("SOZ") {
                            "AYT_SOZ".to_string()
                        } else {
                            "AYT_SAY".to_string()
                        }
                    } else {
                        "TYT".to_string()
                    };

                    results.push(OMRPayload {
                        student_id,
                        exam_id: current_exam_id.clone(),
                        exam_type,
                        answer_string,
                        raw_text: line.to_string(),
                    });
                }
            }
        }
    }
    // CSV formatı denemesi (virgülle ayrılmış)
    else if lines[0].contains(',') {
        for (i, line) in lines.iter().enumerate() {
            let line = line.trim();
            if line.is_empty() || (i == 0 && (line.to_lowercase().contains("ogrenci") || line.to_lowercase().contains("student"))) {
                continue; // Header satırını atla
            }
            let parts: Vec<&str> = line.split(',').collect();
            if parts.len() >= 3 {
                results.push(OMRPayload {
                    student_id: parts[0].trim().to_string(),
                    exam_id: parts[1].trim().to_string(),
                    exam_type: if parts.len() > 3 { parts[3].trim().to_string() } else { "TYT".to_string() },
                    answer_string: parts[2].trim().to_string(),
                    raw_text: line.to_string(),
                });
            }
        }
    }
    // Pipe formatı denemesi
    else if lines[0].contains('|') {
        for line in lines.iter() {
            let line = line.trim();
            if line.is_empty() { continue; }
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 3 {
                results.push(OMRPayload {
                    student_id: parts[0].trim().to_string(),
                    exam_id: parts[1].trim().to_string(),
                    exam_type: if parts.len() > 3 { parts[2].trim().to_string() } else { "TYT".to_string() },
                    answer_string: if parts.len() > 3 { parts[3].trim().to_string() } else { parts[2].trim().to_string() },
                    raw_text: line.to_string(),
                });
            }
        }
    }
    // Tab-separated formatı
    else if lines[0].contains('\t') {
        for (i, line) in lines.iter().enumerate() {
            let line = line.trim();
            if line.is_empty() || i == 0 { continue; }
            let parts: Vec<&str> = line.split('\t').collect();
            if parts.len() >= 3 {
                results.push(OMRPayload {
                    student_id: parts[0].trim().to_string(),
                    exam_id: parts[1].trim().to_string(),
                    exam_type: if parts.len() > 3 { parts[3].trim().to_string() } else { "TYT".to_string() },
                    answer_string: parts[2].trim().to_string(),
                    raw_text: line.to_string(),
                });
            }
        }
    }
    // Tek satır yapısız — ham metin olarak gönder
    else {
        results.push(OMRPayload {
            student_id: "UNMATCHED".to_string(),
            exam_id: file_path.file_stem().unwrap_or_default().to_string_lossy().to_string(),
            exam_type: "TYT".to_string(),
            answer_string: content.trim().to_string(),
            raw_text: content,
        });
    }

    if results.is_empty() { None } else { Some(results) }
}

// ── Tauri Commands ──

#[tauri::command]
fn get_watch_directory(state: State<'_, AppState>) -> Result<String, String> {
    let path = state.watch_path.lock().unwrap();
    Ok(path.clone())
}

#[tauri::command]
fn update_watch_directory(path: String, state: State<'_, AppState>) -> Result<String, String> {
    // Drop the old watcher first to terminate the old thread
    {
        let mut active = state.active_watcher.lock().unwrap();
        *active = None;
    }

    let mut current_path = state.watch_path.lock().unwrap();
    *current_path = path.clone();

    // Ayarı SQLite'a kaydet
    let db_path = state.db_path.lock().unwrap().clone();
    let _ = save_config(&db_path, "watch_path", &path);

    // Klasör izleyicisini asenkron arka planda başlat
    let sender = state.omr_sender.lock().unwrap().clone();
    let new_watcher = start_folder_watcher(path.clone(), sender, db_path);

    // Save the new watcher in state
    {
        let mut active = state.active_watcher.lock().unwrap();
        *active = new_watcher;
    }

    println!("Watcher hedefi güncellendi. Yeni Dizin: {}", path);
    Ok(path)
}

#[tauri::command]
fn get_config(state: State<'_, AppState>) -> Result<AppConfig, String> {
    let watch_path = state.watch_path.lock().unwrap().clone();
    let api_endpoint = state.api_endpoint.lock().unwrap().clone();
    let api_token = state.api_token.lock().unwrap().clone();
    Ok(AppConfig { api_endpoint, api_token, watch_path })
}

#[tauri::command]
fn update_config(config: AppConfig, state: State<'_, AppState>) -> Result<String, String> {
    let db_path = state.db_path.lock().unwrap().clone();

    *state.api_endpoint.lock().unwrap() = config.api_endpoint.clone();
    *state.api_token.lock().unwrap() = config.api_token.clone();
    *state.watch_path.lock().unwrap() = config.watch_path.clone();

    let _ = save_config(&db_path, "api_endpoint", &config.api_endpoint);
    let _ = save_config(&db_path, "api_token", &config.api_token);
    let _ = save_config(&db_path, "watch_path", &config.watch_path);

    Ok("Config updated".to_string())
}

#[tauri::command]
fn get_sync_status(state: State<'_, AppState>) -> Result<SyncStatus, String> {
    let status = state.sync_status.lock().unwrap().clone();
    Ok(status)
}


#[tauri::command]
fn get_sync_logs(state: State<'_, AppState>) -> Result<Vec<serde_json::Value>, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = open_db(&db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT event_type, details, created_at FROM sync_log ORDER BY id DESC LIMIT 100"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        let event_type: String = row.get(0)?;
        let details: String = row.get(1)?;
        let timestamp: String = row.get(2)?;
        Ok(json!({
            "eventType": event_type,
            "details": details,
            "timestamp": timestamp
        }))
    }).map_err(|e| e.to_string())?;
    let results: Vec<serde_json::Value> = rows.filter_map(|r| r.ok()).collect();
    Ok(results)
}

#[tauri::command]
fn get_offline_queue_count(state: State<'_, AppState>) -> Result<usize, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = open_db(&db_path).map_err(|e| e.to_string())?;
    let count: usize = conn.query_row(
        "SELECT COUNT(*) FROM omr_queue WHERE synced = 0", [], |row| row.get(0)
    ).unwrap_or(0);
    Ok(count)
}

#[tauri::command]
fn force_sync(state: State<'_, AppState>) -> Result<String, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let endpoint = get_cloud_endpoint(&state);
    let token = get_api_token(&state);

    std::thread::spawn(move || {
        let client = reqwest::blocking::Client::new();
        retry_offline_queue(&db_path, &client, &endpoint, &token);
    });

    Ok("Sync started".to_string())
}

// ── Tüm API endpoint'leri için generic HTTP client ──

#[tauri::command]
async fn api_request(
    method: String,
    path: String,
    body: Option<serde_json::Value>,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let base_url = get_cloud_endpoint(&state);
    let token = get_api_token(&state);
    let db_path = state.db_path.lock().unwrap().clone();
    let url = format!("{}{}", base_url, path);

    let client = reqwest::Client::new();

    let mut request = match method.to_uppercase().as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        "PATCH" => client.patch(&url),
        _ => return Err(format!("Unsupported method: {}", method)),
    };

    // Auth header
    if !token.is_empty() {
        request = request.header("Authorization", format!("Bearer {}", token));
    }

    // Content-Type
    request = request.header("Content-Type", "application/json");

    // Body
    if let Some(b) = body {
        request = request.json(&b);
    }

    let response = request.send().await.map_err(|e| {
        log_sync_event(&db_path, "API_ERROR", &format!("{}: {}", url, e));
        format!("Network error: {}", e)
    })?;

    let status = response.status().as_u16();

    if status >= 400 {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("HTTP {}: {}", status, error_text));
    }

    let json_response: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    Ok(json_response)
}

// ── Folder Watcher ──

fn start_folder_watcher(watch_dir: String, batch_tx: Sender<(i64, serde_json::Value)>, db_path: String) -> Option<notify::RecommendedWatcher> {
    let watch_path = Path::new(&watch_dir);
    if !watch_path.exists() {
        eprintln!("İzleme dizini bulunamadı: {}", watch_dir);
        return None;
    }

    let (tx, rx) = channel();
    let mut watcher = notify::recommended_watcher(tx).expect("Watcher oluşturulamadı");
    watcher.watch(watch_path, RecursiveMode::Recursive).expect("Klasör izlenemiyor");
    println!("İzleme başladı: {:?}", watch_path);
    log_sync_event(&db_path, "WATCHER_START", &format!("Klasör: {}", watch_dir));

    std::thread::spawn(move || {
        let mut processed_hashes: std::collections::HashMap<PathBuf, u64> = std::collections::HashMap::new();

        for res in rx {
            match res {
                Ok(Event { kind: notify::EventKind::Modify(_), paths, .. }) |
                Ok(Event { kind: notify::EventKind::Create(_), paths, .. }) => {
                    for path in paths {
                        if path.extension().and_then(|s| s.to_str()) == Some("txt") {
                            // Debounce: sleep briefly to allow write operations to complete
                            std::thread::sleep(Duration::from_millis(150));

                            if let Ok(content) = std::fs::read_to_string(&path) {
                                if content.trim().is_empty() {
                                    continue;
                                }
                                use std::collections::hash_map::DefaultHasher;
                                use std::hash::{Hash, Hasher};
                                let mut hasher = DefaultHasher::new();
                                content.hash(&mut hasher);
                                let file_hash = hasher.finish();

                                if let Some(&last_hash) = processed_hashes.get(&path) {
                                    if last_hash == file_hash {
                                        // Skip duplicate modification event
                                        continue;
                                    }
                                }
                                processed_hashes.insert(path.clone(), file_hash);

                                println!("Yeni OMR dosyası tespit edildi: {:?}", path);
                                log_sync_event(&db_path, "FILE_DETECTED", &format!("{:?}", path));

                                if let Some(omr_list) = parse_omr_file(&path) {
                                    for omr in omr_list {
                                        let payload = json!({
                                            "studentId": omr.student_id,
                                            "examId": omr.exam_id,
                                            "examType": omr.exam_type,
                                            "answerString": omr.answer_string,
                                            "rawText": omr.raw_text
                                        });
                                        // Offline cache'e de yaz (güvenlik)
                                        if let Ok(id) = save_to_offline_cache(&db_path, &payload) {
                                            let _ = batch_tx.send((id, payload));
                                        }
                                    }
                                    log_sync_event(&db_path, "FILE_PARSED", &format!("Dosya: {:?}", path.file_name()));
                                } else {
                                    log_sync_event(&db_path, "PARSE_ERROR", &format!("Dosya ayrıştırılamadı: {:?}", path));
                                }
                            }
                        }
                    }
                },
                _ => {}
            }
        }
        println!("İzleme sonlandırıldı: {:?}", watch_path);
    });

    Some(watcher)
}

// ── Batch Worker ──

fn start_batch_worker(
    rx: Receiver<(i64, serde_json::Value)>,
    state_api_endpoint: std::sync::Arc<Mutex<String>>,
    state_api_token: std::sync::Arc<Mutex<String>>,
    state_sync_status: std::sync::Arc<Mutex<SyncStatus>>,
    db_path_arc: std::sync::Arc<Mutex<String>>,
    app_handle: tauri::AppHandle,
) {
    std::thread::spawn(move || {
        let mut batch = Vec::new();
        let client = reqwest::blocking::Client::new();

        loop {
            match rx.recv_timeout(Duration::from_secs(5)) {
                Ok(payload) => {
                    batch.push(payload);
                    if batch.len() >= 100 {
                        let endpoint = state_api_endpoint.lock().unwrap().clone();
                        let token = state_api_token.lock().unwrap().clone();
                        let db_path = db_path_arc.lock().unwrap().clone();
                        flush_batch(&mut batch, &client, &endpoint, &token, &state_sync_status, &db_path, &app_handle);
                    }
                },
                Err(RecvTimeoutError::Timeout) => {
                    if !batch.is_empty() {
                        let endpoint = state_api_endpoint.lock().unwrap().clone();
                        let token = state_api_token.lock().unwrap().clone();
                        let db_path = db_path_arc.lock().unwrap().clone();
                        flush_batch(&mut batch, &client, &endpoint, &token, &state_sync_status, &db_path, &app_handle);
                    }
                    // Ayrıca offline kuyruktaki bekleyen öğeleri tekrar dene
                    {
                        let endpoint = state_api_endpoint.lock().unwrap().clone();
                        let token = state_api_token.lock().unwrap().clone();
                        let db_path = db_path_arc.lock().unwrap().clone();
                        if !endpoint.is_empty() {
                            retry_offline_queue(&db_path, &client, &endpoint, &token);
                        }
                    }
                },
                Err(RecvTimeoutError::Disconnected) => break,
            }
        }
    });
}

fn flush_batch(
    batch: &mut Vec<(i64, serde_json::Value)>,
    client: &reqwest::blocking::Client,
    base_endpoint: &str,
    token: &str,
    sync_status: &std::sync::Arc<Mutex<SyncStatus>>,
    db_path: &str,
    app_handle: &tauri::AppHandle,
) {
    let endpoint = if base_endpoint.is_empty() {
        "https://aydim.com".to_string()
    } else {
        base_endpoint.to_string()
    };
    let url = format!("{}/api/omr/ingest", endpoint);

    // Her bir OMR kaydını ayrı ayrı gönder (sunucu tek kayıt beklediği için)
    let mut synced = 0;
    let mut failed = 0;
    let mut synced_ids = Vec::new();
    let mut failed_ids = Vec::new();
    let mut retry_ids = Vec::new();

    for (id, payload) in batch.iter() {
        let mut request = client.post(&url).json(payload);
        if !token.is_empty() {
            request = request.header("Authorization", format!("Bearer {}", token));
        }

        match request.send() {
            Ok(response) => {
                let status = response.status();
                if status.is_success() {
                    synced += 1;
                    synced_ids.push(*id);
                } else if status.is_client_error() {
                    let code = status.as_u16();
                    if code == 401 || code == 403 || code == 429 {
                        failed += 1;
                        retry_ids.push(*id);
                    } else {
                        failed += 1;
                        failed_ids.push(*id);
                    }
                } else {
                    failed += 1;
                    retry_ids.push(*id);
                }
            },
            _ => {
                failed += 1;
                retry_ids.push(*id);
            }
        }
    }

    if !synced_ids.is_empty() {
        let _ = mark_synced(db_path, &synced_ids);
    }
    if !failed_ids.is_empty() {
        let _ = mark_failed(db_path, &failed_ids);
    }
    if !retry_ids.is_empty() {
        let _ = increment_retries(db_path, &retry_ids);
    }

    // Status güncelle
    {
        let mut status = sync_status.lock().unwrap();
        status.total_synced += synced;
        status.total_failed += failed;
        status.last_sync = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        status.is_online = synced > 0;

        // Event emit et
        let _ = app_handle.emit("sync-status-update", status.clone());
    }

    log_sync_event(db_path, "BATCH_FLUSH", &format!("{} başarılı, {} başarısız (toplam {})", synced, failed, batch.len()));
    println!("Batch flush: {} synced, {} failed out of {}", synced, failed, batch.len());

    batch.clear();
}

fn retry_offline_queue(db_path: &str, client: &reqwest::blocking::Client, base_endpoint: &str, token: &str) {
    let pending = match get_pending_from_cache(db_path) {
        Ok(p) => p,
        Err(_) => return,
    };

    if pending.is_empty() { return; }

    let url = format!("{}/api/omr/ingest", base_endpoint);
    let mut synced_ids = Vec::new();
    let mut failed_ids = Vec::new();
    let mut retry_ids = Vec::new();

    for (id, payload) in pending.iter() {
        let mut request = client.post(&url).json(payload);
        if !token.is_empty() {
            request = request.header("Authorization", format!("Bearer {}", token));
        }
        match request.send() {
            Ok(response) => {
                let status = response.status();
                if status.is_success() {
                    synced_ids.push(*id);
                } else if status.is_client_error() {
                    let code = status.as_u16();
                    if code == 401 || code == 403 || code == 429 {
                        retry_ids.push(*id);
                        break;
                    } else {
                        // 4xx error (hariç 401, 403, 429): Kalıcı hata (geçersiz ID vb.), kuyruğu tıkamaması için atla ve işaretle
                        failed_ids.push(*id);
                        log_sync_event(db_path, "PERMANENT_ERROR", &format!("Kayıt ID {}: {} - Hatalı Optik İptal Edildi", id, status));
                    }
                } else {
                    // 5xx error: Sunucu hatası, ağ kopması gibi davran
                    retry_ids.push(*id);
                    break;
                }
            },
            Err(_) => {
                retry_ids.push(*id);
                break; // Network down, stop retrying
            }
        }
    }

    if !synced_ids.is_empty() {
        let _ = mark_synced(db_path, &synced_ids);
        log_sync_event(db_path, "RETRY_SUCCESS", &format!("{} kayıt senkronize edildi", synced_ids.len()));
    }
    if !failed_ids.is_empty() {
        let _ = mark_failed(db_path, &failed_ids);
    }
    if !retry_ids.is_empty() {
        let _ = increment_retries(db_path, &retry_ids);
    }
}

// ── Main ──

fn main() {
    // Load .env file at startup
    dotenvy::dotenv().ok();

    let (tx, rx) = channel::<(i64, serde_json::Value)>();

    // SQLite veritabanı yolunu belirle
    let db_dir = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("yks-omr-sync");
    std::fs::create_dir_all(&db_dir).ok();
    let db_path = db_dir.join("omr_cache.db").to_string_lossy().to_string();

    // SQLite'ı başlat
    init_sqlite(&db_path).expect("SQLite başlatılamadı");

    // Prune old synced items
    prune_sync_data(&db_path);

    // Kayıtlı ayarları yükle
    let saved_endpoint = load_config(&db_path, "api_endpoint").unwrap_or(None).unwrap_or_default();
    let saved_token = load_config(&db_path, "api_token").unwrap_or(None).unwrap_or_default();
    let saved_watch = load_config(&db_path, "watch_path").unwrap_or(None).unwrap_or_default();

    // Shared state Arc'ları (batch worker thread'i için)
    let api_endpoint_arc = std::sync::Arc::new(Mutex::new(saved_endpoint.clone()));
    let api_token_arc = std::sync::Arc::new(Mutex::new(saved_token.clone()));
    let sync_status_arc = std::sync::Arc::new(Mutex::new(SyncStatus {
        total_queued: 0,
        total_synced: 0,
        total_failed: 0,
        last_sync: String::new(),
        is_online: false,
    }));
    let db_path_arc = std::sync::Arc::new(Mutex::new(db_path.clone()));

    // setup closure'u move olduğu için api_endpoint_arc ve api_token_arc'ı setup için önceden klonla
    let api_endpoint_for_setup = api_endpoint_arc.clone();
    let api_token_for_setup = api_token_arc.clone();

    // setup closure'u move olduğu için manage'e gidecek değerleri önceden klonla
    let tx_for_manage = tx.clone();
    let saved_watch_for_manage = saved_watch.clone();
    let db_path_for_manage = db_path.clone();
    let sync_status_for_manage = sync_status_arc.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(move |app| {
            // Batch worker'ı başlat
            start_batch_worker(
                rx,
                api_endpoint_for_setup,
                api_token_for_setup,
                sync_status_arc.clone(),
                db_path_arc.clone(),
                app.handle().clone(),
            );

            // Kayıtlı watch path varsa otomatik izlemeyi başlat
            if !saved_watch.is_empty() {
                let sender = tx.clone();
                let db_path_clone = db_path.clone();
                let watcher = start_folder_watcher(saved_watch.clone(), sender, db_path_clone);
                
                // Save in state
                let state = app.state::<AppState>();
                let mut active = state.active_watcher.lock().unwrap();
                *active = watcher;
            }

            Ok(())
        })
        .manage(AppState {
            watch_path: Mutex::new(saved_watch_for_manage),
            api_endpoint: api_endpoint_arc.clone(),
            api_token: api_token_arc.clone(),
            omr_sender: Mutex::new(tx_for_manage),
            sync_status: sync_status_for_manage,
            db_path: Mutex::new(db_path_for_manage),
            active_watcher: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            get_watch_directory,
            update_watch_directory,
            get_config,
            update_config,
            get_sync_status,
            get_sync_logs,
            get_offline_queue_count,
            force_sync,
            api_request
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
