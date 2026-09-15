import { create } from 'zustand';
import type { Language, Structure } from '../domain/types';
import { SEED_STRUCTURES, SYSTEMS } from '../data/structures';
import { buildHash, parseHash } from './deepLink';

interface AtlasState {
  lang: Language;
  selected: string | null;
  hidden: ReadonlySet<string>;
  isolate: boolean;
  xray: number;
  clip: { axis: 'x' | 'y' | 'z'; amount: number };
  spin: boolean;
  gradeAOnly: boolean;
  bookmarks: ReadonlySet<string>;
  ready: boolean;

  byId(id: string): Structure | undefined;
  visibleStructures(): readonly Structure[];

  setLang(lang: Language): void;
  select(id: string | null): void;
  toggleSystem(system: string, on: boolean): void;
  setIsolate(on: boolean): void;
  setXray(value: number): void;
  setClip(axis: 'x' | 'y' | 'z', amount: number): void;
  setSpin(on: boolean): void;
  setGradeAOnly(on: boolean): void;
  toggleBookmark(id: string): void;
  setBookmarks(ids: readonly string[]): void;
  setReady(ready: boolean): void;
  syncFromHash(hash: string): void;
}

const INDEX = new Map(SEED_STRUCTURES.map((s) => [s.id, s]));

/** Systems outside the Lite set start hidden, so a first visit stays small. */
const INITIALLY_HIDDEN = new Set(SYSTEMS.filter((s) => !s.inLite && s.id === 'none').map((s) => s.id));

export const useAtlas = create<AtlasState>((set, get) => ({
  lang: 'en',
  selected: null,
  hidden: INITIALLY_HIDDEN,
  isolate: false,
  xray: 0,
  clip: { axis: 'z', amount: 0 },
  spin: false,
  gradeAOnly: false,
  bookmarks: new Set<string>(),
  ready: false,

  byId: (id) => INDEX.get(id),

  visibleStructures() {
    const { hidden, gradeAOnly } = get();
    return SEED_STRUCTURES.filter(
      (s) => !hidden.has(s.system) && (!gradeAOnly || s.grade === 'A'),
    );
  },

  setLang(lang) {
    set({ lang });
    writeHash({ ...get(), lang });
  },

  select(id) {
    set({ selected: id });
    writeHash({ ...get(), selected: id });
  },

  toggleSystem(system, on) {
    const hidden = new Set(get().hidden);
    if (on) hidden.delete(system);
    else hidden.add(system);
    set({ hidden });
    writeHash({ ...get(), hidden });
  },

  setIsolate: (on) => set({ isolate: on }),
  setXray: (value) => set({ xray: Math.min(1, Math.max(0, value)) }),
  setClip: (axis, amount) => set({ clip: { axis, amount } }),
  setSpin: (on) => set({ spin: on }),
  setGradeAOnly: (on) => set({ gradeAOnly: on }),

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
    if (route.structure && INDEX.has(route.structure)) patch.selected = route.structure;
    if (route.systems) {
      const shown = new Set(route.systems);
      patch.hidden = new Set(SYSTEMS.filter((s) => !shown.has(s.id)).map((s) => s.id));
    }
    set(patch);
  },
}));

/**
 * Mirror state into the URL so any view can be pasted into a class group.
 * replaceState rather than pushState: turning a system on and off should not
 * fill the back button with steps a student has to press through.
 */
function writeHash(state: Pick<AtlasState, 'lang' | 'selected' | 'hidden'>): void {
  const shown = SYSTEMS.filter((s) => !state.hidden.has(s.id)).map((s) => s.id);
  const hash = buildHash({
    structure: state.selected,
    lang: state.lang,
    systems: shown.length === SYSTEMS.length ? null : shown,
  });
  history.replaceState(null, '', hash);
}
