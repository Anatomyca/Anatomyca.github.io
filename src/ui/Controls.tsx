import { useTranslation } from 'react-i18next';
import { useAtlas } from '../state/store';

/** See-through, isolate and turntable, floating over the model. */
export function Controls() {
  const { t } = useTranslation();
  const xray = useAtlas((s) => s.xray);
  const setXray = useAtlas((s) => s.setXray);
  const isolate = useAtlas((s) => s.isolate);
  const setIsolate = useAtlas((s) => s.setIsolate);
  const spin = useAtlas((s) => s.spin);
  const setSpin = useAtlas((s) => s.setSpin);

  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 flex w-52 max-w-[calc(100%-1.5rem)]
                    flex-col gap-2 rounded-lg border border-edge bg-panel/90 p-3 text-sm backdrop-blur">
      <label className="flex flex-col gap-1">
        <span className="text-muted">{t('xray')}</span>
        <input
          type="range" min={0} max={1} step={0.01} value={xray}
          onChange={(e) => setXray(Number(e.target.value))}
          className="w-full"
        />
      </label>

      <div className="flex gap-2">
        <button
          onClick={() => setIsolate(!isolate)}
          aria-pressed={isolate}
          className={`compact flex-1 rounded border px-2 py-1 ${
            isolate ? 'border-carmine text-carmine' : 'border-edge text-muted'
          }`}
        >
          {t('isolate')}
        </button>
        <button
          onClick={() => setSpin(!spin)}
          aria-pressed={spin}
          className={`compact flex-1 rounded border px-2 py-1 ${
            spin ? 'border-carmine text-carmine' : 'border-edge text-muted'
          }`}
        >
          {t('spin')}
        </button>
      </div>
    </div>
  );
}
