/**
 * Sesli anlatım (TTS) — başvuru PDF'i: "Sesli anlatım: her ders Türkçe TTS ile
 * dinlenebilir."
 *
 * Tarayıcının yerleşik Web Speech API'si kullanılır: sunucu yok, maliyet yok,
 * kişisel veri yok. Türkçe ses cihazda yoksa düğme hiç gösterilmez (ses
 * olmadan da akışın tamamı bitirilebilir — PDF'in "sessiz mod" taahhüdü).
 * Sonraki adım: toplu üretilmiş ses dosyaları (PDF'teki içerik hattı).
 */

export function sesDestekleniyor(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

function turkceSes(): SpeechSynthesisVoice | null {
  try {
    const sesler = window.speechSynthesis.getVoices();
    return (
      sesler.find((s) => s.lang?.toLowerCase().startsWith('tr') && /neural|natural|online/i.test(s.name)) ??
      sesler.find((s) => s.lang?.toLowerCase().startsWith('tr')) ??
      null
    );
  } catch {
    return null;
  }
}

/**
 * Metni Türkçe seslendirir. Önceki konuşmayı keser.
 * `bitince` konuşma bitince veya kesilince çağrılır.
 */
export function seslendir(metin: string, bitince?: () => void): boolean {
  if (!sesDestekleniyor() || !metin.trim()) return false;
  try {
    window.speechSynthesis.cancel();
    const soz = new SpeechSynthesisUtterance(metin);
    soz.lang = 'tr-TR';
    const ses = turkceSes();
    if (ses) soz.voice = ses;
    soz.rate = 0.92; // çocuk için biraz yavaş
    soz.onend = () => bitince?.();
    soz.onerror = () => bitince?.();
    window.speechSynthesis.speak(soz);
    return true;
  } catch {
    return false;
  }
}

export function sesiDurdur(): void {
  if (!sesDestekleniyor()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* yok say */
  }
}
