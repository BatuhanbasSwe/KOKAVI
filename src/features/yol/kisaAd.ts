/** "Yeşil Medrese (Sultaniye Medresesi; bugün …)" → "Yeşil Medrese" */
export function kisaAd(eserAdi: string): string {
  const kesik = eserAdi.split(' (')[0]?.trim();
  return kesik && kesik.length > 0 ? kesik : eserAdi;
}
