use serde::Serialize;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream, UdpSocket};
use std::thread;
use tauri::Emitter;
use std::time::{Duration, Instant};

#[derive(Serialize)]
struct Peer { id: String, name: String, ip: String }

#[tauri::command]
fn discover_peers(device_id: String, device_name: String, timeout_ms: u64) -> Result<Vec<Peer>, String> {
    let socket = UdpSocket::bind("0.0.0.0:41234").map_err(|e| e.to_string())?;
    socket.set_broadcast(true).ok();
    socket.set_read_timeout(Some(Duration::from_millis(200))).ok();
    let hello = format!("ZRI_HELLO|{}|{}", device_id, device_name);
    let start = Instant::now();
    let mut peers: Vec<Peer> = Vec::new();
    let mut last_send = Instant::now() - Duration::from_secs(1);
    while start.elapsed() < Duration::from_millis(timeout_ms) {
        if last_send.elapsed() >= Duration::from_millis(500) {
            let _ = socket.send_to(hello.as_bytes(), "255.255.255.255:41234");
            last_send = Instant::now();
        }
        let mut buf = [0u8; 1024];
        if let Ok((n, addr)) = socket.recv_from(&mut buf) {
            let msg = String::from_utf8_lossy(&buf[..n]);
            if msg.starts_with("ZRI_HELLO|") {
                let parts: Vec<&str> = msg.split('|').collect();
                if parts.len() >= 3 && parts[1] != device_id {
                    peers.push(Peer { id: parts[1].to_string(), name: parts[2].to_string(), ip: addr.ip().to_string() });
                }
            }
        }
    }
    peers.sort_by(|a, b| a.id.cmp(&b.id));
    peers.dedup_by(|a, b| a.id == b.id);
    Ok(peers)
}

#[tauri::command]
fn send_tcp_message(ip: String, port: u16, payload: String) -> Result<(), String> {
    let mut stream = TcpStream::connect((ip.as_str(), port)).map_err(|e| e.to_string())?;
    stream.write_all(payload.as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn start_tcp_listener(app: tauri::AppHandle, port: u16) -> Result<(), String> {
    thread::spawn(move || {
        if let Ok(listener) = TcpListener::bind(("0.0.0.0", port)) {
            for stream in listener.incoming() {
                if let Ok(mut s) = stream {
                    let mut buf = vec![0u8; 8192];
                    loop {
                        match s.read(&mut buf) {
                            Ok(0) => break, // EOF - connection closed
                            Ok(n) => {
                                let msg = String::from_utf8_lossy(&buf[..n]).to_string();
                                let _ = app.emit("tcp-message", msg);
                            }
                            Err(_) => break, // Error - close connection
                        }
                    }
                }
            }
        }
    });
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![discover_peers, send_tcp_message, start_tcp_listener])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
