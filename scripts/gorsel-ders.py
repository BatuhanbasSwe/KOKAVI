"""Ders eserlerinin fotoğraflarını kaynak/gorseller/ içinden seçip web için hazırlar.

Kullanım:  python scripts/gorsel-ders.py
Önce:      python scripts/pdf-gorsel.py   (kaynak/gorseller/ oluşur)
Gerekli:   pip install pillow

Çıktı:
  public/gorseller/<eserId>/1.webp … 6.webp   (en fazla 1280 px geniş)
  public/gorseller/<eserId>/k.webp             (480 px kapak; harita, liste, defter)
  data/gorseller.json                          ({eserId: {sayi, kaynak}}; seed okur)

Bir külliyenin tek parçası olan derslerde (Yeşil Türbe, Muradiye Hamamı…) yalnızca
o parçanın envanter sayfalarındaki fotoğraflar alınır (basılı sayfa aralığı).
"""
import json
import shutil
import sys
from pathlib import Path

from PIL import Image

PROJE = Path(__file__).resolve().parent.parent
KAYNAK = PROJE / "kaynak" / "gorseller"
CIKTI = PROJE / "public" / "gorseller"
MANIFEST = PROJE / "data" / "gorseller.json"
EN_FAZLA = 6

KITAP = {
    "bursa-envanteri-cilt-1.pdf": "Vakıf Katılım, 'Bursa Vakıf Eserleri', I. Cilt",
    "bursa-envanteri-cilt-2.pdf": "Vakıf Katılım, 'Bursa Vakıf Eserleri', II. Cilt",
    "bursa-envanteri-cilt-3.pdf": "Vakıf Katılım, 'Bursa Vakıf Eserleri', III. Cilt",
    "hatay-vakif-eserleri.pdf": "Vakıf Katılım, 'Hatay İli Vakıf Eserleri'",
    "konya-envanteri-1_cilt-web.pdf": "Vakıf Katılım, 'Konya Vakıf Eserleri', I. Cilt",
    "konya-envanteri-2_cilt-web.pdf": "Vakıf Katılım, 'Konya Vakıf Eserleri', II. Cilt",
}

