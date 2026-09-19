import type { System } from '../domain/types';

/**
 * The fifteen BodyParts3D display systems, with Sinhala and Tamil names.
 *
 * Names follow standard anatomical usage in each language and carry the same
 * provisional status as every other term here: they are correct to the best
 * of the compiler's knowledge and have not yet passed two-reviewer sign-off.
 *
 * `inLite` marks what loads on a first visit. Skeleton and the cardiac,
 * respiratory and digestive systems give a recognisable body for about a
 * third of the payload; the vascular trees alone are over a thousand
 * structures and stream only when asked for.
 */
export const BP3D_SYSTEMS: readonly System[] = [
  {
    id: 'skeletal', colour: '#e6dcc4', inLite: true,
    names: { en: 'Skeleton', si: 'අස්ථි පද්ධතිය', ta: 'எலும்புத் தொகுதி' },
  },
  {
    id: 'muscular', colour: '#b5584f', inLite: false,
    names: { en: 'Muscles', si: 'මාංශ පේශි පද්ධතිය', ta: 'தசைத் தொகுதி' },
  },
  {
    id: 'nervous', colour: '#e4c766', inLite: false,
    names: { en: 'Nervous system', si: 'ස්නායු පද්ධතිය', ta: 'நரம்புத் தொகுதி' },
  },
  {
    id: 'cardiac', colour: '#c2413a', inLite: true,
    names: { en: 'Heart', si: 'හෘදය', ta: 'இதயம்' },
  },
  {
    id: 'arterial', colour: '#c0473f', inLite: false,
    names: { en: 'Arteries', si: 'ධමනි', ta: 'தமனிகள்' },
  },
  {
    id: 'venous', colour: '#4a6f9e', inLite: false,
    names: { en: 'Veins', si: 'ශිරා', ta: 'நாளங்கள்' },
  },
  {
    id: 'respiratory', colour: '#6fa8c7', inLite: true,
    // "Airways", not "Breathing" or "Lungs": this dataset holds the
    // bronchial tree, trachea, larynx and upper airway, and no lung tissue
    // at all. A label promising lungs would be a promise the data breaks.
    names: { en: 'Airways', si: 'වාතනාල', ta: 'சுவாசப் பாதைகள்' },
  },
  {
    id: 'digestive', colour: '#c98a55', inLite: true,
    names: { en: 'Digestion', si: 'ආහාර ජීර්ණ පද්ධතිය', ta: 'செரிமானத் தொகுதி' },
  },
  {
    id: 'urinary', colour: '#8a9e5b', inLite: true,
    names: { en: 'Urinary system', si: 'මුත්‍රා පද්ධතිය', ta: 'சிறுநீர்த் தொகுதி' },
  },
  {
    id: 'endocrine', colour: '#b07bbf', inLite: true,
    names: { en: 'Glands', si: 'අන්තරාසර්ග ග්‍රන්ථි', ta: 'நாளமில்லாச் சுரப்பிகள்' },
  },
  {
    id: 'lymphatic', colour: '#6fbf9b', inLite: true,
    names: { en: 'Lymphatic', si: 'වසා පද්ධතිය', ta: 'நிணநீர்த் தொகுதி' },
  },
  {
    id: 'sensory', colour: '#d9a05b', inLite: false,
    names: { en: 'Sense organs', si: 'ඉන්ද්‍රිය', ta: 'புலன் உறுப்புகள்' },
  },
  {
    id: 'connective', colour: '#cfc4a8', inLite: false,
    names: { en: 'Connective tissue', si: 'සම්බන්ධක පටක', ta: 'இணைப்புத் திசு' },
  },
  {
    id: 'integumentary', colour: '#d6b099', inLite: true,
    names: { en: 'Body surface', si: 'ශරීර පෘෂ්ඨය', ta: 'உடல் மேற்பரப்பு' },
  },
  {
    id: 'reproductive', colour: '#bf7f95', inLite: false,
    names: { en: 'Reproductive system', si: 'ප්‍රජනන පද්ධතිය', ta: 'இனப்பெருக்கத் தொகுதி' },
  },
];

export const BP3D_SYSTEM_BY_ID = new Map(BP3D_SYSTEMS.map((s) => [s.id, s]));

/**
 * Resting opacity per system.
 *
 * The body surface is kept as a faint shell: it gives a reader somewhere to
 * orient themselves without walling off everything inside it. Selecting the
 * heart has to actually show the heart.
 */
export const SYSTEM_OPACITY: Readonly<Record<string, number>> = {
  integumentary: 0.1,
  connective: 0.45,
  muscular: 0.85,
};

export const baseOpacityOf = (system: string): number => SYSTEM_OPACITY[system] ?? 1;

/** Systems shown on a first visit, before anything else is requested. */
export const LITE_SYSTEMS = BP3D_SYSTEMS.filter((s) => s.inLite).map((s) => s.id);
