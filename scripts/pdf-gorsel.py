"""Vakıf Katılım envanter PDF'lerindeki görselleri çıkarır ve her birini ait olduğu esere eşler.

Kullanım:
  python scripts/pdf-gorsel.py            # Downloads'taki 6 PDF -> kaynak/gorseller/
  python scripts/pdf-gorsel.py --kuru     # yalnızca eser listesini yazdır, dosya çıkarma

Gerekli paketler: pip install pymupdf pillow

Nasıl eşliyor:
  PDF sayfaları çift sayfa (sol + sağ yarı). Sayfalar ve yarılar sırayla taranır; eser
  başlığının yazı tipi görülünce yeni eser başlar ve sonraki görseller ona gider.
  - Bursa / Konya: başlık Acuta-Bold ~29pt, ilçe adı başlığın üstünde ~21pt aralıklı harf.
  - Hatay: başlık fotoğrafın üstünde dikey Times Bold 35-42pt (beyaz = Türkçe ad).
  Başlıktan önceki sayfalar (sunuş, içindekiler, tarihçe) "_genel" klasörüne gider.

Çıktı:
  kaynak/gorseller/<il>/<eser-klasoru>/<pdf>-s<sayfa>-<n>.jpg
  kaynak/gorseller/eserler.json   (il, eser adı, ilçe, PDF sayfa aralığı, görsel listesi)
"""
import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

import pymupdf

PROJE = Path(__file__).resolve().parent.parent
KLASOR = Path.home() / "Downloads"
PDFLER = {
    "bursa-envanteri-cilt-1": "bursa",
    "bursa-envanteri-cilt-2": "bursa",
    "bursa-envanteri-cilt-3": "bursa",
    "hatay-vakif-eserleri": "hatay",
    "konya-envanteri-1_cilt-web": "konya",
    "konya-envanteri-2_cilt-web": "konya",
}
EN_KUCUK_KENAR = 150  # px; daha küçükler süs/simge
TR_HARF = str.maketrans("çğıöşüÇĞİÖŞÜâîûÂÎÛ", "cgiosuCGIOSUaiuAIU")


def tr_kucuk(metin: str) -> str:
    return metin.replace("I", "ı").replace("İ", "i").lower()


def tr_baslik(metin: str) -> str:
    """'YILDIRIM' -> 'Yıldırım' (Python'un title() Türkçe I/İ'yi bilmiyor)."""
    def kelime(k: str) -> str:
        k = tr_kucuk(k)
        ilk = {"i": "İ", "ı": "I"}.get(k[:1], k[:1].upper())
        return ilk + k[1:]
    return " ".join(kelime(k) for k in metin.split())


# Hatay'da başlık gibi dizilmiş ama eser olmayan bölüm sayfaları
BOLUM_ADLARI = re.compile(r"^(SUNUŞ|HATAY İLİNİN KONUMU|İŞ YERİ VE DİĞERLERİ)")


def slug(metin: str) -> str:
    metin = metin.translate(TR_HARF).lower()
    return re.sub(r"[^a-z0-9]+", "-", metin).strip("-")[:80] or "adsiz"


def bosluk(metin: str) -> str:
    return re.sub(r"\s+", " ", metin).strip()


def baslik_mi(il: str, span: dict, yon: tuple) -> bool:
    boyut, font = span["size"], span["font"]
    if il == "hatay":
        return yon == (0, -1) and "Bold" in font and 34 <= boyut <= 43
    return font == "Acuta-Bold" and 27 <= boyut <= 31


def bolum_sayfasi_mi(il: str, sayfa: pymupdf.Page) -> bool:
    """'Külliyeler', 'I. Cilt' gibi büyük puntolu ayraç sayfaları."""
    for blok in sayfa.get_text("dict")["blocks"]:
        for satir in blok.get("lines", []):
            for s in satir["spans"]:
                if s["text"].strip() and s["size"] >= 45 and "Bold" in s["font"]:
                    return True
    return False


