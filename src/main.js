import { createViewer } from './viewer.js';
import { createUI } from './ui.js';
import { createQuiz } from './quiz.js';
import { PART_BY_ID } from './data.js';

const $ = (id) => document.getElementById(id);

const viewer = createViewer($('scene'));
const ui = createUI(viewer);
const quiz = createQuiz(viewer, ui);

ui.start();

/* ── selection flows through here ───────────────────────────── */
viewer.onSelect = (id) => {
  if (quiz.active) { quiz.answer(id); return; }
  ui.renderPart(id);
  ui.setPin(id);
  if (id) {
    ui.openSheet(true);
    history.replaceState(null, '', `#${id}`);
  } else {
    ui.openSheet(false);
    history.replaceState(null, '', location.pathname + location.search);
  }
};

viewer.onHover = (id) => {
  if (quiz.active || viewer.getSelected()) return;
  ui.setPin(id);
};

viewer.onFrame = () => ui.movePin();

addEventListener('hashchange', () => {
  const id = location.hash.slice(1);
  if (PART_BY_ID[id] && id !== viewer.getSelected()) viewer.select(id, { focus: true });
});

/* ── build the body, then reveal it ─────────────────────────── */
const bar = $('bootBar');
const boot = $('boot');

viewer.build((done) => { bar.style.width = `${Math.round(done * 100)}%`; }).then(() => {
  $('app').hidden = false;
  boot.classList.add('boot--gone');
  setTimeout(() => boot.remove(), 600);

  viewer.camera.position.set(0.85, 1.32, 3.7);
  viewer.resetView();

  const id = location.hash.slice(1);
  if (PART_BY_ID[id]) setTimeout(() => viewer.select(id, { focus: true }), 500);

  viewer.loadModels();
});

/* ── offline support ────────────────────────────────────────── */
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
