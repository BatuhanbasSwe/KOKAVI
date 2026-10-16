/**
 * Ses efektleri: sessiz mod ve "hareketi azalt" ayarlarına UYAR.
 * (Başvuru: "sessiz mod: ses olmadan da akışın tamamı bitirilebilir".)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let olusturulan = 0;
class SahteSes {
  state = 'running';
  currentTime = 0;
  destination = {};
  constructor() {
    olusturulan++;
  }
  resume() {
    return Promise.resolve();
  }
  createOscillator() {
    return {
      type: '',
      frequency: { setValueAtTime: vi.fn() },
      connect: (x: unknown) => x,
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  createGain() {
    const g = {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: (x: unknown) => x,
    };
    return g;
  }
}

describe('efekt', () => {
  const titret = vi.fn();
  beforeEach(() => {
    olusturulan = 0;
    vi.resetModules();
    vi.stubGlobal('AudioContext', SahteSes);
    Object.defineProperty(window, 'AudioContext', { value: SahteSes, configurable: true });
    Object.defineProperty(navigator, 'vibrate', { value: titret, configurable: true });
    titret.mockClear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sessiz modda ses de titreşim de yok', async () => {
    const { efekt } = await import('../src/app/efekt');
    efekt('dogru', { sessizMod: true, hareketAzalt: false });
    expect(olusturulan).toBe(0);
    expect(titret).not.toHaveBeenCalled();
  });

  it('normalde doğru cevapta ses ve kısa titreşim', async () => {
    const { efekt } = await import('../src/app/efekt');
    efekt('dogru', { sessizMod: false, hareketAzalt: false });
    expect(olusturulan).toBe(1);
    expect(titret).toHaveBeenCalledWith(30);
  });

  it('"hareketi azalt" titreşimi kapatır, sesi kapatmaz', async () => {
    const { efekt } = await import('../src/app/efekt');
    efekt('kutlama', { sessizMod: false, hareketAzalt: true });
    expect(olusturulan).toBe(1);
    expect(titret).not.toHaveBeenCalled();
  });

  it('yanlış cevap (ipucu) titreştirmez — ceza hissi yok', async () => {
    const { efekt } = await import('../src/app/efekt');
    efekt('ipucu', { sessizMod: false, hareketAzalt: false });
    expect(titret).not.toHaveBeenCalled();
  });

  it('ses desteği olmayan ortamda çökmez', async () => {
    Object.defineProperty(window, 'AudioContext', { value: undefined, configurable: true });
    vi.stubGlobal('AudioContext', undefined);
    const { efekt } = await import('../src/app/efekt');
    expect(() => efekt('kombo', { sessizMod: false, hareketAzalt: false })).not.toThrow();
  });
});
