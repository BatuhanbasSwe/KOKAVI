"""Bir eserin PDF metnini başlığından bir sonraki eserin başlığına kadar keser.

scripts/arsiv-hazirla.py kullanır. Kaynak: kaynak/md/*.md ve kaynak/gorseller/eserler.json.
Bazı eserler PDF'te aynı sayfayı paylaştığı için sayfa bazlı kesim komşu eserin
metnini de alır; burada eser adının geçtiği yerden sonraki eserin adına kadar kesilir.
"""
import json
import re
from pathlib import Path

PROJE = Path(__file__).resolve().parent.parent
eserler = json.load(open(PROJE / "kaynak/gorseller/eserler.json", encoding="utf-8"))
md_cache = {}


def sayfalar(pdf):
    if pdf not in md_cache:
        t = (PROJE / "kaynak/md" / (pdf[:-4] + ".md")).read_text(encoding="utf-8")
        md_cache[pdf] = re.split(r"<!-- sayfa \d+ -->", t)[1:]
    return md_cache[pdf]


def duz(s):
    """Karşılaştırma için biçim işaretlerini ve boşlukları at."""
    return re.sub(r"[\s*#_]+", "", s).casefold()


def kes(metin, ad, bas=True):
    """metin içinde ad'ın (boşluk/işaret farkına dayanıklı) ilk geçtiği konum."""
    hedef = duz(ad)[:25]
    ham = ""
    idx = []
    for i, ch in enumerate(metin):
        if not re.match(r"[\s*#_]", ch):
            ham += ch.casefold()
            idx.append(i)
    k = ham.find(hedef) if hedef else -1
    return idx[k] if 0 <= k < len(idx) else (0 if bas else len(metin))


def eser_metni(klasor):
    sirali = [e for e in eserler if e["sayfalar"]]
    e = next(x for x in sirali if x["klasor"] == klasor)
    ayni_pdf = [x for x in sirali if x["pdf"] == e["pdf"] and not x["ad"].startswith("_")]
    sonraki = None
    for i, x in enumerate(ayni_pdf):
        if x is e and i + 1 < len(ayni_pdf):
            sonraki = ayni_pdf[i + 1]
    ilk = e["sayfalar"][0]
    son = sonraki["sayfalar"][0] if sonraki else e["sayfalar"][-1]
    s = sayfalar(e["pdf"])
    metin = "\n\n".join(s[ilk - 1: son])
    bas = kes(metin, e["ad"])
    bit = kes(metin[bas + 10:], sonraki["ad"], bas=False) + bas + 10 if sonraki else len(metin)
    return e, metin[bas:bit]
