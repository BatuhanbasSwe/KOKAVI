/**
 * Kâşif Defteri iç sekmeleri: WAI-ARIA tablist, ok tuşlarıyla geçiş,
 * `#/defter?sekme=…` ile doğrudan açılış; axe ihlali yok.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';

beforeEach(() => {
  cleanup();
  localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (u: RequestInfo | URL) => {
      if (String(u).includes('/api/auth/ben')) return new Response('{}', { status: 401 });
      return new Response(JSON.stringify(String(u).includes('/api/yol') ? { sehirler: [] } : []), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
});

async function ac(hash: string) {
  window.location.hash = hash;
  const { App } = await import('../src/app/App');
  const { container } = render(<App />);
  await screen.findByRole('heading', { level: 1, name: 'Kâşif Defteri' });
  return container;
}

describe('Defter sekmeleri', () => {
  it('dört sekme; açılışta Pullar seçili; ok tuşu sonrakine geçer ve adresi günceller', async () => {
    await ac('#/defter');
    const sekmeler = screen.getAllByRole('tab');
    expect(sekmeler.map((s) => s.textContent)).toEqual(['Pullar', 'Rozetler', 'Seri', 'Belgeler']);
    expect(sekmeler[0]).toHaveAttribute('aria-selected', 'true');
    expect(sekmeler[1]).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(sekmeler[0]!, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Rozetler' })).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Rozetler' }));
    expect(window.location.hash).toBe('#/defter?sekme=rozetler');
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Rozetler');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Rozetler' }), { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Belgeler' })).toHaveAttribute('aria-selected', 'true');
  });

  it('bağlantıdan doğrudan Seri sekmesi açılır; ihlalsiz', async () => {
    const container = await ac('#/defter?sekme=seri');
    expect(screen.getByRole('tab', { name: 'Seri' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { level: 2, name: /günlük seri/ })).toBeTruthy();
    const s = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(s.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 100)}`)).toEqual([]);
  });
});
