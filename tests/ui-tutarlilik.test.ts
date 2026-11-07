/**
 * UI TUTARLILIK — statik regresyon denetimi (DESIGN.md + docs/UI-DEVIR.md).
 *
 * Neden statik: jsdom yerleşim ölçmez (bkz. docs/ERISILEBILIRLIK.md), tarayıcı
 * provası finalde manuel yapılır. Bu dosya tasarım sözleşmesinin KAYNAK
 * düzeyinde bozulmasını engeller; davranış testleri ayrı dosyalardadır.
 *
 * Kapsam (her biri DESIGN.md'deki somut bir kurala bağlı):
 *  1) Ham renk yasağı — src altındaki tüm CSS dosyalarında (tokens.css hariç)
 *     hex/rgb/hsl yok (DESIGN §2/§8, CLAUDE.md §6.4).
 *  2) `div`/`span`/`li` üzerinde `onClick` yasağı — tıklanan her şey `<button>`
 *     ya da `<a>` olmalı (SC 2.1.1, CLAUDE.md §6.3). Meşru istisna aşağıda.
 *  3) Jeton bütünlüğü — kullanılan `var(--x)` ya tokens.css'te ya aynı dosyada
 *     tanımlı olmalı; yazım hatası sessizce düşen bir stile dönüşmesin.
 *  4) 320px yatay taşma — sabit `minmax(300px, ...)` gibi minimumlar
 *     `min(100%, ...)` ile korunmalı (mobil içerik alanı 320 - 2rem = 288px).
 *  5) Büyük harfli etiket yasağı — `text-transform: uppercase` yok
 *     (DESIGN §3: "büyük harfli küçük etiket kullanılmaz").
 *  6) Bileşen sözleşmesi — `.dugme`, `.dugme--kucuk`, `.secenek` dokunma
 *     hedefi >= 44px ve global `:focus-visible` halkası yerinde.
 *
 * Hız: yalnızca dosya okuma; < 1 sn.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const TOKENS = join(KOK, 'styles', 'tokens.css');

function dosyalar(d: string, uzanti: string): string[] {
  return readdirSync(d).flatMap((ad) => {
    const yol = join(d, ad);
    return statSync(yol).isDirectory() ? dosyalar(yol, uzanti) : yol.endsWith(uzanti) ? [yol] : [];
  });
}

const CSS_DOSYALARI = dosyalar(KOK, '.css');
const TSX_DOSYALARI = dosyalar(KOK, '.tsx');

/** CSS yorumlarını ayıklar: kural metni denetlenir, açıklamalar değil. */
function yorumsuzCss(metin: string): string {
  return metin.replace(/\/\*[\s\S]*?\*\//g, '');
}

function kisa(ful: string): string {
  return ful.slice(KOK.length + 1).replace(/\\/g, '/');
}

// ---------------------------------------------------------------------------
// 1) Ham renk yasağı
// ---------------------------------------------------------------------------
describe('ham renk yok (DESIGN §2/§8)', () => {
  it('tokens.css dışındaki hiçbir CSS dosyasında hex/rgb/hsl renk geçmez', () => {
    const bulunan: string[] = [];
    for (const dosya of CSS_DOSYALARI) {
      if (dosya === TOKENS) continue;
      const satirlar = yorumsuzCss(readFileSync(dosya, 'utf8')).split('\n');
      satirlar.forEach((satir, i) => {
        // #rgb, #rrggbb, #rrggbbaa; rgb()/rgba()/hsl()/hsla()
        if (/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/.test(satir)) {
          bulunan.push(`${kisa(dosya)}:${i + 1}: ${satir.trim()}`);
        }
      });
    }
    expect(bulunan, 'Ham renk bulundu; jeton (var(--...)) kullanın').toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 2) div/span/li üzerinde onClick yasağı
// ---------------------------------------------------------------------------

/**
 * MEŞRU İSTİSNA — gerekçesiyle birlikte:
 * - `features/panel/OnayDiyalogu.tsx`: onay diyaloğunun arka perdesi. Perdeye
 *   tıklamak diyaloğu iptal eder; bu yalnızca ek kolaylıktır. Klavye yolu
 *   tamdır: `Escape` tuşu ve "Vazgeç" düğmesi diyaloğu kapatır. Perde
 *   `aria-hidden` değildir ama odaklanabilir de değildir; odak diyalog içinde
 *   tuzağa alınır (dialog deseni). Perdeyi `<button>` yapmak tüm ekranı kaplayan
 *   bir düğme üretip diyalog içeriğini tıklanamaz kılardı.
 */
const ONCLICK_BEYAZ_LISTE = new Set(['features/panel/OnayDiyalogu.tsx']);

/** `<div ...>` açılış etiketini (iç içe süslü parantez/satır sonları dahil) döndürür. */
function acilisEtiketi(s: string, bas: number): string | null {
  let suslu = 0;
  let tirnak: string | null = null;
  for (let i = bas + 1; i < s.length; i++) {
    const c = s[i]!;
    if (tirnak !== null) {
      if (c === '\\') i++;
      else if (c === tirnak) tirnak = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      tirnak = c;
      continue;
    }
    if (c === '{') suslu++;
    else if (c === '}') suslu--;
    else if (c === '>' && suslu === 0) {
      if (s[i - 1] === '=') continue; // ok fonksiyonu: =>
      return s.slice(bas, i + 1);
    }
  }
  return null;
}

describe('div/span/li üzerinde onClick yok (SC 2.1.1)', () => {
  it('etkileşim yalnızca button/a üzerinde', () => {
    const bulunan: string[] = [];
    for (const dosya of TSX_DOSYALARI) {
      const rel = kisa(dosya);
      if (ONCLICK_BEYAZ_LISTE.has(rel)) continue;
      const s = readFileSync(dosya, 'utf8');
      for (const eslesme of s.matchAll(/<(div|span|li)\b/g)) {
        const etiket = acilisEtiketi(s, eslesme.index!);
        if (!etiket || !/\bonClick\b/.test(etiket)) continue;
        const satir = s.slice(0, eslesme.index!).split('\n').length;
        bulunan.push(`${rel}:${satir} <${eslesme[1]}> onClick`);
      }
    }
    expect(bulunan, 'Tıklanan HER şey <button> ya da <a> olmalı').toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 3) Jeton bütünlüğü
// ---------------------------------------------------------------------------

/**
 * Çalışma anında JS'ten yazılan yerel CSS değişkenleri (style.setProperty /
 * style={{ '--x': ... }}). Bunlar tokens.css'te tanımlı DEĞİLDİR ve olmamalıdır;
 * değerleri içerikten gelir (sıra, oran, kaydırma, fotoğraf adresi...).
 */
const DİNAMİK_PROPLAR = new Set([
  '--sira', // kart/durak animasyon sırası (Mozaik, Seri, Patika, Rota...)
  '--oran', // ölçüm çubuğu yüzdesi (Vakıf Röntgeni, Günün Eseri, Sertifika...)
  '--kayma', // sürükleme/zikzak ofseti (Hayrat-Akar, Patika, Konfeti)
  '--donus', // sürükleme dönüş açısı (Hayrat-Akar, Konfeti)
  '--gecikme', // liste giriş gecikmesi (Arşiv, Canlı, Harita)
  '--ortam-foto', // Yol ortam arka planı (ortamRengi.ts)
  '--boyut', // harita küme işareti boyutu (bolgeHaritasi.ts)
]);

function jetonlar(metin: string): Set<string> {
  return new Set([...metin.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]!));
}

describe('tasarım jetonu bütünlüğü', () => {
  it('kullanılan her var(--x) tanımlı ya da bilinen dinamik prop', () => {
    const tokens = jetonlar(readFileSync(TOKENS, 'utf8'));
    const bulunan: string[] = [];
    for (const dosya of CSS_DOSYALARI) {
      const metin = readFileSync(dosya, 'utf8');
      const yerel = jetonlar(metin);
      for (const m of new Set([...metin.matchAll(/var\(\s*(--[\w-]+)/g)].map((x) => x[1]!))) {
        if (tokens.has(m) || yerel.has(m) || DİNAMİK_PROPLAR.has(m)) continue;
        bulunan.push(`${kisa(dosya)}: var(${m})`);
      }
    }
    expect(bulunan, 'Tanımsız jeton: tokens.css’e ekleyin ya da yazımı düzeltin').toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 4) 320px yatay taşma koruması
// ---------------------------------------------------------------------------
describe('320px mobilde yatay taşma koruması', () => {
  it('minmax() sabit minimumu içerik alanından büyük değil (min(100%, ...) ile korunmalı)', () => {
    // 320px viewport - .sarmal 2rem yan boşluk = 288px içerik alanı.
    const İÇERİK_ALANI = 288;
    const bulunan: string[] = [];
    for (const dosya of CSS_DOSYALARI) {
      const satirlar = yorumsuzCss(readFileSync(dosya, 'utf8')).split('\n');
      satirlar.forEach((satir, i) => {
        for (const m of satir.matchAll(/minmax\(\s*([0-9]{3,})px/g)) {
          if (Number(m[1]) > İÇERİK_ALANI) {
            bulunan.push(`${kisa(dosya)}:${i + 1}: minmax(${m[1]}px, ...) → min(100%, ${m[1]}px)`);
          }
        }
      });
    }
    expect(bulunan, 'Sabit minimum 320px ekranda ızgarayı taşırır').toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 5) Büyük harfli etiket yasağı
// ---------------------------------------------------------------------------
describe('büyük harfli etiket yok (DESIGN §3/§8)', () => {
  it('hiçbir CSS dosyası text-transform: uppercase kullanmaz', () => {
    const bulunan = CSS_DOSYALARI.flatMap((dosya) =>
      yorumsuzCss(readFileSync(dosya, 'utf8'))
        .split('\n')
        .map((satir, i) => ({ satir, i }))
        .filter(({ satir }) => /text-transform:\s*uppercase/.test(satir))
        .map(({ satir, i }) => `${kisa(dosya)}:${i + 1}: ${satir.trim()}`),
    );
    expect(bulunan).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 6) Bileşen sözleşmesi — dokunma hedefi ve odak halkası
// ---------------------------------------------------------------------------
describe('bileşen sözleşmesi (dokunma hedefi + odak)', () => {
  const global = readFileSync(join(KOK, 'styles', 'global.css'), 'utf8');

  /** İlk seçici bloğunun gövdesini döndürür (düz metin araması; dosya sırası korunur). */
  function blok(secici: string): string {
    const bas = global.indexOf(secici + ' {');
    expect(bas, `${secici} global.css'te yok`).toBeGreaterThan(-1);
    return global.slice(bas, global.indexOf('}', bas));
  }

  it.each([
    '.dugme', // ana düğme: DESIGN §5 → 52px
    '.dugme--kucuk',
    '.secenek',
  ])('%s dokunma hedefi >= 44px (WCAG 2.2 SC 2.5.8)', (secici) => {
    const govde = blok(secici);
    const m = govde.match(/min-height:\s*([0-9]+)px/);
    expect(m, `${secici} min-height tanımlı olmalı`).toBeTruthy();
    expect(Number(m![1])).toBeGreaterThanOrEqual(44);
  });

  it(':focus-visible görünür halka tanımlı (SC 2.4.7)', () => {
    expect(global).toMatch(/:focus-visible\s*\{[^}]*outline:\s*3px\s+solid\s+var\(--odak\)/);
  });
});
