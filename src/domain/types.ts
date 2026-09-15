/**
 * The atlas domain model.
 *
 * Concept IDs are the primary key throughout. For structures sourced from
 * BodyParts3D that is the Foundational Model of Anatomy ID (`FMA7088`);
 * for the procedural seed layer it is a stable slug (`heart`). Both are
 * opaque strings here, so the two layers can coexist in one index.
 */

/** UI and content languages. Latin is a name-only locale, never a UI one. */
export const LANGUAGES = ['en', 'si', 'ta'] as const;
export type Language = (typeof LANGUAGES)[number];
export type NameLocale = Language | 'la';

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/**
 * How trustworthy a structure's geometry is, per the project's accuracy
 * standard. The grade is shown on every detail panel, and Grade A can be
 * filtered for on its own.
 *
 *  A — reviewed by subject-expert anatomists upstream (Open3Dmodel).
 *  B — from a published reference dataset, not individually expert-reviewed
 *      (BodyParts3D, Z-Anatomy, HuBMAP).
 *  C — computed or modelled by this project's own pipeline: recognisable
 *      teaching shapes in correct anatomical positions, not dissection-grade.
 */
export const GRADES = ['A', 'B', 'C'] as const;
export type Grade = (typeof GRADES)[number];

/** Where a structure's geometry came from. Shown alongside the grade. */
export type SourceId =
  | 'open3dmodel'
  | 'bodyparts3d'
  | 'z-anatomy'
  | 'hubmap'
  | 'anatomyca-procedural';

export interface SourceInfo {
  readonly id: SourceId;
  readonly label: string;
  readonly licence: string;
  readonly licenceUrl: string;
  /** Reproduced verbatim where the licensor specifies exact wording. */
  readonly attribution: string;
  readonly grade: Grade;
  readonly url: string;
}

/** A structure is either an atomic mesh or a named sum of them. */
export type ConceptKind = 'element' | 'compound';

/** Review state of a translated name, per language. */
export type ReviewStatus = 'reviewed' | 'provisional' | 'unreviewed';

export type Sex = 'male' | 'female';

/** Level of detail. Lite is what a first visit downloads. */
export type Lod = 'lite' | 'full';

export interface Names {
  readonly en: string;
  readonly la?: string;
  readonly si?: string;
  readonly ta?: string;
}

/**
 * Alternative forms used for search only, never for display.
 * `si`/`ta` hold everyday synonyms (හදවත beside හෘදය); the `-Latn` keys hold
 * romanised spellings, because many students type phonetically on an
 * English keyboard.
 */
export interface Aliases {
  readonly si?: readonly string[];
  readonly ta?: readonly string[];
  readonly 'si-Latn'?: readonly string[];
  readonly 'ta-Latn'?: readonly string[];
  readonly en?: readonly string[];
}

export interface Structure {
  readonly id: string;
  readonly wikidata?: string;
  readonly kind: ConceptKind;
  /** Element file IDs this compound resolves to. Empty for elements. */
  readonly elements: readonly string[];
  readonly partOf: readonly string[];
  readonly isA: readonly string[];
  /** Neighbouring structures, computed from mesh proximity. */
  readonly adjacent: readonly string[];
  readonly system: string;
  readonly source: SourceId;
  readonly grade: Grade;
  readonly sex?: Sex;
  readonly names: Names;
  readonly aliases?: Aliases;
  readonly status?: Partial<Record<Language, ReviewStatus>>;
  readonly reviewedBy?: Partial<Record<Language, readonly string[]>>;
  readonly curriculum?: readonly string[];
  /** 1 = school syllabus core, 2 = undergraduate, 3 = everything else. */
  readonly tier: 1 | 2 | 3;
  /** Plain-language description, per language. */
  readonly blurb?: Partial<Record<Language, string>>;
  readonly jobs?: Partial<Record<Language, readonly string[]>>;
  /** Sri Lankan public-health context. General, never diagnostic. */
  readonly context?: Partial<Record<Language, string>>;
  /** Key of the procedural builder, for the seed layer only. */
  readonly build?: string;
  /** A known defect, shown inline rather than hidden. */
  readonly knownIssue?: string;
}

export interface System {
  readonly id: string;
  readonly colour: string;
  readonly names: Required<Pick<Names, 'en'>> & Partial<Names>;
  /** Loaded on a first visit when true; everything else streams on demand. */
  readonly inLite: boolean;
}

export interface AtlasManifest {
  readonly version: string;
  readonly generatedAt: string;
  readonly systems: readonly System[];
  readonly structures: readonly Structure[];
  readonly sources: Readonly<Record<SourceId, SourceInfo>>;
  readonly counts: {
    readonly structures: number;
    readonly byGrade: Readonly<Record<Grade, number>>;
  };
}
