"""Vakıf Katılım envanter PDF'lerini Markdown'a çevirir (yalnızca metin, görseller atlanır).

Kullanım:
  python scripts/pdf-md.py                      # Downloads'taki 6 PDF -> kaynak/md/
  python scripts/pdf-md.py a.pdf b.pdf -o cikti

Gerekli paketler: pip install pymupdf pymupdf4llm psutil

Her sayfanın başına <!-- sayfa N --> işareti konur. N, PDF içindeki sıra
numarasıdır (basılı sayfa numarası değil). Görselleri eşlerken bu numara kullanılır.
"""
import argparse
import re
import sys
import time
from pathlib import Path

import pymupdf
import pymupdf4llm

PROJE = Path(__file__).resolve().parent.parent
VARSAYILAN_KLASOR = Path.home() / "Downloads"
VARSAYILAN_PDFLER = [
    "bursa-envanteri-cilt-1.pdf",
    "bursa-envanteri-cilt-2.pdf",
    "bursa-envanteri-cilt-3.pdf",
    "hatay-vakif-eserleri.pdf",
    "konya-envanteri-1_cilt-web.pdf",
    "konya-envanteri-2_cilt-web.pdf",
]

# PDF'lerde "ﬁ" gibi bitişik harfler var; aramada sorun çıkarmasın diye açıyoruz.
LIGATURLER = {"ﬀ": "ff", "ﬁ": "fi", "ﬂ": "fl", "ﬃ": "ffi", "ﬄ": "ffl"}


HARF = r"[^\W\d_]"
BUYUK = "A-ZÇĞİÖŞÜÂÎÛ"
# Bursa cilt 1-2'de bazı sayfaların yazı tipi kodlaması bozuk: harfler noktalama
# işareti olarak çıkıyor. Yalnızca iki harfin arasında (ya da kelime başında) kalan
# işaretleri düzeltiyoruz; gerçek ünlem ve parantezler bozulmaz.
ING_FFI = re.compile(r"\b([aAoOeEsS])\((liat|cial|ce\b|cien|cul|x)")  # affiliated, official, office...


TEKIL_GLIFLER = {"Le(e": "Lefke", "şe(af": "şeffaf"}  # bozuk kodlamalı sayfa dışında kalan tek tük


def glif_duzelt(metin: str) -> str:
    """Bir sayfanın metnini alır. Yalnızca yazı tipi bozuk sayfalarda düzeltme yapar;
    sağlam sayfalarda 'Tuhana(Kemerhisar)' gibi boşluksuz gerçek parantezler var."""
    for eski, yeni in TEKIL_GLIFLER.items():
        metin = metin.replace(eski, yeni)
    # İki harf arasındaki '%' hiçbir sayfada gerçek değil: her sayfada düzelt
    metin = re.sub(rf"(?<=[{BUYUK}])%(?=[{BUYUK}])", "İ", metin)  # CAMİLER
    metin = re.sub(rf"(?<={HARF})%(?={HARF})", "ff", metin)  # different, effort
    if not re.search(rf"{HARF}!{HARF}", metin):  # bozuk sayfanın işareti: kelime içinde '!'
        return metin
    metin = ING_FFI.sub(lambda m: m.group(1) + "ffi" + m.group(2), metin)
    metin = re.sub(rf"(?<=[{BUYUK}])!(?=[{BUYUK}])|(?<![\w!])!(?=[{BUYUK}]{{2}})", "Ş", metin)
    metin = re.sub(rf"(?<={HARF})!(?={HARF})|(?<![\w!])!(?=[a-zçğıöşü])", "ş", metin)
    metin = re.sub(rf"(?<={HARF})\((?={HARF})", "ğ", metin)  # Niğde, Ereğli
    metin = re.sub(rf"(?<={HARF})\)(?={HARF})", "fk", metin)  # Lefke, Sedefkâr
    return metin


def temizle(metin: str) -> str:
    for eski, yeni in LIGATURLER.items():
        metin = metin.replace(eski, yeni)
    metin = glif_duzelt(metin)
    metin = re.sub(r"[ \t]+\n", "\n", metin)  # satır sonu boşlukları
    metin = re.sub(r"\n{3,}", "\n\n", metin)  # üst üste boş satırlar
    return metin.strip()


def cevir(pdf: Path, cikti: Path) -> tuple[Path, int, float]:
    basla = time.time()
    sayfalar = pymupdf4llm.to_markdown(
        str(pdf),
        page_chunks=True,
        ignore_images=True,
        ignore_graphics=True,
        show_progress=False,
    )
    parcalar = [
        f"# {pdf.stem}\n\n"
        f"> Kaynak: `{pdf.name}` ({len(sayfalar)} sayfa). "
        "Sayfa işaretleri PDF içindeki sıradır, basılı sayfa numarası değildir.\n"
    ]
    doc = pymupdf.open(pdf)
    for no, sayfa in enumerate(sayfalar, 1):
        metin = temizle(sayfa["text"])
        # Yerleşim modeli, tam sayfa fotoğrafın üstüne basılmış metni (eser başlık
        # sayfaları) görsel sayıp atıyor. Öyleyse ham metni PDF'ten doğrudan al.
        if len(metin) < 20:
            ham = temizle(doc[no - 1].get_text())  # sort=True başlık sırasını bozuyor
            if len(ham) >= 20:
                metin = ham
        parcalar.append(f"<!-- sayfa {no} -->\n\n{metin}\n")

    hedef = cikti / f"{pdf.stem}.md"
    hedef.write_text("\n".join(parcalar), encoding="utf-8")
    return hedef, len(sayfalar), time.time() - basla


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="PDF -> Markdown (yalnızca metin)")
    ap.add_argument("pdfler", nargs="*", type=Path, help="çevrilecek PDF'ler")
    ap.add_argument("-o", "--cikti", type=Path, default=PROJE / "kaynak" / "md")
    args = ap.parse_args()

    pdfler = args.pdfler or [VARSAYILAN_KLASOR / ad for ad in VARSAYILAN_PDFLER]
    eksik = [p for p in pdfler if not p.is_file()]
    if eksik:
        print("Bulunamadı:", *eksik, sep="\n  ")
        return 1
    args.cikti.mkdir(parents=True, exist_ok=True)

    # Sırayla çeviriyoruz: yerleşim modeli zaten tüm çekirdekleri kullanıyor,
    # paralel çalıştırınca süreçler birbirini boğup 10 kat yavaşlıyor.
    hata = 0
    for pdf in pdfler:
        try:
            hedef, sayfa, sure = cevir(pdf, args.cikti)
            print(f"✓ {pdf.name}: {sayfa} sayfa, {sure:.0f} sn -> {hedef}", flush=True)
        except Exception as e:  # bir PDF bozuksa diğerleri devam etsin
            hata += 1
            print(f"✗ {pdf.name}: {e}", flush=True)
    return 1 if hata else 0


if __name__ == "__main__":
    sys.exit(main())
