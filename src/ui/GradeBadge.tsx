import { useTranslation } from 'react-i18next';
import type { Grade, SourceId } from '../domain/types';

/**
 * Every structure states how far it can be trusted.
 *
 * The project's accuracy standard is not "100% accurate" — no open anatomy
 * dataset can promise that, and the ones this atlas builds on say so
 * themselves. The promise is that provenance and review status are always
 * visible, which is a claim that can actually be checked.
 */
const GRADE_STYLE: Record<Grade, string> = {
  A: 'bg-emerald-900/50 text-emerald-200 border-emerald-700/50',
  B: 'bg-sky-900/50 text-sky-200 border-sky-700/50',
  C: 'bg-amber-900/40 text-amber-200 border-amber-700/50',
};

const SOURCE_LABEL: Record<SourceId, string> = {
  'open3dmodel': 'Open3Dmodel',
  'bodyparts3d': 'BodyParts3D',
  'z-anatomy': 'Z-Anatomy',
  'hubmap': 'HuBMAP',
  'anatomyca-procedural': 'Anatomyca procedural',
};

export function GradeBadge({ grade, source }: { grade: Grade; source: SourceId }) {
  const { t } = useTranslation();
  const explanation = t(`grade${grade}`);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span
        className={`rounded border px-2 py-0.5 font-medium ${GRADE_STYLE[grade]}`}
        title={explanation}
      >
        {t('accuracy')} {grade}
      </span>
      <span className="text-muted">{explanation}</span>
      <span className="text-muted">
        · {t('source')}: {SOURCE_LABEL[source]}
      </span>
    </div>
  );
}
