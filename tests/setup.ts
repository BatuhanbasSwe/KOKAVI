import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom localStorage sağlar; yalnızca eksik ya da bozuksa basit bir vekil koy.
// Node 25+ kendi localStorage'ını global açar; --localstorage-file verilmezse
// metotsuz boş bir nesnedir ve jsdom'unkini gölgeler.
if (typeof globalThis.localStorage?.clear !== 'function') {
  const depo = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => depo.get(k) ?? null,
      setItem: (k: string, v: string) => void depo.set(k, v),
      removeItem: (k: string) => void depo.delete(k),
      clear: () => depo.clear(),
      key: (i: number) => [...depo.keys()][i] ?? null,
      get length() {
        return depo.size;
      },
    },
    configurable: true,
  });
}

// maplibre-gl jsdom'da WebGL ister; testlerde modülü taklit et.
vi.mock('maplibre-gl', () => ({
  Map: class {
    on() {}
    remove() {}
  },
  Marker: class {
    setLngLat() {
      return this;
    }
    setPopup() {
      return this;
    }
    addTo() {
      return this;
    }
    getElement() {
      return document.createElement('div');
    }
  },
  Popup: class {
    setHTML() {
      return this;
    }
  },
}));
