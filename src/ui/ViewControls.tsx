import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtlas } from '../state/store';

/**
 * Zoom, fit and fullscreen, floating over the model.
 *
 * These are the moves a reader makes constantly, so they stay one tap away
 * rather than behind a sheet. They sit against the right edge and above the
 * phone's dock, which is where a thumb already is — the left edge belongs to
 * the see-through panel on wide screens, and the bottom belongs to the dock.
 *
 * Pinch and wheel still work; these exist because a reader holding a phone
 * one-handed cannot pinch, and because a keyboard user cannot pinch at all.
 */
export function ViewControls() {
  const { t } = useTranslation();
  const runCamera = useAtlas((s) => s.runCamera);
  const selected = useAtlas((s) => s.selected);
  const fullscreen = useFullscreen();

  return (
    <div
      className="pointer-events-auto absolute right-3 bottom-20 flex flex-col gap-1.5
                 md:bottom-3"
    >
      <Key onClick={() => runCamera('zoomIn')} label={t('zoomIn')}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}>
          <circle cx="11" cy="11" r="6" /><path d="M11 8.5v5M8.5 11h5M15.5 15.5 20 20" />
        </svg>
      </Key>

      <Key onClick={() => runCamera('zoomOut')} label={t('zoomOut')}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}>
          <circle cx="11" cy="11" r="6" /><path d="M8.5 11h5M15.5 15.5 20 20" />
        </svg>
      </Key>

      {/* Fit frames the selection when there is one, and the whole body when
          there is not — one button for "show me what I am looking at". */}
      <Key onClick={() => runCamera(selected ? 'frame' : 'reset')} label={t('fitView')}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}>
          <path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      </Key>

      {fullscreen.supported && (
        <Key
          onClick={fullscreen.toggle}
          label={fullscreen.active ? t('exitFullscreen') : t('fullscreen')}
          pressed={fullscreen.active}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}>
            {fullscreen.active
              ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
              : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
          </svg>
        </Key>
      )}
    </div>
  );
}

/**
 * A 44px target, which is the smallest a finger hits reliably. The label is
 * the accessible name and the tooltip both, so nothing is icon-only to a
 * screen reader.
 */
function Key({
  onClick, label, children, pressed,
}: {
  onClick: () => void;
  label: string;
  children: ReactNode;
  pressed?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      {...(pressed === undefined ? {} : { 'aria-pressed': pressed })}
      className={`flex h-11 w-11 items-center justify-center rounded-lg border
                  bg-panel/90 backdrop-blur transition-colors ${
        pressed ? 'border-carmine text-carmine' : 'border-edge text-bone hover:border-muted'
      }`}
    >
      {children}
    </button>
  );
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/**
 * Fullscreen, which matters most on a phone: the dock, the header and the
 * browser's own chrome together take about a third of a small screen away
 * from the body.
 */
function useFullscreen() {
  const [active, setActive] = useState(false);
  const supported = typeof document !== 'undefined' && document.fullscreenEnabled;

  useEffect(() => {
    const onChange = () => setActive(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  return {
    active,
    supported,
    toggle: () => {
      // iOS Safari rejects this on some elements, so a refusal must not
      // take the interface down with it.
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      else void document.documentElement.requestFullscreen().catch(() => {});
    },
  };
}
