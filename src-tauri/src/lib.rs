use std::io::{Read, Write};
use std::net::TcpListener;
use tauri::command;
use url::Url;

// 1️⃣ Command: Liefere freien Port/Adresse
#[tauri::command]
fn get_free_local_address() -> String {
    let listener = TcpListener::bind("127.0.0.1:0").expect("Failed to bind");
    let addr = listener.local_addr().unwrap();
    // Wir schließen den Listener sofort, um den Port frei zu machen
    drop(listener);
    format!("127.0.0.1:{}", addr.port())
}

// 2️⃣ Command: Starte Server auf gegebener Adresse
#[command]
async fn start_oauth_server(address: String) -> Option<String> {
    println!("[DEBUG] Trying to bind to {}", &address);

    // Hier kein Thread mehr nötig, weil die Funktion async ist
    // Wir blocken innerhalb von spawn_blocking, damit UI-Thread nicht einfriert
    tauri::async_runtime::spawn_blocking(move || {
        let listener = TcpListener::bind(&address).expect("Failed to bind to given address");
        println!("[DEBUG] OAuth2 server listening on http://{}", address);

        for stream_result in listener.incoming() {
            match stream_result {
                Ok(mut stream) => {
                    println!("[DEBUG] Accepted a connection from {:?}", stream.peer_addr());

                    let mut buffer = [0; 2048];
                    match stream.read(&mut buffer) {
                        Ok(n) => {
                            println!("[DEBUG] Read {} bytes from stream", n);
                            let request = String::from_utf8_lossy(&buffer[..n]);
                            println!("[DEBUG] Request:\n{}", request);

                            if let Some(first_line) = request.lines().next() {
                                println!("[DEBUG] First line: {}", first_line);
                                if first_line.starts_with("GET") {
                                    if let Some(pos) = first_line.find("HTTP/") {
                                        let path = &first_line[4..pos].trim();
                                        println!("[DEBUG] Extracted path: {}", path);

                                        let base = "http://127.0.0.1";
                                        if let Ok(url) = Url::parse(&format!("{}{}", base, path)) {
                                            if let Some(code_pair) = url.query_pairs().find(|(k, _)| k == "code") {
                                                let code = code_pair.1.to_string();
                                                println!("[DEBUG] OAuth2 code received: {}", code);

                                                // Browser-Antwort
                                                let response_body = r#"
                                                <html>
                                                    <body>
                                                        <p>You can close this tab now.</p>
                                                        <script>window.close();</script>
                                                    </body>
                                                </html>
                                                "#;
                                                let response = format!(
                                                    "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Length: {}\r\n\r\n{}",
                                                    response_body.len(),
                                                    response_body
                                                );
                                                let _ = stream.write_all(response.as_bytes());
                                                let _ = stream.flush();

                                                println!("[DEBUG] Closing server after receiving code");
                                                return Some(code);
                                            }
                                        } else {
                                            println!("[ERROR] Failed to parse URL from path: {}", path);
                                        }
                                    }
                                }
                            }
                        }
                        Err(e) => println!("[ERROR] Failed to read from stream: {:?}", e),
                    }
                }
                Err(e) => println!("[ERROR] Failed to accept connection: {:?}", e),
            }
        }

        println!("[DEBUG] OAuth2 server loop ended without code");
        None
    })
    .await
    .unwrap_or(None)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_os::init());

    #[cfg(mobile)]
    {
        builder = builder
            .plugin(tauri_plugin_biometric::init())
            .plugin(tauri_plugin_keystore::init());
    }

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|_app, argv, _cwd| {
            println!("a new app instance was opened with {argv:?} and the deep link event was already triggered");
            // when defining deep link schemes at runtime, you must also check `argv` here
        }));
    }

    builder
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_free_local_address,
            start_oauth_server
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