def sayfa_basliklari(il: str, sayfa: pymupdf.Page) -> list[dict]:
    """Sayfanın her yarısındaki eser başlığını döndürür: [{yari, ad, ad_en, ilce}]."""
    orta = sayfa.rect.width / 2
    yarilar: dict[int, dict] = {}
    for blok in sayfa.get_text("dict")["blocks"]:
        for satir in blok.get("lines", []):
            yon = tuple(round(d) for d in satir["dir"])
            for s in satir["spans"]:
                if not s["text"].strip():
                    continue
                yari = 0 if s["bbox"][0] < orta else 1
                y = yarilar.setdefault(yari, {"tr": [], "en": [], "ilce": []})
                if baslik_mi(il, s, yon):
                    # Hatay'da beyaz yazı Türkçe ad, renkli yazı İngilizce ad
                    if il == "hatay" and s["color"] != 0xFFFFFF:
                        y["en"].append((s["bbox"][0], s["bbox"][1], s["text"]))
                    else:
                        y["tr"].append((s["bbox"][0], s["bbox"][1], s["text"]))
                elif il != "hatay" and 20 <= s["size"] <= 22.5 and "Bold" in s["font"]:
                    y["ilce"].append((s["bbox"][1], s["bbox"][0], s["text"]))
                elif il != "hatay" and 14 <= s["size"] <= 16 and "Black" in s["font"]:
                    y["en"].append((s["bbox"][0], s["bbox"][1], s["text"]))

    sonuc = []
    for yari, y in sorted(yarilar.items()):
        if not y["tr"]:
            continue
        if il == "hatay":  # dikey satırlar soldan sağa
            ad = " ".join(t for _, _, t in sorted(y["tr"]))
            ad_en = " ".join(t for _, _, t in sorted(y["en"]))
        else:  # yatay satırlar yukarıdan aşağıya
            ad = " ".join(t for _, _, t in sorted(y["tr"], key=lambda k: (k[1], k[0])))
            # İngilizce ad: başlığın hemen altındaki satır(lar). Külliyelerde aşağıdaki
            # alt yapı başlıkları da aynı yazı tipinde, onları almıyoruz.
            alt = min(yy for _, yy, _ in y["tr"])
            en = sorted((k for k in y["en"] if k[1] > alt), key=lambda k: (k[1], k[0]))
            ad_en = " ".join(t for _, yy, t in en if en and yy <= en[0][1] + 25)
        # İlçe harf aralıklı yazılmış: "M U S T A F A K E M A L P A Ş A"
        ilce = "".join("".join(t.split()) for _, _, t in sorted(y["ilce"]))
        sonuc.append({"yari": yari, "ad": bosluk(ad), "ad_en": bosluk(ad_en), "ilce": tr_baslik(ilce)})
    return sonuc


def gorsel_kaydet(doc: pymupdf.Document, xref: int, smask: int, hedef: Path) -> None:
    pix = pymupdf.Pixmap(doc, xref)
    if pix.colorspace is None or pix.colorspace.n != 3:
        pix = pymupdf.Pixmap(pymupdf.csRGB, pix)  # CMYK / gri -> RGB
    if pix.alpha:
        pix = pymupdf.Pixmap(pix, 0)
    if not smask:
        pix.save(hedef, jpg_quality=88)
        return
    # Saydam arka planlı kesik görseller (minare vb.). Maske ayrı bir nesnede ve
    # çözünürlüğü farklı olabiliyor; ölçekleyip PDF'teki gibi beyaz zemine oturtuyoruz.
    from PIL import Image
    renk = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    m = pymupdf.Pixmap(doc, smask)
    if m.n != 1:
        m = pymupdf.Pixmap(pymupdf.csGRAY, m)
    maske = Image.frombytes("L", (m.width, m.height), m.samples).resize(renk.size)
    zemin = Image.new("RGB", renk.size, (255, 255, 255))
    zemin.paste(renk, mask=maske)
    zemin.save(hedef, quality=88)


