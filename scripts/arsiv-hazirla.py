"""'Meraklısına' arşivi: envanterlerdeki TÜM eserleri (ders olsun olmasın) uygulamaya hazırlar.

Kullanım:  python scripts/arsiv-hazirla.py
Önce:      python scripts/pdf-md.py && python scripts/pdf-gorsel.py
Gerekli:   pip install pillow

Çıktı (public/arsiv/ — PWA önbelleğine baştan alınmaz, açıldıkça indirilir):
  liste.json          [{id, ad, il, ilce, tur, kaynak, ders?}]  harita + arşiv listesi
  metin/<id>.json     {paragraflar: [...]}                      eser sayfası açılınca
  foto/<id>.webp      640 px tek fotoğraf

Metin, PDF'ten otomatik aktarılır: eserin başlığından bir sonraki eserin başlığına
kadar kesilir, Türkçe paragraflar ayrılır. Elle düzeltilmemiştir; arşiv sayfası bunu
okura söyler.
"""
import importlib.util
import json
import re
import shutil
import sys
from collections import Counter
from pathlib import Path

from PIL import Image

PROJE = Path(__file__).resolve().parent.parent
KAYNAK = PROJE / "kaynak"
CIKTI = PROJE / "public" / "arsiv"

KITAP = {
    "bursa-envanteri-cilt-1.pdf": "Vakıf Katılım, 'Bursa Vakıf Eserleri', I. Cilt (2026)",
    "bursa-envanteri-cilt-2.pdf": "Vakıf Katılım, 'Bursa Vakıf Eserleri', II. Cilt (2026)",
    "bursa-envanteri-cilt-3.pdf": "Vakıf Katılım, 'Bursa Vakıf Eserleri', III. Cilt (2026)",
    "hatay-vakif-eserleri.pdf": "Vakıf Katılım, 'Hatay İli Vakıf Eserleri'",
    "konya-envanteri-1_cilt-web.pdf": "Vakıf Katılım, 'Konya Vakıf Eserleri', I. Cilt (2024)",
    "konya-envanteri-2_cilt-web.pdf": "Vakıf Katılım, 'Konya Vakıf Eserleri', II. Cilt (2024)",
}

# Resmî PDF'lerde otomatik sayfa çıkarımı iki kartta bir yaprak kaymış.
# Lead doğrulaması (27 Ekim 2026, PyMuPDF başlık eşleşmesi):
#   Konya I. Cilt PDF 138 (kitap s. 272-273) → Topraklık Hasan Efendi Camii
#   Konya I. Cilt PDF 151 (kitap s. 298-299) → Tatköy Merkez Camii
# Künye, kaynak PDF'teki gerçek başlık sayfasına göre elle düzeltilir.
SAYFA_DUZELTMESI = {
    "konya-topraklik-hasan-efendi-camii":
        "Vakıf Katılım, 'Konya Vakıf Eserleri', I. Cilt (2024), s. 272-273",
    "konya-tatkoy-merkez-camii":
        "Vakıf Katılım, 'Konya Vakıf Eserleri', I. Cilt (2024), s. 298-299",
}

TURLER = [("külliye", "Külliye"), ("cami", "Cami"), ("mescid", "Mescit"), ("mescit", "Mescit"),
          ("medrese", "Medrese"), ("darülhadis", "Medrese"), ("mektep", "Mektep"), ("mektebi", "Mektep"),
          ("türbe", "Türbe"), ("kümbet", "Türbe"), ("makam", "Türbe"), ("ziyaret", "Türbe"), ("mezar", "Türbe"),
          ("kervansaray", "Han"), ("hanı", "Han"), ("han ", "Han"), ("bedesten", "Çarşı"), ("çarşı", "Çarşı"),
          ("arasta", "Çarşı"), ("hamam", "Hamam"), ("kaplıca", "Hamam"), ("köprü", "Köprü"), ("çeşme", "Çeşme"),
          ("sebil", "Çeşme"), ("imaret", "İmaret"), ("darüşşifa", "Darüşşifa"), ("tekke", "Tekke"),
          ("zaviye", "Tekke"), ("dergâh", "Tekke"), ("dergah", "Tekke"), ("kilise", "Kilise"), ("minare", "Minare"),
          ("hazire", "Hazire"), ("kütüphane", "Kütüphane"), ("namazgâh", "Namazgâh")]


def tr_kucuk(m):
    return m.replace("I", "ı").replace("İ", "i").lower()


def tr_baslik(m):
    if m != m.upper():
        return m  # zaten karışık harfli
    kucukler = {"ve", "ile", "de", "da"}

    def k(s):
        s = tr_kucuk(s)
        if s in kucukler:
            return s
        on = re.match(r"^[^\wçğıöşüâîû]*", s).group(0)  # "(ertuğrul)" -> "(" + "Ertuğrul)"
        govde = s[len(on):]
        ilk = {"i": "İ", "ı": "I"}.get(govde[:1], govde[:1].upper())
        return on + ilk + govde[1:]
    return " ".join(k(s) for s in m.split())


def tur(ad):
    a = tr_kucuk(ad) + " "
    for anahtar, deger in TURLER:
        if anahtar in a:
            return deger
    return "Diğer"


def modul(ad, yol):
    spec = importlib.util.spec_from_file_location(ad, yol)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


TR_SOZ = re.compile(r"[çğışöüÇĞİŞÖÜ]|\b(ve|bir|ile|olarak|yer|yapı|tarafından|bulunmaktadır|edilmiştir|olan|için|bu)\b")


