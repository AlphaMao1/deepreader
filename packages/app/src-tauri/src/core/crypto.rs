use aes_gcm::aead::{rand_core::RngCore, Aead, OsRng};
use aes_gcm::{Aes256Gcm, Key, KeyInit, Nonce};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use std::fs;
use tauri::{AppHandle, Manager};

const DEVICE_KEY_FILE: &str = "device.key";

#[derive(Debug, Serialize, Deserialize)]
struct EncryptedPayload {
    version: u8,
    nonce: String,
    ciphertext: String,
}

#[tauri::command]
pub async fn encrypt_secret_payload(app_handle: AppHandle, plaintext: String) -> Result<String, String> {
    let key = get_or_create_device_key(&app_handle)?;
    encrypt_with_key(&key, plaintext.as_bytes())
}

#[tauri::command]
pub async fn decrypt_secret_payload(app_handle: AppHandle, payload: String) -> Result<String, String> {
    let key = get_or_create_device_key(&app_handle)?;
    let bytes = decrypt_with_key(&key, &payload)?;
    String::from_utf8(bytes).map_err(|e| format!("解密结果不是有效 UTF-8: {}", e))
}

fn get_or_create_device_key(app_handle: &AppHandle) -> Result<[u8; 32], String> {
    let config_dir = app_handle
        .path()
        .app_config_dir()
        .map_err(|e| format!("获取配置目录失败: {}", e))?;
    fs::create_dir_all(&config_dir).map_err(|e| format!("创建设备密钥目录失败: {}", e))?;

    let key_path = config_dir.join(DEVICE_KEY_FILE);
    if key_path.exists() {
        let encoded = fs::read_to_string(&key_path).map_err(|e| format!("读取设备密钥失败: {}", e))?;
        let bytes = STANDARD
            .decode(encoded.trim())
            .map_err(|e| format!("解析设备密钥失败: {}", e))?;
        return bytes
            .try_into()
            .map_err(|_| "设备密钥长度无效".to_string());
    }

    let mut key = [0u8; 32];
    OsRng.fill_bytes(&mut key);
    fs::write(&key_path, STANDARD.encode(key)).map_err(|e| format!("写入设备密钥失败: {}", e))?;
    Ok(key)
}

fn encrypt_with_key(key: &[u8; 32], plaintext: &[u8]) -> Result<String, String> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let ciphertext = cipher
        .encrypt(Nonce::from_slice(&nonce_bytes), plaintext)
        .map_err(|e| format!("加密失败: {}", e))?;

    serde_json::to_string(&EncryptedPayload {
        version: 1,
        nonce: STANDARD.encode(nonce_bytes),
        ciphertext: STANDARD.encode(ciphertext),
    })
    .map_err(|e| format!("序列化加密结果失败: {}", e))
}

fn decrypt_with_key(key: &[u8; 32], payload: &str) -> Result<Vec<u8>, String> {
    let payload: EncryptedPayload =
        serde_json::from_str(payload).map_err(|e| format!("解析加密载荷失败: {}", e))?;
    if payload.version != 1 {
        return Err(format!("不支持的加密版本: {}", payload.version));
    }

    let nonce = STANDARD
        .decode(payload.nonce)
        .map_err(|e| format!("解析 nonce 失败: {}", e))?;
    if nonce.len() != 12 {
        return Err(format!("nonce 长度无效: {}", nonce.len()));
    }
    let ciphertext = STANDARD
        .decode(payload.ciphertext)
        .map_err(|e| format!("解析密文失败: {}", e))?;
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    cipher
        .decrypt(Nonce::from_slice(&nonce), ciphertext.as_ref())
        .map_err(|_| "解密失败，请确认设备密钥或恢复密钥是否正确".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encrypt_then_decrypt_round_trips() {
        let key = [7u8; 32];
        let payload = encrypt_with_key(&key, b"secret").expect("encrypt");
        let plaintext = decrypt_with_key(&key, &payload).expect("decrypt");

        assert_eq!(plaintext, b"secret");
        assert!(!payload.contains("secret"));
    }

    #[test]
    fn malformed_nonce_returns_error_instead_of_panicking() {
        let key = [7u8; 32];
        let payload = serde_json::to_string(&EncryptedPayload {
            version: 1,
            nonce: STANDARD.encode([1u8; 8]),
            ciphertext: STANDARD.encode([2u8; 16]),
        })
        .expect("serialize payload");

        let error = decrypt_with_key(&key, &payload).expect_err("invalid nonce should fail");
        assert!(error.contains("nonce 长度无效"));
    }
}
