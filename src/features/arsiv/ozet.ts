/**
 * Arşiv metninden çocuklara gösterilecek kısa özet.
 *
 * Envanter PDF'lerinden aktarılan metinler iki dilli ve çok uzuncadır (medyan
 * ~2.300, en uzun ~111.000 karakter). 10–12 yaş arayüzünde tamamı basılmaz.
 * Bu yardımcı iki işi yapar:
 *
 *  1. **İngilizce paragrafları ayıklar.** Kaynak metinlerde her Türkçe
 *     paragrafın ardından İngilizce çevirisi gelebiliyor; çocuk arayüzünde
 *     İngilizce metin hiç gösterilmez. Sezgi iki deterministik sinyal kullanır:
 *     İngilizce işlev sözcüklerinin yoğunluğu (the, and, is, was, built…) ve
 *     Türkçe işlev sözcüklerinin varlığı (bir, ve, ile, yer, almaktadır…).
 *     Tırnak içi alıntılar (kitabe çevriyazıları) ölçümden çıkarılır; yoksa
 *     İngilizce paragrafın içindeki Osmanlıca alıntı Türkçe sanılır.
 *
 *  2. **İlk iki cümleyi en fazla 260 karakterlik özete çevirir.** Cümle
 *     sınırı tercih edilir: ikinci cümle sınıra sığmıyorsa özet ilk cümlede
 *     biter. İlk cümle tek başına 260 karakteri aşıyorsa kelime ortasından
 *     kesilmez; son tam kelimede kesilip sonuna "…" eklenir.
 *
 * Tüm adımlar saftır (rastgelelik, saat, ağ yok): aynı girdi her zaman aynı
 * sonucu verir ve bu yüzden birim testlerle doğrulanabilir.
 */

/** Özetin üst sınırı — sonuna eklenen "…" dahil. */
export const OZET_SINIRI = 260;

/**
 * İngilizce işlev sözcükleri. Kasıtlı olarak yalnızca İngilizceye özgü olanlar
 * seçildi: "on" (Türkçe: on), "at" (at), "her" (her), "in" gibi Türkçede de
 * kelime olabilenler listede yok. Böylece Türkçe metin yanlışlıkla elenmez.
 */
const INGILIZCE_ISLEV = new Set(
  (
    'the and of is was were are be been being to for from with by that this these those it its ' +
    'he she they his their which who whom where when while during after before between under over into ' +
    'also not but has have had can could would should may might must will built located known used ' +
    'them there then than such only some all more most if about through because very much many any ' +
    'each both here how what why whose'
  ).split(' '),
);

/** Türkçe işlev sözcükleri — İngilizce çevirilerde geçmeyen bağlaç/yardımcılar. */
const TURKCE_ISLEV = new Set(
  (
    'bir ve bu da de ile için olan olarak yer almaktadır bulunmaktadır yapılmıştır yaptırılmıştır ' +
    'edilmiştir tarihinde döneminde yılında tarafından adlı adına kadar sonra gibi ancak fakat veya ' +
    'göre içinde arasında olup ayrıca inşa bulunan geçen dönemde üzerinde zamanında yapılmış ' +
    'onarılmıştır bulunur var'
  ).split(' '),
);

/** Cümle başında görülen tipik İngilizce açılışlar ("The …", "In …" gibi). */
const INGILIZCE_BASLANGIC =
  /^(the|this|these|those|it|its|in|on the|among|located|built|during|after|before|when|while|there|his|their)\b/iu;

