/**
 * Kutlama konfetisi — ders sonu, ünite sonu.
 *
 * Yalnızca süs: `aria-hidden`, tıklanamaz (pointer-events: none). Renkler tema
 * jetonlarından gelir. "Hareketi azalt" ayarında hiç gösterilmez (app.css).
 * Parçaların konumu her açılışta bir kez üretilir; yeniden çizimde değişmez.
 */
import { useMemo } from 'react';

const RENKLER = ['var(--vurgu)', 'var(--ikincil)', 'var(--odul)', 'var(--seri-4)', 'var(--hata)', 'var(--seri-6)'];

export function Konfeti({ adet = 42 }: { adet?: number }) {
  const parcalar = useMemo(
    () =>
      Array.from({ length: adet }, (_, i) => ({
        sol: Math.random() * 100,
        gecikme: Math.random() * 0.6,
        sure: 1.6 + Math.random() * 1.4,
        donus: Math.round(Math.random() * 720 - 360),
        kayma: Math.round(Math.random() * 120 - 60),
        renk: RENKLER[i % RENKLER.length]!,
        bicim: i % 3,
      })),
    [adet],
  );

  return (
    <div className="konfeti" aria-hidden="true">
      {parcalar.map((p, i) => (
        <span
          key={i}
          className={`konfeti__parca konfeti__parca--${p.bicim}`}
          style={{
            left: `${p.sol}%`,
            background: p.renk,
            animationDelay: `${p.gecikme}s`,
            animationDuration: `${p.sure}s`,
            ['--donus' as string]: `${p.donus}deg`,
            ['--kayma' as string]: `${p.kayma}px`,
          }}
        />
      ))}
    </div>
  );
}