# eserId -> (kaynak klasörü, basılı sayfa aralıkları ya da None = klasörün tamamı)
ESLEME = {
    # Bursa · Ünite 1
    "bursa-ulucami": ("bursa/ulucami", None),
    "bursa-yesilcami-yesil-cami": ("bursa/yesil-celebi-mehmed-kulliyesi", [(337, 372)]),
    "bursa-yesil-medrese-sultaniye-medresesi-bugun-bursa-tu": ("bursa/yesil-celebi-mehmed-kulliyesi", [(377, 390)]),
    "bursa-yesil-turbe-celebi-sultan-mehmed-turbesi": ("bursa/yesil-celebi-mehmed-kulliyesi", [(391, 407)]),
    "bursa-haraccioglu-darulkurra-mektebi": ("bursa/haraccioglu-darulkurra-mektebi", None),
    "bursa-molla-yegan-medresesi": ("bursa/molla-yegan-medresesi", None),
    "bursa-gokdere-medresesi-pasa-celebi-medresesi": ("bursa/gokdere-medresesi", None),
    "bursa-veled-i-yanic-mescidi-veled-i-yanic-camii": ("bursa/veled-i-yanic-camii-cesme-ve-haziresi", None),
    "bursa-osman-gazi-turbesi": ("bursa/osman-gazi-turbesi", None),
    "bursa-hz-uftade-camii": ("bursa/hz-uftade-camii", None),
    "bursa-esrefzade-camii": ("bursa/esrefzade-camii-minaresi-ve-haziresi", None),
    # Bursa · Ünite 2
    "bursa-koza-hani": ("bursa/koza-hani", None),
    "bursa-ipek-hani-sultan-hani-han-i-harir": ("bursa/ipek-hani", None),
    "bursa-yildirim-bayezid-bedesteni": ("bursa/yildirim-bayezid-bedesteni", None),
    "bursa-irgandi-koprusu-kapali-kopru": ("bursa/irgandi-koprusu", None),
    "bursa-ordekli-hamam": ("bursa/ordekli-hamam-eski-yeni-hamam", None),
    "bursa-fidan-hani": ("bursa/fidan-hani", None),
    "bursa-pirinc-hani": ("bursa/pirinc-hani", None),
    "bursa-nasuh-pasa-hamami": ("bursa/nasuh-pasa-hamami", None),
    "bursa-issiz-susuz-han": ("bursa/issiz-susuz-han", None),
    "bursa-muradiye-hamami-ii-murad-hamami-bekciyan-hamami": ("bursa/ii-murad-kulliyesi", [(130, 133)]),
    "bursa-demirtas-timurtas-hamami": ("bursa/timurtas-pasa-kulliyesi", [(224, 227)]),
    # Bursa · Ünite 3
    "bursa-gazi-hudavendigar-kaplica-imareti": ("bursa/i-murad-hudavendigar-kulliyesi", None),
    "bursa-yildirim-bayezid-kulliyesi": ("bursa/yildirim-bayezid-kulliyesi", None),
    "bursa-nilufer-hatun-imareti": ("bursa/nilufer-hatun-imareti", None),
    "bursa-ii-murad-kulliyesi": ("bursa/ii-murad-kulliyesi", [(115, 123), (128, 129)]),
    "bursa-umur-bey-kulliyesi": ("bursa/umur-bey-kulliyesi", None),
    "bursa-dullar-evi": ("bursa/bursa-dullar-evi", None),
    "bursa-emir-sultan-kulliyesi": ("bursa/emir-sultan-kulliyesi", [(273, 311)]),
    "bursa-orhan-bey-kulliyesi": ("bursa/orhan-bey-kulliyesi", None),
    "bursa-ishak-pasa-kulliyesi": ("bursa/ishak-pasa-kulliyesi", None),
    "bursa-muradiye-medresesi-cesmesi": ("bursa/ii-murad-kulliyesi", [(124, 127)]),
    "bursa-besir-aga-cesmesi": ("bursa/emir-sultan-kulliyesi", [(312, 316)]),
    # Konya
    "karatay-medresesi": ("konya/karatay-medresesi", None),
    "sahib-ata-kulliyesi": ("konya/sahip-ata-hanikahi-ve-turbesi", None),
    "zazadin-hani": ("konya/zazadin-sadeddin-kopek-hani", None),
    "konya-mevlana-turbesi": ("konya/mevlana-turbesi-muze", None),
    "konya-ince-minareli-medrese": ("konya/ince-minareli-medrese-sahip-ata-darulhadis", None),
    "konya-esrefoglu-suleyman-bey-kulliyesi": ("konya/esrefoglu-suleyman-bey-kulliyesi", None),
    "konya-sultan-ii-selim-kulliyesi": ("konya/sultan-ii-selim-kulliyesi", None),
    "konya-tahir-ile-zuhre-mescidi": ("konya/tahir-ile-zuhre-don-baba-pir-ahi-sultan-mescit-ve-turbesi", None),
    "konya-sultan-alaeddin-camii": ("konya/sultan-alaeddin-ulu-camii", None),
    "konya-sems-i-tebrizi-camii": ("konya/sems-i-tebrizi-camii-ve-turbesi", None),
    "konya-lala-mustafa-pasa-kulliyesi": ("konya/lala-mustafa-pasa-kulliyesi", None),
    "konya-imaret-hasan-pasa-camii": ("konya/imaret-hasan-pasa-camii", None),
    # Hatay
    "hatay-habib-i-neccar-camii-ve-kulliyesi": ("hatay/habib-i-neccar-camii-ve-kulliyesi", None),
    "hatay-sokullu-mehmet-pasa-kulliyesi-medrese-ve-sibyan-mektebi": ("hatay/sokullu-mehmet-pasa-camii-ve-kulliyesi", None),
    "hatay-kurtulus-beyseri-hamami": ("hatay/kurtulus-beysen-hamami", None),
    "hatay-kursunlu-han-cesmesi": ("hatay/kursunlu-han", None),
    "hatay-beyazid-i-bestami-turbesi-ve-tekkesi": ("hatay/beyazid-i-bestami-turbesi", None),
    "hatay-kanuni-sultan-suleyman-kervansarayi": ("hatay/kanuni-sultan-suleyman-kervansarayi", None),
    "hatay-ulu-camii-ve-kulliyesi": ("hatay/ulu-camii-ve-kulliyesi", None),
    "hatay-senkoy-ahmet-kusayri-camii": ("hatay/senkoy-ahmet-kusayri-camii", None),
    "hatay-yogunoluk-ermeni-kilisesi": ("hatay/yogunoluk-ermeni-kilisesi", None),
    "hatay-meydan-camii-ve-kulliyesi": ("hatay/meydan-camii-ve-kulliyesi", None),
    "hatay-kantara-camii": ("hatay/kantara-camii", None),
    "hatay-rum-ortodoks-kilisesi": ("hatay/rum-ortodoks-kilisesi", None),
}