/** Tırnak içi alıntılar: kitabe çevriyazısı sınıflandırmayı yanıltmasın. */
const TIRNAKLI = /“[^”]*”|"[^"]*"|«[^»]*»|‘[^’]*’/gu;
const ACIK_TIRNAK = /[“"«‘]/u;

/** Nokta cümle sonu sayılmayan kısaltmalar (H. 786, M. 1450, Sultan II. Murad…). */
const KISALTMALAR = new Set([
  'h',
  'm',
  'i',
  'ii',
  'iii',
  'iv',
  'v',
  'vi',
  'vii',
  'viii',
  'ix',
  'x',
  's',
  'no',
  'yy',
  'vb',
  'vd',
  'bkz',
  'mm',
  'cm',
  'm',
  'km',
  'kr',
  'dr',
  'prof',
  'av',
  'mah',
  'cad',
  'sok',
]);

const BUYUK_HARF = /[A-ZÇĞİÖŞÜÂÎÛ]/u;
const HARF = /[a-zA-ZçğıöşüâîûÇĞİÖŞÜÂÎÛ]/u;
const KELIME = /[a-zçğıöşüâîû]+/gu;

/** Tırnaklı bölümleri ve (PDF aktarımında kapanmamış) artık alıntıyı atar. */
function tirnakTemizle(metin: string): string {
  let temiz = metin.replace(TIRNAKLI, ' ');
  const acik = temiz.search(ACIK_TIRNAK);
  if (acik >= 0) temiz = temiz.slice(0, acik);
  return temiz;
}

function olc(metin: string) {
  const temiz = tirnakTemizle(metin);
  const kelimeler = temiz.toLocaleLowerCase('tr').match(KELIME) ?? [];
  const ingilizce = kelimeler.filter((k) => INGILIZCE_ISLEV.has(k)).length;
  const turkce = kelimeler.filter((k) => TURKCE_ISLEV.has(k)).length;
  const harfSayisi = [...metin].filter((harf) => HARF.test(harf)).length;
  return {
    harfSayisi,
    ingilizce,
    ingilizceOrani: kelimeler.length > 0 ? ingilizce / kelimeler.length : 0,
    turkce,
  };
}

/**
 * Paragraf İngilizce çeviri mi?
 *
 * Türkçe işlev sözcüğü 2+ kez geçiyorsa paragraf Türkçe kabul edilir (karışık
 * PDF artıkları içerik kaybetmemek için korunur). Aksi hâlde İngilizce işlev
 * sözcük yoğunluğuna ve tipik İngilizce açılışa bakılır.
 */
export function ingilizceParagrafMi(paragraf: string): boolean {
  const olcum = olc(paragraf);
  if (olcum.harfSayisi < 6) return false; // sayı/etiket artığı: tek başına karar verme
  if (olcum.turkce >= 2) return false;
  if (olcum.ingilizce >= 2 && olcum.ingilizceOrani >= 0.05) return true;
  if (olcum.ingilizce >= 1 && olcum.ingilizceOrani >= 0.12 && INGILIZCE_BASLANGIC.test(tirnakTemizle(paragraf).trim())) {
    return true;
  }
  return false;
}

/** Noktalama öncesindeki son kelime kısaltma mı? (ASCII küçük harfle karşılaştırılır.) */
function kisaltmaMi(metin: string, cumleBasi: number, nokta: number): boolean {
  const oncekiKelime = metin.slice(cumleBasi, nokta).trim().split(/\s+/u).at(-1) ?? '';
  const sadelesmis = oncekiKelime.toLowerCase().replace(/[^a-z]/gu, '');
  return KISALTMALAR.has(sadelesmis);
}

/** Metni cümlelere böler; kısaltma noktalarında bölmez. */
function cumlelere(metin: string): string[] {
  if (!metin) return [];
  const cumleler: string[] = [];
  let bas = 0;
  for (let i = 0; i < metin.length; i += 1) {
    const karakter = metin[i]!;
    if (!'.!?…'.includes(karakter)) continue;

    // "..." gibi tekrarlı noktaları tek sınır say.
    let son = i + 1;
    while (son < metin.length && metin[son] === '.') son += 1;

    const devam = /^(\s+)([^\s])/u.exec(metin.slice(son));
    if (devam) {
      // Yeni cümle büyük harfle başlamıyorsa sınır değil ("3.5", "No:28" vb.).
      if (!BUYUK_HARF.test(devam[2]!)) continue;
    } else if (son < metin.length) {
      continue; // noktalama bitişik: "3.5", "s.80" gibi
    }

    if (karakter === '.' && kisaltmaMi(metin, bas, i)) continue;

    cumleler.push(metin.slice(bas, son).trim());
    bas = son;
    i = son - 1;
  }
  const artan = metin.slice(bas).trim();
  if (artan) cumleler.push(artan);
  return cumleler;
}

/** Karakter sınırını aşan tek cümleyi son tam kelimede keser ve "…" ekler. */
function kelimeSinirindaKes(metin: string, sinir: number): string {
  const kesik = metin.slice(0, sinir);
  const sonBosluk = kesik.lastIndexOf(' ');
  const govde = (sonBosluk > 0 ? kesik.slice(0, sonBosluk) : kesik).replace(/[\s,;:.!?…–—-]+$/u, '').trim();
  const temel = govde.length > 0 ? govde : kesik.trim();
  return `${temel}…`;
}

/** Cümle listesinden ilk iki cümleyi sınır içinde özetler. */
function ozetCikar(cumleler: string[]): string {
  if (cumleler.length === 0) return '';
  const ilkIki = cumleler.slice(0, 2).join(' ').replace(/\s+/gu, ' ').trim();
  if (ilkIki.length <= OZET_SINIRI) return ilkIki;

  const ilkCumle = cumleler[0]!.trim();
  if (ilkCumle.length <= OZET_SINIRI) return ilkCumle; // cümle sınırında kes

  return kelimeSinirindaKes(ilkCumle, OZET_SINIRI - 1);
}

export interface CocukOzeti {
  /** İlk iki cümleden oluşan kısa özet. Türkçe metin yoksa boş dizedir. */
  ozet: string;
  /**
   * İngilizce paragraflar ayıklandıktan sonra kalan Türkçe paragraflar — yani
   * "Büyükler için kaynak metni" bölümünde gösterilecek tam metin.
   */
  kalan: string[];
}

/**
 * Arşiv paragraflarından çocuk özeti üretir.
 *
 * @param paragraflar `arsivMetni()` gibi kaynaklardan gelen ham paragraflar.
 *   Boş/boşluk paragraflar yok sayılır; İngilizce olanlar ayıklanır.
 */
export function cocukOzeti(paragraflar: string[]): CocukOzeti {
  const temiz = paragraflar.map((paragraf) => paragraf.trim()).filter((paragraf) => paragraf.length > 0);
  const kalan = temiz.filter((paragraf) => !ingilizceParagrafMi(paragraf));
  const birlesik = kalan.join(' ').replace(/\s+/gu, ' ').trim();
  return { ozet: ozetCikar(cumlelere(birlesik)), kalan };
}
