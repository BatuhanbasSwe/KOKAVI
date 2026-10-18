/**
 * Gemini sağlayıcısı: anahtara göre model seçimi, çıktı çözümü (engellenen,
 * yarım ya da şemaya uymayan çıktı "bilmiyorum"a düşer) ve Gemini'ye giden
 * JSON şeması. Gerçek API çağrılmaz.
 */
import { describe, expect, it } from 'vitest';
import { saglayiciSec } from '../server/sor/saglayici';
import { geminiCiktisiniCoz, geminiSemasi } from '../server/sor/gemini';

const BILMIYORUM = { bilmiyorum: true, cumleler: [] };

describe('sağlayıcı seçimi', () => {
  it('Gemini anahtarı önceliklidir; yoksa Claude; ikisi de yoksa kapalı', () => {
    expect(saglayiciSec({ GEMINI_API_KEY: 'g', ANTHROPIC_API_KEY: 'a' })).toBe('gemini');
    expect(saglayiciSec({ ANTHROPIC_API_KEY: 'a' })).toBe('claude');
    expect(saglayiciSec({ GEMINI_API_KEY: '' })).toBeNull();
    expect(saglayiciSec({})).toBeNull();
  });
});

describe('Gemini çıktısı', () => {
  const iyi = { bilmiyorum: false, cumleler: [{ metin: 'Çatısında yirmi kubbe var.', kaynaklar: [1] }] };

  it('şemaya uyan JSON aynen döner', () => {
    expect(geminiCiktisiniCoz(JSON.stringify(iyi), 'STOP')).toEqual(iyi);
  });

  it('güvenlik engeli ya da yarım kalan çıktı bilmiyorum sayılır', () => {
    expect(geminiCiktisiniCoz(JSON.stringify(iyi), 'SAFETY')).toEqual(BILMIYORUM);
    expect(geminiCiktisiniCoz('{"bilmiyorum":false,"cum', 'MAX_TOKENS')).toEqual(BILMIYORUM);
  });

  it('boş, bozuk ya da şemaya uymayan çıktı bilmiyorum sayılır', () => {
    expect(geminiCiktisiniCoz(undefined, 'STOP')).toEqual(BILMIYORUM);
    expect(geminiCiktisiniCoz('kubbe yirmi', 'STOP')).toEqual(BILMIYORUM);
    expect(geminiCiktisiniCoz('{"cevap":"yirmi"}', 'STOP')).toEqual(BILMIYORUM);
    expect(geminiCiktisiniCoz('{"bilmiyorum":false,"cumleler":[{"metin":"x","kaynaklar":["1"]}]}', 'STOP')).toEqual(BILMIYORUM);
  });

  it('JSON şeması: $schema yok, iki alan zorunlu', () => {
    const sema = geminiSemasi();
    expect(sema.$schema).toBeUndefined();
    expect(sema.type).toBe('object');
    expect(sema.required).toEqual(['bilmiyorum', 'cumleler']);
  });
});
