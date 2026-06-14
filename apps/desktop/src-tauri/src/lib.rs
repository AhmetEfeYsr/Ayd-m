// Tauri v2 lib.rs — Mobile entry point
// Desktop uygulaması main.rs üzerinden çalışır.
// Bu dosya yalnızca mobile target için gereklidir.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Mobile build için main.rs ile aynı konfigürasyon kullanılmalıdır.
    // Şu anda bu platform desteklenmiyor.
    panic!("Mobile platform henüz desteklenmiyor. Desktop için main.rs kullanınız.");
}
