import { create } from 'zustand';
import type { Language } from '../domain/types';
import type { Bp3dManifest, Bp3dPart } from '../atlas/manifest';
import { BP3D_SYSTEMS, LITE_SYSTEMS } from '../atlas/systems';
import { buildHash, parseHash } from './deepLink';
import { buildIndex, resolve, type AtlasIndex, type Selection } from '../atlas/selection';

interface AtlasState {
  lang: Language;
  manifest: Bp3dManifest | null;
  selected: string | null;
  /** Systems the reader has asked to see. Geometry streams in per system. */
  shown: ReadonlySet<string>;
  loading: ReadonlySet<string>;
  isolate: boolean;
  xray: number;
  spin: boolean;
  bookmarks: ReadonlySet<string>;
  ready: boolean;

  index: AtlasIndex | null;
  partById(id: string): Bp3dPart | undefined;
  selection(): Selection | null;

  setManifest(manifest: Bp3dManifest): void;
  setLang(lang: Language): void;
  select(id: string | null): void;
  setSystemShown(system: string, shown: boolean): void;
  setLoading(system: string, loading: boolean): void;
  setIsolate(on: boolean): void;
  setXray(value: number): void;
  setSpin(on: boolean): void;
  toggleBookmark(id: string): void;
  setBookmarks(ids: readonly string[]): void;
  setReady(ready: boolean): void;
  syncFromHash(hash: string): void;
}

const ALL_SYSTEMS = new Set(BP3D_SYSTEMS.map((s) => s.id));

export const useAtlas = create<AtlasState>((set, get) => ({
  lang: 'en',
  manifest: null,
  index: null,
  selected: null,
  // A first visit shows a recognisable body; the vascular trees alone are
  // over a thousand structures and stream only when asked for.
  shown: new Set(LITE_SYSTEMS),
  loading: new Set<string>(),
  isolate: false,
  xray: 0,
  spin: false,
  bookmarks: new Set<string>(),
  ready: false,

  partById(id) {
    return get().index?.parts.get(id);
  },

  selection() {
    const { index, selected } = get();
    return index && selected ? resolve(index, selected) : null;
  },

  setManifest: (manifest) => set({ manifest, index: buildIndex(manifest) }),

  setLang(lang) {
    set({ lang });
    writeHash({ ...get(), lang });
  },

  select(id) {
    set({ selected: id });
    writeHash({ ...get(), selected: id });
  },

  setSystemShown(system, shown) {
    const next = new Set(get().shown);
    if (shown) next.add(system);
    else next.delete(system);
    set({ shown: next });
    writeHash({ ...get(), shown: next });
  },

  setLoading(system, loading) {
    const next = new Set(get().loading);
    if (loading) next.add(system);
    else next.delete(system);
    set({ loading: next });
  },

  setIsolate: (on) => set({ isolate: on }),
  setXray: (value) => set({ xray: Math.min(1, Math.max(0, value)) }),
  setSpin: (on) => set({ spin: on }),

  toggleBookmark(id) {
    const bookmarks = new Set(get().bookmarks);
    if (bookmarks.has(id)) bookmarks.delete(id);
    else bookmarks.add(id);
    set({ bookmarks });
  },

  setBookmarks: (ids) => set({ bookmarks: new Set(ids) }),
  setReady: (ready) => set({ ready }),

  syncFromHash(hash) {
    const route = parseHash(hash);
    const patch: Partial<AtlasState> = {};
    if (route.lang) patch.lang = route.lang;
    if (route.structure) patch.selected = route.structure;
    if (route.systems) {
      patch.shown = new Set(route.systems.filter((s) => ALL_SYSTEMS.has(s)));
    }
    set(patch);
  },
}));

/**
 * Mirror state into the URL so any view can be pasted into a class group.
 * replaceState rather than pushState: toggling a system should not fill the
 * back button with steps a reader has to press through.
 */
function writeHash(state: Pick<AtlasState, 'lang' | 'selected' | 'shown'>): void {
  const shown = [...state.shown];
  const isDefault =
    shown.length === LITE_SYSTEMS.length && LITE_SYSTEMS.every((s) => state.shown.has(s));
  history.replaceState(null, '', buildHash({
    structure: state.selected,
    lang: state.lang,
    systems: isDefault ? null : shown,
  }));
}
