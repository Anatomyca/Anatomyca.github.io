import { useTranslation } from 'react-i18next';
import { useAtlas } from '../state/store';

/**
 * See-through, spotlight, isolate and turntable.
 *
 * On a wide screen these float over the model; on a phone they live in a
 * sheet, where floating chrome would cover the body it controls.
 */
export function Controls({ variant = 'floating' }: { variant?: 'floating' | 'panel' }) {
  const { t } = useTranslation();
  const xray = useAtlas((s) => s.xray);
  const setXray = useAtlas((s) => s.setXray);
  const isolate = useAtlas((s) => s.isolate);
  const setIsolate = useAtlas((s) => s.setIsolate);
  const spin = useAtlas((s) => s.spin);
  const setSpin = useAtlas((s) => s.setSpin);
  const reveal = useAtlas((s) => s.reveal);
  const setReveal = useAtlas((s) => s.setReveal);

  return (
    <div
      className={
        variant === 'panel'
          ? 'flex flex-col gap-3 p-4 text-sm'
          : `pointer-events-auto absolute bottom-3 left-3 flex w-52 max-w-[calc(100%-1.5rem)]
             flex-col gap-2 rounded-lg border border-edge bg-panel/90 p-3 text-sm backdrop-blur`
      }
    >
      <label className="flex flex-col gap-1">
        <span className="text-muted">{t('xray')}</span>
        <input
          type="range" min={0} max={1} step={0.01} value={xray}
          onChange={(e) => setXray(Number(e.target.value))}
          className="w-full"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setReveal(!reveal)}
          aria-pressed={reveal}
          className={`compact min-w-[6rem] flex-1 rounded border px-2 py-1 ${
            reveal ? 'border-carmine text-carmine' : 'border-edge text-muted'
          }`}
        >
          {t('reveal')}
        </button>
        <button
          onClick={() => setIsolate(!isolate)}
          aria-pressed={isolate}
          className={`compact min-w-[6rem] flex-1 rounded border px-2 py-1 ${
            isolate ? 'border-carmine text-carmine' : 'border-edge text-muted'
          }`}
        >
          {t('isolate')}
        </button>
        <button
          onClick={() => setSpin(!spin)}
          aria-pressed={spin}
          className={`compact min-w-[6rem] flex-1 rounded border px-2 py-1 ${
            spin ? 'border-carmine text-carmine' : 'border-edge text-muted'
          }`}
        >
          {t('spin')}
        </button>
      </div>
    </div>
  );
}
