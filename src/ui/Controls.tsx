import { useTranslation } from 'react-i18next';
import { useAtlas } from '../state/store';

/** See-through, cut-away, isolate and turntable, floating over the model. */
export function Controls() {
  const { t } = useTranslation();
  const { xray, setXray, clip, setClip, isolate, setIsolate, spin, setSpin } = useAtlas();

  return (
    <div className="absolute bottom-3 left-3 flex max-w-[15rem] flex-col gap-2
                    rounded-lg border border-edge bg-panel/90 p-3 text-sm backdrop-blur">
      <label className="flex flex-col gap-1">
        <span className="text-muted">{t('xray')}</span>
        <input
          type="range" min={0} max={1} step={0.01} value={xray}
          onChange={(e) => setXray(Number(e.target.value))}
          className="w-full"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-muted">{t('cut')}</span>
        <input
          type="range" min={0} max={1} step={0.01} value={clip.amount}
          onChange={(e) => setClip(clip.axis, Number(e.target.value))}
          className="w-full"
        />
      </label>

      <select
        value={clip.axis}
        onChange={(e) => setClip(e.target.value as 'x' | 'y' | 'z', clip.amount)}
        aria-label={t('cut')}
        className="rounded border border-edge bg-ground px-2 py-1"
      >
        <option value="z">{t('cutZ')}</option>
        <option value="x">{t('cutX')}</option>
        <option value="y">{t('cutY')}</option>
      </select>

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