def temiz_paragraflar(ham):
    cikti = []
    for p in re.split(r"\n\s*\n", ham):
        p = re.sub(r"\*\*|__|^#+\s*|<br>|<sup>|</sup>", "", p.strip(), flags=re.M)
        p = re.sub(r"(?<!\w)_|_(?!\w)", "", p)
        p = re.sub(r"\s+", " ", p).strip()
        if len(p) < 60 or re.fullmatch(r"[\d\s/]+", p):
            continue
        if len(TR_SOZ.findall(p)) < max(2, len(p) // 120):
            continue  # İngilizce paragraf
        if p not in cikti:
            cikti.append(p)
    return cikti


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    em = modul("eser_metin", PROJE / "scripts" / "_eser_metin.py")
    gd = modul("gorsel_ders", PROJE / "scripts" / "gorsel-ders.py")
    klasor_ders = {}
    for eser_id, (klasor, _) in gd.ESLEME.items():
        klasor_ders.setdefault(klasor, eser_id)

    hatay_ilceleri = [f["properties"]["ad"] for f in json.load(
        open(PROJE / "src/features/harita/veri/ilceler.json", encoding="utf-8"))["features"] if f["properties"]["il"] == "hatay"]

    if CIKTI.exists():
        shutil.rmtree(CIKTI)
    (CIKTI / "metin").mkdir(parents=True)
    (CIKTI / "foto").mkdir(parents=True)

    eserler = [e for e in json.load(open(KAYNAK / "gorseller/eserler.json", encoding="utf-8"))
               if not e["ad"].startswith("_") and not e["klasor"].split("/")[1].startswith("_bolum")]
    liste, sayac = [], Counter()
    for e in eserler:
        aid = e["klasor"].replace("/", "-")
        # Kitap başlığında şehir adı geçince kimlik "bursa-bursa-…" olabiliyor;
        # tek öneke indir (dosya adları da buna göre üretilir).
        aid = re.sub(r"^(bursa|konya|hatay)-\1-", r"\1-", aid)
        _, ham = em.eser_metni(e["klasor"])
        paragraflar = temiz_paragraflar(ham)
        ilce = (e["ilce"] or "").strip() or None
        if e["il"] == "hatay" and not ilce:
            metin = " ".join(paragraflar)
            konumlar = [(metin.find(i), i) for i in hatay_ilceleri if metin.find(i) >= 0]
            ilce = min(konumlar)[1] if konumlar else None
        sayfalar = e["sayfalar"]
        kaynak = f"{KITAP[e['pdf']]}, s. {2 * sayfalar[0] - 2}-{2 * sayfalar[-1] - 1}"
        # Resmî PDF'te otomatik sayfa çıkarımı iki kartta bir yaprak kaymış.
        # Lead doğrulaması (27 Ekim 2026): başlık Konya I. Cilt PDF 138 →
        # s. 272-273; PDF 151 → s. 298-299. Künye elle düzeltilir.
        kaynak = SAYFA_DUZELTMESI.get(aid, kaynak)
        foto = False
        if e["gorseller"]:
            buyuk = [g for g in e["gorseller"] if min(g["px"]) >= 400] or e["gorseller"]
            yatay = [g for g in buyuk if g["px"][0] / g["px"][1] >= 1.2] or buyuk
            im = Image.open(KAYNAK / "gorseller" / e["klasor"] / yatay[0]["dosya"]).convert("RGB")
            im.thumbnail((640, 640))
            im.save(CIKTI / "foto" / f"{aid}.webp", "WEBP", quality=62, method=6)
            foto = True
        kayit = {"id": aid, "ad": tr_baslik(e["ad"]), "il": e["il"], "ilce": ilce, "tur": tur(e["ad"]),
                 "kaynak": kaynak, "foto": foto}
        # konya-konut tek eser değil: Konya II. Cilt s. 292-333'teki 42 sayfalık
        # "Konut" bölümü. Kart adı bunu söylesin (çocuk/veli yanılmasın).
        if aid == "konya-konut":
            kayit["ad"] = "Konut bölümü (42 sayfa)"
            kayit["tur"] = "Bölüm"
        # Bir kart tek derse bağlanabildiği için külliye kartlarında kardeş
        # dersleri ayrıca taşırız (arşiv sayfası "İlgili dersler" diye gösterir).
        if aid == "bursa-ii-murad-kulliyesi":
            kayit["ders"] = "bursa-ii-murad-kulliyesi"
            kayit["ilgiliDersler"] = [
                "bursa-muradiye-hamami-ii-murad-hamami-bekciyan-hamami",
                "bursa-muradiye-medresesi-cesmesi",
            ]
        elif aid == "bursa-yesil-celebi-mehmed-kulliyesi":
            kayit["ilgiliDersler"] = [
                "bursa-yesil-medrese-sultaniye-medresesi-bugun-bursa-tu",
                "bursa-yesil-turbe-celebi-sultan-mehmed-turbesi",
            ]
        elif aid == "bursa-emir-sultan-kulliyesi":
            kayit["ilgiliDersler"] = ["bursa-besir-aga-cesmesi"]
        if e["klasor"] in klasor_ders:
            kayit["ders"] = klasor_ders[e["klasor"]]
        liste.append(kayit)
        (CIKTI / "metin" / f"{aid}.json").write_text(
            json.dumps({"paragraflar": paragraflar}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        sayac[e["il"]] += 1

    (CIKTI / "liste.json").write_text(json.dumps(liste, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    boyut = sum(f.stat().st_size for f in CIKTI.rglob("*") if f.is_file())
    ilcesiz = [k["id"] for k in liste if not k["ilce"]]
    print(f"{len(liste)} eser {dict(sayac)}, {boyut // 1024 // 1024} MB; ilçesiz: {len(ilcesiz)} {ilcesiz[:8]}")
    print("tür dağılımı:", Counter(k["tur"] for k in liste).most_common())
    return 0


if __name__ == "__main__":
    sys.exit(main())