def sec(eser: dict, araliklar) -> list[dict]:
    gorseller = eser["gorseller"]
    if araliklar:
        pdf_araliklari = [(bas // 2 + 1, son // 2 + 1) for bas, son in araliklar]
        gorseller = [g for g in gorseller if any(b <= g["sayfa"] <= s for b, s in pdf_araliklari)]
    # Sıra: PDF'teki sıra korunur (ilk görsel çoğunlukla eserin açılış fotoğrafı),
    # ama çok küçük görseller (kısa kenarı < 400 px) yer varsa sona itilir.
    buyuk = [g for g in gorseller if min(g["px"]) >= 400]
    kucuk = [g for g in gorseller if min(g["px"]) < 400]
    secilen = (buyuk + kucuk)[:EN_FAZLA]
    # Kapak: ilk yatay (en/boy >= 1.2) görsel öne alınır.
    for i, g in enumerate(secilen):
        if g["px"][0] / g["px"][1] >= 1.2:
            secilen.insert(0, secilen.pop(i))
            break
    return secilen


def yaz(kaynak: Path, hedef: Path, genislik: int, kalite: int) -> None:
    im = Image.open(kaynak).convert("RGB")
    if im.width > genislik:
        im = im.resize((genislik, round(im.height * genislik / im.width)), Image.LANCZOS)
    im.save(hedef, "WEBP", quality=kalite, method=6)


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    eserler = {e["klasor"]: e for e in json.load(open(KAYNAK / "eserler.json", encoding="utf-8"))}
    manifest, eksik = {}, []
    if CIKTI.exists():
        shutil.rmtree(CIKTI)
    for eser_id, (klasor, araliklar) in ESLEME.items():
        kaynak_eser = eserler.get(klasor)
        secilen = sec(kaynak_eser, araliklar) if kaynak_eser else []
        if not secilen:
            eksik.append(eser_id)
            continue
        hedef = CIKTI / eser_id
        hedef.mkdir(parents=True, exist_ok=True)
        for i, g in enumerate(secilen, 1):
            yaz(KAYNAK / klasor / g["dosya"], hedef / f"{i}.webp", 1280, 72)
        yaz(KAYNAK / klasor / secilen[0]["dosya"], hedef / "k.webp", 480, 70)
        sayfalar = sorted({g["sayfa"] for g in secilen})
        basili = f"s. {2 * sayfalar[0] - 2}-{2 * sayfalar[-1] - 1}"
        manifest[eser_id] = {"sayi": len(secilen), "kaynak": f"{KITAP[kaynak_eser['pdf']]}, {basili}"}
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    boyut = sum(f.stat().st_size for f in CIKTI.rglob("*.webp"))
    print(f"{len(manifest)} eser, {sum(m['sayi'] for m in manifest.values())} fotoğraf, {boyut // 1024 // 1024} MB")
    if eksik:
        print("Fotoğrafı bulunamayan:", eksik)
    return 0


if __name__ == "__main__":
    sys.exit(main())
