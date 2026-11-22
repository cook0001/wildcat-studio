use std::io::Write;
use std::process::Command;
use std::sync::atomic::{AtomicU64, Ordering};

static TEMP_FILE_SEQ: AtomicU64 = AtomicU64::new(0);

fn next_temp_file_path(prefix: &str, ext: &str) -> std::path::PathBuf {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let seq = TEMP_FILE_SEQ.fetch_add(1, Ordering::Relaxed);
    let pid = std::process::id();
    std::env::temp_dir().join(format!("{prefix}_{timestamp}_{pid}_{seq}.{ext}"))
}

fn sanitize_filename_stem(title: &str) -> String {
    title
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '_' || c == '-' { c } else { '_' })
        .collect()
}

fn open_with_system_viewer(file_path: &std::path::Path, context_label: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(file_path)
            .spawn()
            .map_err(|e| format!("Failed to launch {context_label}: {e}"))?;
    }

    #[cfg(target_os = "windows")]
    {
        let path_str = file_path.to_string_lossy().to_string();
        Command::new("cmd")
            .args(["/C", "start", "", &path_str])
            .spawn()
            .map_err(|e| format!("Failed to launch {context_label}: {e}"))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(file_path)
            .spawn()
            .map_err(|e| format!("Failed to launch {context_label}: {e}"))?;
    }

    Ok(())
}

fn find_typst_binary() -> Option<std::path::PathBuf> {
    if let Ok(path) = which::which("typst") {
        return Some(path);
    }
    // GUI apps launched from Finder on macOS do not inherit Homebrew PATH entries.
    for candidate in ["/opt/homebrew/bin/typst", "/usr/local/bin/typst"] {
        let p = std::path::Path::new(candidate);
        if p.is_file() {
            return Some(p.to_path_buf());
        }
    }
    None
}

#[tauri::command]
fn check_typst_available() -> bool {
    find_typst_binary().is_some()
}

#[tauri::command]
fn compile_typst_pdf(typst_source: String) -> Result<Vec<u8>, String> {
    let typst_bin = find_typst_binary()
        .ok_or_else(|| "Typst binary not found on PATH or standard Homebrew locations".to_string())?;

    let mut child = Command::new(&typst_bin)
        .args(["compile", "-", "-"])
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn typst binary: {e}"))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(typst_source.as_bytes())
            .map_err(|e| format!("Failed to write to typst stdin: {e}"))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("Typst execution failed: {e}"))?;

    if output.status.success() {
        Ok(output.stdout)
    } else {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        Err(format!("Typst compilation error: {err_msg}"))
    }
}

#[tauri::command]
fn trigger_system_print(html_content: String, _title: String) -> Result<String, String> {
    let file_path = next_temp_file_path("wildcat_print", "html");

    let final_html = if html_content.contains("window.print()") {
        html_content
    } else {
        format!(
            "{html_content}\n<script>window.addEventListener('load', function() {{ setTimeout(function() {{ window.focus(); window.print(); }}, 350); }});</script>"
        )
    };

    std::fs::write(&file_path, final_html)
        .map_err(|e| format!("Failed to write temporary print file: {e}"))?;

    open_with_system_viewer(&file_path, "system print viewer")?;
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn trigger_system_pdf_print(pdf_data: Vec<u8>, title: String) -> Result<String, String> {
    let clean_title = sanitize_filename_stem(&title);
    let prefix = format!("wildcat_{clean_title}");
    let file_path = next_temp_file_path(&prefix, "pdf");

    std::fs::write(&file_path, pdf_data)
        .map_err(|e| format!("Failed to write temporary PDF: {e}"))?;

    open_with_system_viewer(&file_path, "PDF viewer")?;
    Ok(file_path.to_string_lossy().to_string())
}

#[cfg(target_os = "macos")]
use tauri::{Emitter, Manager};

#[derive(Clone, serde::Serialize)]
pub struct OpenedFilePayload {
    pub name: String,
    pub path: String,
    pub content: String,
}

pub struct PendingOpenFile(pub std::sync::Mutex<Option<OpenedFilePayload>>);

#[tauri::command]
fn get_pending_open_file(state: tauri::State<'_, PendingOpenFile>) -> Option<OpenedFilePayload> {
    let mut lock = state.0.lock().ok()?;
    lock.take()
}

#[tauri::command]
fn restart_app(app: tauri::AppHandle) {
    app.request_restart();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_file = std::env::args().nth(1).and_then(|arg| {
        let p = std::path::Path::new(&arg);
        if p.is_file() {
            let name = p
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("Cartridge File")
                .to_string();
            std::fs::read_to_string(p)
                .ok()
                .map(|content| OpenedFilePayload {
                    name,
                    path: arg,
                    content,
                })
        } else {
            None
        }
    });

    let pending_state = PendingOpenFile(std::sync::Mutex::new(initial_file));

    let app = tauri::Builder::default()
        .manage(pending_state)
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            check_typst_available,
            compile_typst_pdf,
            trigger_system_print,
            trigger_system_pdf_print,
            get_pending_open_file,
            restart_app
        ])
        .build(tauri::generate_context!())
        .expect("error while building Wildcat Studio");

    app.run(|_app_handle, _event| {
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Opened { ref urls } = _event {
            for url in urls {
                if let Ok(file_path) = url.to_file_path() {
                    let path_str = file_path.to_string_lossy().to_string();
                    let name = file_path
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("Cartridge File")
                        .to_string();
                    if let Ok(content) = std::fs::read_to_string(&file_path) {
                        let payload = OpenedFilePayload {
                            name,
                            path: path_str,
                            content,
                        };
                        if let Some(state) = _app_handle.try_state::<PendingOpenFile>() {
                            if let Ok(mut lock) = state.0.lock() {
                                *lock = Some(payload.clone());
                            }
                        }
                        let _ = _app_handle.emit("wildcat://open-file", &payload);
                    }
                }
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_temp_file_paths_are_unique_and_have_extension() {
        let p1 = next_temp_file_path("wildcat_test", "pdf");
        let p2 = next_temp_file_path("wildcat_test", "pdf");
        assert_ne!(p1, p2);
        assert_eq!(p1.extension().and_then(|e| e.to_str()), Some("pdf"));
    }

    #[test]
    fn test_sanitize_filename_stem_strips_path_separators() {
        assert_eq!(sanitize_filename_stem(".308 Win / 7.62 NATO"), "_308_Win___7_62_NATO");
        assert_eq!(sanitize_filename_stem("6.5_CM-Reamer"), "6_5_CM-Reamer");
    }
}
