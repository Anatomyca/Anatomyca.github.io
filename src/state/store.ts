import { create } from 'zustand';
import type { Language } from '../domain/types';
import type { Bp3dManifest, Bp3dPart } from '../atlas/manifest';
import { BP3D_SYSTEMS, LITE_SYSTEMS } from '../atlas/systems';
import { buildHash, parseHash } from './deepLink';
import type { CameraCommand } from '../atlas/camera';
import { buildIndex, resolve, type AtlasIndex, type Selection } from '../atlas/selection';
import type { StudyCatalogue, StudyModel } from '../atlas/studyModels';

interface AtlasState {
  lang: Language;
  manifest: Bp3dManifest | null;
  /** Anatomist-reviewed models shown instead of the whole body. */
  studyCatalogue: StudyCatalogue | null;
  studyModel: StudyModel | null;
  selected: string | null;
  /** Systems the reader has asked to see. Geometry streams in per system. */
  shown: ReadonlySet<string>;
  loading: ReadonlySet<string>;
  isolate: boolean;
  reveal: boolean;
  xray: number;
  spin: boolean;
  bookmarks: ReadonlySet<string>;
  ready: boolean;
  /** Set when the atlas cannot load at all, so the boot screen can say so. */
  loadError: string | null;

  index: AtlasIndex | null;
  partById(id: string): Bp3dPart | undefined;
  selection(): Selection | null;

  setManifest(manifest: Bp3dManifest): void;
  setStudyCatalogue(catalogue: StudyCatalogue): void;
  setStudyModel(model: StudyModel | null): void;
  setLang(lang: Language): void;
  /** `focus` moves the camera. Set it for search and link opens, not taps. */
  select(id: string | null, options?: { focus?: boolean }): void;
  /** Bumped when a selection asks the camera to move. */
  focusRequest: number;
  /**
   * Camera commands travel as a nonce rather than as a call, because the
   * scene lives behind a ref in the viewport and the buttons that drive it
   * are in other panes. Same shape as focusRequest, one step along.
   */
  camera: { kind: CameraCommand; nonce: number } | null;
  runCamera: (kind: CameraCommand) => void;
  setSystemShown(system: string, shown: boolean): void;
  setLoading(system: string, loading: boolean): void;
  setIsolate(on: boolean): void;
  setReveal(on: boolean): void;
  setXray(value: number): void;
  setSpin(on: boolean): void;
  toggleBookmark(id: string): void;
  setBookmarks(ids: readonly string[]): void;
  setReady(ready: boolean): void;
  setLoadError(message: string | null): void;
  syncFromHash(hash: string): void;
}

const ALL_SYSTEMS = new Set(BP3D_SYSTEMS.map((s) => s.id));

export const useAtlas = create<AtlasState>((set, get) => ({
  lang: 'en',
  manifest: null,
  index: null,
  studyCatalogue: null,
  studyModel: null,
  selected: null,
  // A first visit shows a recognisable body; the vascular trees alone are
  // over a thousand structures and stream only when asked for.
  shown: new Set(LITE_SYSTEMS),
  loading: new Set<string>(),
  isolate: false,
  reveal: true,
  xray: 0,
  spin: false,
  focusRequest: 0,
  camera: null,
  runCamera: (kind) => set((state) => ({
    camera: { kind, nonce: (state.camera?.nonce ?? 0) + 1 },
  })),
  bookmarks: new Set<string>(),
  ready: false,
  loadError: null,

  partById(id) {
    return get().index?.parts.get(id);
  },

  selection() {
    const { index, selected } = get();
    return index && selected ? resolve(index, selected) : null;
  },

  setManifest: (manifest) => set({ manifest, index: buildIndex(manifest) }),
  setStudyCatalogue: (studyCatalogue) => set({ studyCatalogue }),

  setStudyModel(model) {
    // Switching bodies invalidates the selection: a structure in one is not
    // a structure in the other.
    set({ studyModel: model, selected: null });
    history.replaceState(null, '', buildHash({ lang: get().lang }));
  },

  setLang(lang) {
    set({ lang });
    writeHash({ ...get(), lang });
  },

  select(id, options) {
    const { index, shown } = get();

    // A selection the reader cannot see is worse than no selection: the
    // detail panel would describe an organ that is not on screen. So the
    // system holding the structure is switched on here, which makes the
    // viewport fetch it if it has not been downloaded yet.
    //
    // Only that one system, deliberately. A concept reaches into every
    // system its elements belong to — the heart takes in coronary arteries,
    // cardiac veins and some muscle — and fetching all of them would put
    // 18 MB and several seconds of geometry building between a reader and
    // the organ they asked for. The system that holds the organ proper is
    // what makes it visible; the rest stay one tap away in the rail.
    let nextShown = shown;
    if (id && index) {
      const selection = resolve(index, id);
      if (selection && !shown.has(selection.system)) {
        nextShown = new Set([...shown, selection.system]);
      }
    }

    set({
      selected: id,
      shown: nextShown,
      ...(options?.focus ? { focusRequest: get().focusRequest + 1 } : {}),
    });
    writeHash({ ...get(), selected: id, shown: nextShown });
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
  setReveal: (on) => set({ reveal: on }),
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
  setLoadError: (loadError) => set({ loadError }),

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
