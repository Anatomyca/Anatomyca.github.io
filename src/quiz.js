/**
 * Quiz mode. Same model, same picking — the atlas just stops telling you
 * what things are and starts asking.
 */
import { PARTS, PART_BY_ID } from './data.js';
import { t, pick } from './i18n.js';

const ROUNDS = 8;
const $ = (id) => document.getElementById(id);

export function createQuiz(viewer, ui) {
  const box = $('quiz');
  const prompt = $('quizPrompt');
  const scoreOut = $('quizScore');
  const toast = $('quizToast');

  let queue = [];
  let asked = 0;
  let right = 0;
  let waiting = false;

  const quiz = { active: false };

  function poolOfVisibleParts() {
    return PARTS.filter((p) => p.sys !== 'surface' && viewer.isSystemVisible(p.sys));
  }

  quiz.start = () => {
    const pool = poolOfVisibleParts();
    if (pool.length < 4) return;
    queue = shuffle(pool).slice(0, Math.min(ROUNDS, pool.length));
    asked = 0; right = 0; waiting = false;
    quiz.active = true;
    viewer.select(null);
    viewer.setIsolate(false);
    document.body.dataset.sheet = 'shut';
    box.hidden = false;
    next();
  };

  quiz.stop = () => {
    quiz.active = false;
    box.hidden = true;
    toast.hidden = true;
    viewer.select(null);
  };

  function next() {
    if (asked >= queue.length) return finish();
    const p = queue[asked];
    prompt.replaceChildren();
    const [before, after] = t('quizFind', { name: '\u0000' }).split('\u0000');
    const em = document.createElement('em');
    em.textContent = pick(p.name);
    prompt.append(document.createTextNode(before), em, document.createTextNode(after || ''));
    scoreOut.textContent = t('quizScore', { a: right, b: queue.length });
  }

  function finish() {
    prompt.textContent = t('quizDone', { a: right, b: queue.length });
    scoreOut.textContent = '';
    quiz.active = false;
    setTimeout(() => { if (!quiz.active) box.hidden = true; }, 3200);
  }

  function flash(ok, text) {
    toast.hidden = false;
    toast.dataset.ok = ok ? 'yes' : 'no';
    toast.textContent = text;
    setTimeout(() => { toast.hidden = true; }, 1400);
  }

  /** Called instead of the normal selection handler while a quiz runs. */
  quiz.answer = (id) => {
    if (!quiz.active || waiting || !id) return;
    const target = queue[asked];
    if (!target) return;
    waiting = true;

    if (id === target.id) {
      right++;
      flash(true, t('quizRight'));
    } else {
      flash(false, t('quizWrong', { name: pick(PART_BY_ID[id].name) }));
    }
    viewer.select(target.id, { focus: false });
    ui.setPin(target.id);

    setTimeout(() => {
      waiting = false;
      asked++;
      viewer.select(null);
      ui.setPin(null);
      next();
    }, 1300);
  };

  $('quizBtn').addEventListener('click', () => (quiz.active ? quiz.stop() : quiz.start()));
  $('quizExit').addEventListener('click', () => quiz.stop());

  return quiz;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
