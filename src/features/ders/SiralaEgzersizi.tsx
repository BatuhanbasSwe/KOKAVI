/**
 * 04 · GERİ ÇAĞIRMA — "Sırala" egzersizi.
 *
 * PDF: "Sırala" görev tipi (örn. vakfiyedeki harcama sırası).
 *
 * ETKİLEŞİM KARARI: Sürükleme YOK. Her satırda "Yukarı / Aşağı" düğmeleri var;
 * böylece işlem klavye ve ekran okuyucu ile de yapılabilir (WCAG 2.1.1).
 *
 * PDF: "Yanlış → ipucu + tekrar turu" — kontrol sonrası doğru yerdeki öğeler ✓,
 * yeri değişmesi gerekenler ! ile işaretlenir; sıralama sıfırlanmaz.
 */
import { useMemo, useState } from 'react';
import type { SiralaVerisi } from '@shared/types';
import {
  EgzersizKabugu,
  type EgzersizOrtakProps,
  type GeriBildirimVerisi,
} from './EgzersizKabugu';
import { karistirFarkli } from './yardimci';

export function SiralaEgzersizi({ veri, kaynak, onBitti }: EgzersizOrtakProps<SiralaVerisi>) {
  // Doğru sıra gizli kalır: arayüz karıştırılmış (ve çözülmemiş) sırayla başlar.
  const [sira, setSira] = useState(() => karistirFarkli(veri.dogruSira));
  const [kontrolEdildi, setKontrolEdildi] = useState(false);
  const [yanlisSayisi, setYanlisSayisi] = useState(0);
  const [hareketDuyurusu, setHareketDuyurusu] = useState('');
  const [geriBildirim, setGeriBildirim] = useState<GeriBildirimVerisi | null>(null);

  const cozuldu =
    sira.length === veri.dogruSira.length && sira.every((oge, i) => oge === veri.dogruSira[i]);

  function tasi(indeks: number, yon: -1 | 1) {
    const hedef = indeks + yon;
    if (hedef < 0 || hedef >= sira.length) {
      // Kenardaki düğme devre dışı bırakılmaz: odak kaybı olmasın diye
      // aria-disabled kullanılır ve durum metinle duyurulur.
      setHareketDuyurusu(
        yon === -1 ? 'Bu öğe zaten en üstte.' : 'Bu öğe zaten en altta.',
      );
      return;
    }

    const tasinan = sira[indeks];
    const yeni = [...sira];
    yeni[indeks] = sira[hedef];
    yeni[hedef] = tasinan;
    setSira(yeni);
    setHareketDuyurusu(`«${tasinan}» ${hedef + 1}. sıraya taşındı.`);
  }

  function kontrolEt() {
    if (cozuldu) {
      setGeriBildirim({
        tur: 'dogru',
        baslik: 'Sıralama doğru',
        metin: 'Öğeler zaten doğru sırada. Devam edebilirsin.',
      });
      return;
    }

    const yeniYanlis = yanlisSayisi + 1;
    setYanlisSayisi(yeniYanlis);
    setKontrolEdildi(true);

    const dogruYerde = sira.filter((oge, i) => oge === veri.dogruSira[i]).length;
    const ilkIpucu = veri.dogruSira[0];

    setGeriBildirim({
      tur: 'ipucu',
      baslik: `Henüz tam değil (${dogruYerde}/${sira.length} öğe doğru yerde)`,
      metin:
        '“✓ doğru yerde” yazanlara dokunma; “! yeri değişmeli” olanları Yukarı/Aşağı düğmeleriyle taşı.' +
        (yeniYanlis >= 2 && ilkIpucu ? ` İpucu: En üstte «${ilkIpucu}» olmalı.` : ''),
    });
  }

  // Sabit nesne: her çizimde yenisi üretilirse geri bildirim sesi tekrar tekrar çalar.
  const gosterilecekGeri: GeriBildirimVerisi | null = useMemo(
    () =>
      cozuldu
        ? {
            tur: 'dogru',
            baslik: 'Sıralama doğru!',
            metin: 'Öğeleri belgelenen sıraya göre dizdin.',
          }
        : geriBildirim,
    [cozuldu, geriBildirim],
  );

  return (
    <EgzersizKabugu
      tip="Sırala"
      yonerge={veri.yonerge}
      kaynak={kaynak}
      geriBildirim={gosterilecekGeri}
      onDevam={cozuldu ? onBitti : null}
      ekEylem={
        <button type="button" className="dugme dugme--ikincil" onClick={kontrolEt}>
          Sıralamayı kontrol et
        </button>
      }
    >
      <p className="metin-soluk">
        Yukarı/Aşağı düğmeleriyle öğeleri istediğin sıraya koy, sonra kontrol et.
      </p>

      <ol className="ders-sirala">
        {sira.map((oge, i) => {
          const dogruYerde = kontrolEdildi && oge === veri.dogruSira[i];
          const yanlisYerde = kontrolEdildi && !dogruYerde;

          return (
            <li className="ders-sirala__satir" key={oge}>
              <span className="ders-sirala__no" aria-hidden="true">
                {i + 1}
              </span>

              <span className="ders-sirala__metin">
                <span>{oge}</span>
                {dogruYerde ? (
                  <span className="ders-sirala__isaret ders-sirala__isaret--dogru">
                    <span aria-hidden="true">✓</span> doğru yerde
                  </span>
                ) : null}
                {yanlisYerde ? (
                  <span className="ders-sirala__isaret ders-sirala__isaret--ipucu">
                    <span aria-hidden="true">!</span> yeri değişmeli
                  </span>
                ) : null}
              </span>

              <span className="ders-sirala__dugmeler">
                <button
                  type="button"
                  className="dugme dugme--ikincil ders-sirala__dugme"
                  aria-disabled={i === 0}
                  aria-label={`«${oge}» öğesini yukarı taşı`}
                  onClick={() => tasi(i, -1)}
                >
                  <span aria-hidden="true">↑</span> Yukarı
                </button>
                <button
                  type="button"
                  className="dugme dugme--ikincil ders-sirala__dugme"
                  aria-disabled={i === sira.length - 1}
                  aria-label={`«${oge}» öğesini aşağı taşı`}
                  onClick={() => tasi(i, 1)}
                >
                  <span aria-hidden="true">↓</span> Aşağı
                </button>
              </span>
            </li>
          );
        })}
      </ol>

      {/* Sıra değişimini ekran okuyucuya duyurur. */}
      <p className="sr-only" role="status">
        {hareketDuyurusu}
      </p>
    </EgzersizKabugu>
  );
}