def isle(ad: str, il: str, cikti: Path, kuru: bool, eserler: list, klasorler: dict) -> None:
    doc = pymupdf.open(KLASOR / f"{ad}.pdf")
    tekrar = Counter(im[0] for s in doc for im in s.get_images(full=True))
    genel = {"il": il, "pdf": f"{ad}.pdf", "ad": "_genel", "ad_en": "", "ilce": "",
             "klasor": f"{il}/_genel", "sayfalar": [], "gorseller": []}
    simdiki = genel
    eserler.append(genel)

    bolum = {"il": il, "pdf": f"{ad}.pdf", "ad": "_bolum", "ad_en": "", "ilce": "",
             "klasor": f"{il}/_bolum-sayfalari", "sayfalar": [], "gorseller": []}
    eserler.append(bolum)

    for sayfa in doc:
        no = sayfa.number + 1
        orta = sayfa.rect.width / 2
        basliklar = {b["yari"]: b for b in sayfa_basliklari(il, sayfa)}

        # Bu sayfadaki her yarı için o yarıda geçerli eseri belirle
        yari_eser = {}
        if not basliklar and bolum_sayfasi_mi(il, sayfa):
            yari_eser = {0: bolum, 1: bolum}
            bolum["sayfalar"].append(no)
        for yari in (0, 1):
            if yari in yari_eser:
                continue
            b = basliklar.get(yari)
            if b and b["ad"] != simdiki["ad"]:  # aynı başlık art arda gelirse aynı eser
                k = slug(b["ad"])
                if BOLUM_ADLARI.match(b["ad"]):
                    k = f"_bolum-{k}"
                elif k in klasorler.get(il, set()):
                    k = slug(f"{b['ilce']} {b['ad']}") if b["ilce"] else f"{k}-{no}"
                klasorler.setdefault(il, set()).add(k)
                simdiki = {"il": il, "pdf": f"{ad}.pdf", "ad": b["ad"], "ad_en": b["ad_en"],
                           "ilce": b["ilce"], "klasor": f"{il}/{k}", "sayfalar": [], "gorseller": []}
                eserler.append(simdiki)
            yari_eser[yari] = simdiki
            if no not in simdiki["sayfalar"]:
                simdiki["sayfalar"].append(no)

        sira = 0
        for im in sayfa.get_images(full=True):
            xref, smask, gen, yuk = im[0], im[1], im[2], im[3]
            if min(gen, yuk) < EN_KUCUK_KENAR or tekrar[xref] > 3:
                continue
            for kutu in sayfa.get_image_rects(xref):
                if kutu.width < 40 or kutu.height < 40:
                    continue
                # Sayfa boyu fotoğraf: başlık hangi yarıdaysa o esere ait
                kapsadigi = [y for y in (0, 1) if kutu.x0 < orta - 50 if y == 0] + \
                            [y for y in (0, 1) if kutu.x1 > orta + 50 if y == 1]
                basligi_olan = [y for y in kapsadigi if y in basliklar]
                yari = basligi_olan[0] if basligi_olan else (0 if (kutu.x0 + kutu.x1) / 2 < orta else 1)
                eser = yari_eser[yari]
                sira += 1
                dosya = f"{ad}-s{no:03d}-{sira}.jpg"
                eser["gorseller"].append({"dosya": dosya, "sayfa": no, "px": [gen, yuk]})
                if not kuru:
                    hedef = cikti / eser["klasor"]
                    hedef.mkdir(parents=True, exist_ok=True)
                    gorsel_kaydet(doc, xref, smask, hedef / dosya)
                break  # aynı görsel sayfada iki kez yerleşmişse bir kez al


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="PDF görsellerini eserlere göre çıkar")
    ap.add_argument("-o", "--cikti", type=Path, default=PROJE / "kaynak" / "gorseller")
    ap.add_argument("--kuru", action="store_true", help="dosya yazmadan eser listesini göster")
    args = ap.parse_args()

    eserler: list = []
    klasorler: dict = {}
    for ad, il in PDFLER.items():
        isle(ad, il, args.cikti, args.kuru, eserler, klasorler)
        bu = [e for e in eserler if e["pdf"] == f"{ad}.pdf"]
        print(f"✓ {ad}: {len(bu) - 1} eser, {sum(len(e['gorseller']) for e in bu)} görsel", flush=True)

    if args.kuru:
        for e in eserler:
            print(f"  {e['pdf'][:12]} s.{e['sayfalar'][0] if e['sayfalar'] else '-':>3} "
                  f"{len(e['gorseller']):>3} görsel  {e['ilce'] or '-':<14} {e['ad']}  |  {e['ad_en']}")
    else:
        args.cikti.mkdir(parents=True, exist_ok=True)
        (args.cikti / "eserler.json").write_text(
            json.dumps(eserler, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
