/**
 * Everything outside the canvas: the systems rail, search, the detail
 * panel (a bottom sheet on phones), the dials and the keyboard map.
 */
import { PARTS, PART_BY_ID } from './data.js';
import { SYSTEMS, SYSTEM_BY_ID, DEFAULT_ON } from './config.js';
import { t, pick, setLang, getLang, LANGS } from './i18n.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const isPhone = () => matchMedia('(max-width: 860px)').matches;

export function createUI(viewer) {
  const ui = {};
  const partCount = {};
  for (const p of PARTS) partCount[p.sys] = (partCount[p.sys] || 0) + 1;

  /* ── systems rail + mobile chips ──────────────────────────── */
  const railNodes = new Map();
  const chipNodes = new Map();

  function buildSystems() {
    const rail = $('systems');
    const chips = $('chips');
    rail.replaceChildren();
    chips.replaceChildren();
    railNodes.clear();
    chipNodes.clear();

    for (const sys of SYSTEMS) {
      const on = viewer.isSystemVisible(sys.id);

      const btn = el('button', 'sys');
      btn.style.setProperty('--c', sys.color);
      btn.append(el('span', 'sys__dot'), el('span', 'sys__name', pick(sys.name)), el('span', 'sys__count', String(partCount[sys.id] || 0)));
      btn.dataset.off = String(!on);
      btn.setAttribute('aria-pressed', String(on));
      btn.addEventListener('click', () => toggleSystem(sys.id));
      rail.append(btn);
      railNodes.set(sys.id, btn);

      const chip = el('button', 'chip');
      chip.style.setProperty('--c', sys.color);
      chip.append(el('i'), el('span', null, pick(sys.name)));
      chip.dataset.off = String(!on);
      chip.addEventListener('click', () => toggleSystem(sys.id));
      chips.append(chip);
      chipNodes.set(sys.id, chip);
    }
  }

  function toggleSystem(id) {
    const on = !viewer.isSystemVisible(id);
    viewer.setSystemVisible(id, on);
    syncSystems();
  }

  function syncSystems() {
    for (const sys of SYSTEMS) {
      const on = viewer.isSystemVisible(sys.id);
      const b = railNodes.get(sys.id);
      if (b) { b.dataset.off = String(!on); b.setAttribute('aria-pressed', String(on)); }
      const c = chipNodes.get(sys.id);
      if (c) c.dataset.off = String(!on);
    }
  }
  ui.syncSystems = syncSystems;

  /* ── detail panel ─────────────────────────────────────────── */
  const card = $('partCard');
  const emptyBox = $('detailEmpty');

  function renderPart(id) {
    const p = PART_BY_ID[id];
    if (!p) {
      card.hidden = true;
      emptyBox.hidden = false;
      $('crumb').hidden = true;
      return;
    }
    const sys = SYSTEM_BY_ID[p.sys];
    emptyBox.hidden = true;
    card.hidden = false;
    card.replaceChildren();
    card.style.setProperty('--c', sys.color);

    const tag = el('span', 'part__system');
    tag.append(el('i'), el('span', null, pick(sys.name)));
    card.append(tag);

    card.append(el('h2', 'part__name', pick(p.name)));
    if (p.latin) card.append(el('p', 'part__latin', p.latin));

    const alt = el('div', 'part__alt');
    for (const [code, label] of [['en', 'English'], ['si', 'සිංහල'], ['ta', 'தமிழ்']]) {
      if (!p.name[code]) continue;
      const row = el('div');
      const lab = el('span', null, label);
      const val = el('p', null, p.name[code]);
      val.lang = code;
      row.append(lab, val);
      alt.append(row);
    }
    card.append(alt);

    card.append(el('p', 'part__blurb', p.blurb));

    if (p.jobs?.length) {
      card.append(el('h3', null, t('jobs')));
      const ul = el('ul', 'jobs');
      for (const j of p.jobs) ul.append(el('li', null, j));
      card.append(ul);
    }

    if (p.lk) {
      const note = el('p', 'note');
      note.append(el('b', null, t('lk') + ' — '), document.createTextNode(p.lk));
      card.append(note);
    }

    const acts = el('div', 'part__acts');
    const zoom = el('button', 'pill', t('focus'));
    zoom.addEventListener('click', () => viewer.focus(p.id));
    const solo = el('button', 'pill', viewer.getIsolate() ? t('showAll') : t('hideRest'));
    solo.addEventListener('click', () => {
      const next = !viewer.getIsolate();
      viewer.setIsolate(next);
      $('isolateBtn').setAttribute('aria-pressed', String(next));
      solo.textContent = next ? t('showAll') : t('hideRest');
    });
    acts.append(zoom, solo);
    card.append(acts);

    if (p.near?.length) {
      const box = el('div', 'neighbours');
      box.append(el('h3', null, t('nearby')));
      const list = el('div', 'neighbours__list');
      for (const nid of p.near) {
        const np = PART_BY_ID[nid];
        if (!np) continue;
        const b = el('button', null, pick(np.name));
        b.addEventListener('click', () => viewer.select(nid, { focus: false }));
        list.append(b);
      }
      box.append(list);
      card.append(box);
    }

    const crumb = $('crumb');
    crumb.replaceChildren();
    const name = el('b', null, pick(p.name));
    const clear = el('button', null, '×');
    clear.title = t('clear');
    clear.addEventListener('click', () => viewer.select(null));
    crumb.append(el('span', null, pick(sys.name)), name, clear);
    crumb.hidden = false;

    $('detailScroll').scrollTop = 0;
  }
  ui.renderPart = renderPart;

  /* ── search ───────────────────────────────────────────────── */
  const input = $('searchInput');
  const results = $('searchResults');
  let cursor = -1;
  let matches = [];

  function score(p, q) {
    const fields = [p.name.en, p.name.si, p.name.ta, p.latin || '', pick(SYSTEM_BY_ID[p.sys].name)];
    let best = -1;
    fields.forEach((f, i) => {
      const s = f.toLowerCase().indexOf(q);
      if (s === -1) return;
      const v = 100 - s - i * 3;
      if (v > best) best = v;
    });
    return best;
  }

  function runSearch() {
    const q = input.value.trim().toLowerCase();
    if (!q) return closeSearch();
    matches = PARTS.map((p) => ({ p, s: score(p, q) })).filter((m) => m.s >= 0)
      .sort((a, b) => b.s - a.s).slice(0, 8).map((m) => m.p);

    results.replaceChildren();
    if (!matches.length) {
      results.append(el('li', 'search__none', t('noMatch')));
    } else {
      matches.forEach((p, i) => {
        const li = el('li');
        li.setAttribute('role', 'option');
        li.append(el('b', null, pick(p.name)), el('small', null, pick(SYSTEM_BY_ID[p.sys].name)));
        li.addEventListener('mousedown', (e) => { e.preventDefault(); choose(i); });
        results.append(li);
      });
    }
    cursor = -1;
    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function markCursor() {
    [...results.children].forEach((li, i) => li.setAttribute('aria-selected', String(i === cursor)));
  }

  function choose(i) {
    const p = matches[i];
    if (!p) return;
    viewer.select(p.id, { focus: true });
    closeSearch();
    input.blur();
  }

  function closeSearch() {
    results.hidden = true;
    results.replaceChildren();
    input.setAttribute('aria-expanded', 'false');
    cursor = -1;
  }

  input.addEventListener('input', runSearch);
  input.addEventListener('focus', () => { if (input.value) runSearch(); });
  input.addEventListener('blur', () => setTimeout(closeSearch, 120));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!matches.length) return;
      cursor = (cursor + (e.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length;
      markCursor();
    } else if (e.key === 'Enter') {
      choose(cursor === -1 ? 0 : cursor);
    } else if (e.key === 'Escape') {
      closeSearch();
      input.blur();
    }
  });

  /* ── dials, views, pills ──────────────────────────────────── */
  $('xray').addEventListener('input', (e) => viewer.setXray(e.target.value / 100));
  const cut = $('cut');
  const cutAxis = $('cutAxis');
  const applyCut = () => viewer.setClip(cutAxis.value, cut.value / 100);
  cut.addEventListener('input', applyCut);
  cutAxis.addEventListener('change', applyCut);

  $('views').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-view]');
    if (!b) return;
    viewer.setView(b.dataset.view);
    [...$('views').children].forEach((c) => c.classList.toggle('is-on', c === b));
  });

  $('isolateBtn').addEventListener('click', (e) => {
    const next = !viewer.getIsolate();
    viewer.setIsolate(next);
    e.currentTarget.setAttribute('aria-pressed', String(next));
    if (viewer.getSelected()) renderPart(viewer.getSelected());
  });

  $('spinBtn').addEventListener('click', (e) => {
    const next = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    viewer.setSpin(next);
    e.currentTarget.setAttribute('aria-pressed', String(next));
  });

  $('homeBtn').addEventListener('click', () => {
    viewer.select(null);
    viewer.resetView();
  });

  /* ── bottom sheet (phones) ────────────────────────────────── */
  function openSheet(open) {
    if (!isPhone()) return;
    document.body.dataset.sheet = open ? 'open' : 'shut';
  }
  ui.openSheet = openSheet;

  let dragFrom = null;
  let swallowClick = false;

  $('sheetGrab').addEventListener('click', () => {
    if (swallowClick) { swallowClick = false; return; }
    openSheet(document.body.dataset.sheet !== 'open');
  });
  $('sheetGrab').addEventListener('pointerdown', (e) => { dragFrom = e.clientY; });
  addEventListener('pointerup', (e) => {
    if (dragFrom == null) return;
    const dy = e.clientY - dragFrom;
    dragFrom = null;
    if (Math.abs(dy) > 24) { swallowClick = true; openSheet(dy < 0); }
  });

  /* ── theme ────────────────────────────────────────────────── */
  function applyTheme(mode) {
    document.documentElement.dataset.theme = mode;
    localStorage.setItem('atlas.theme', mode);
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--ink-900');
    viewer.setBackground(bg || '#0b131b');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = bg.trim();
  }
  ui.applyTheme = applyTheme;
  $('themeBtn').addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  /* ── language ─────────────────────────────────────────────── */
  function applyLang(code) {
    setLang(code);
    localStorage.setItem('atlas.lang', code);
    [...$('langSeg').children].forEach((b) => b.classList.toggle('is-on', b.dataset.lang === code));

    input.placeholder = t('search');
    input.setAttribute('aria-label', t('search'));
    $('lblXray').textContent = t('xray');
    $('lblCut').textContent = t('cut');
    cutAxis.options[0].textContent = t('cutZ');
    cutAxis.options[1].textContent = t('cutX');
    cutAxis.options[2].textContent = t('cutY');
    $('isolateBtn').textContent = t('isolate');
    $('spinBtn').textContent = t('spin');
    $('quizBtn').textContent = t('quiz');
    $('quizExit').textContent = t('quizExit');
    const hint = $('bootHint');
    if (hint) hint.textContent = t('buildingBody');
    const views = { front: 'front', back: 'back', left: 'left', right: 'right', top: 'top' };
    [...$('views').children].forEach((b) => { b.textContent = t(views[b.dataset.view]); });
    emptyBox.querySelector('h2').textContent = t('emptyTitle');
    emptyBox.querySelector('p').textContent = t('emptyBody');

    buildSystems();
    const sel = viewer.getSelected();
    if (sel) renderPart(sel);
  }
  ui.applyLang = applyLang;

  $('langSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-lang]');
    if (b) applyLang(b.dataset.lang);
  });

  /* ── the floating label ───────────────────────────────────── */
  const pin = $('pin');
  const pinText = $('pinText');
  let pinId = null;

  function setPin(id) {
    pinId = id;
    if (!id) { pin.hidden = true; return; }
    pinText.textContent = pick(PART_BY_ID[id].name);
    pin.hidden = false;
    movePin();
  }
  function movePin() {
    if (!pinId) return;
    const p = viewer.screenPos(pinId);
    if (!p) { pin.hidden = true; return; }
    pin.hidden = false;
    pin.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -140%)`;
  }
  ui.setPin = setPin;
  ui.movePin = movePin;

  /* ── help ─────────────────────────────────────────────────── */
  const dlg = $('helpDlg');
  $('helpBtn').addEventListener('click', () => dlg.showModal());
  $('helpClose').addEventListener('click', () => dlg.close());
  $('helpFine').textContent =
    'Shapes are modelled for teaching, not for diagnosis or surgical planning. Sinhala and Tamil names follow standard usage — have a teacher check them before exam use.';

  /* ── keyboard ─────────────────────────────────────────────── */
  addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
    if (e.key === '/' && !typing) { e.preventDefault(); input.focus(); input.select(); return; }
    if (typing) return;
    if (e.key === 'Escape') { viewer.select(null); return; }
    const views = ['front', 'back', 'left', 'right', 'top'];
    if (/^[1-5]$/.test(e.key)) { viewer.setView(views[+e.key - 1]); return; }
    if (e.key.toLowerCase() === 'x') {
      const next = !viewer.getIsolate();
      viewer.setIsolate(next);
      $('isolateBtn').setAttribute('aria-pressed', String(next));
    }
  });

  /* ── boot state ───────────────────────────────────────────── */
  ui.start = () => {
    for (const sys of SYSTEMS) viewer.setSystemVisible(sys.id, DEFAULT_ON.includes(sys.id));
    applyLang(localStorage.getItem('atlas.lang') || guessLang());
    applyTheme(localStorage.getItem('atlas.theme') || 'dark');
    syncSystems();
  };

  return ui;
}

function guessLang() {
  const l = (navigator.language || 'en').slice(0, 2);
  return LANGS.includes(l) ? l : 'en';
}
