import { useTranslation } from 'react-i18next';
import { useAtlas } from '../state/store';
import { modelName, modelSummary } from '../atlas/studyModels';

/**
 * Choose between the whole body and an anatomist-reviewed study model.
 *
 * The grade is the point of the choice, so it is on the face of each option
 * rather than buried: the whole body is a published reference dataset that
 * no anatomist has checked structure by structure, and the study models have
 * been. A student revising for a viva wants to know which they are looking
 * at.
 */
export function ModelPicker() {
  const { t } = useTranslation();
  const lang = useAtlas((s) => s.lang);
  const catalogue = useAtlas((s) => s.studyCatalogue);
  const active = useAtlas((s) => s.studyModel);
  const manifest = useAtlas((s) => s.manifest);
  const setStudyModel = useAtlas((s) => s.setStudyModel);

  const mb = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;

  return (
    <div className="flex flex-col gap-1.5 p-2">
      <Option
        active={active === null}
        onClick={() => setStudyModel(null)}
        grade="B"
        title={t('wholeBody')}
        summary={t('wholeBodySummary')}
        meta={manifest ? `${manifest.parts.length.toLocaleString()} ${t('parts')}` : ''}
      />

      {catalogue?.models.map((model) => (
        <Option
          key={model.id}
          active={active?.id === model.id}
          onClick={() => setStudyModel(model)}
          grade="A"
          title={modelName(model, lang)}
          summary={modelSummary(model, lang)}
          meta={`${model.structures.length} ${t('parts')} · ${mb(model.bytes)}`}
        />
      ))}
    </div>
  );
}

function Option({
  active, onClick, grade, title, summary, meta,
}: {
  active: boolean;
  onClick: () => void;
  grade: 'A' | 'B';
  title: string;
  summary: string;
  meta: string;
}) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left
                  transition-colors ${
        active ? 'border-carmine bg-panel' : 'border-edge hover:border-muted'
      }`}
    >
      <span className="flex w-full flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 font-medium">{title}</span>
        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 text-[11px] font-medium ${
            grade === 'A'
              ? 'border-emerald-700/50 bg-emerald-900/50 text-emerald-200'
              : 'border-sky-700/50 bg-sky-900/50 text-sky-200'
          }`}
          title={t(`grade${grade}`)}
        >
          {t('accuracy')} {grade}
        </span>
      </span>
      {/* The summary is what tells a student why they would pick this one,
          so it stays; only the active card needs it spelled out at length. */}
      <span className={`text-xs leading-snug text-muted ${active ? '' : 'line-clamp-2'}`}>
        {summary}
      </span>
      {meta && <span className="text-[11px] text-muted tabular-nums">{meta}</span>}
    </button>
  );
}
