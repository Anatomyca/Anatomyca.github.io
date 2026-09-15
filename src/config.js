/**
 * One place to rebrand the atlas. Change APP.name and the title in
 * index.html and you are done — nothing else reads the name.
 */
export const APP = {
  name: 'Anatomyca',
  tagline: 'a 3D map of the human body',
  repo: 'https://github.com/Anatomyca/Anatomyca.github.io',
};

/** Body systems, in the order they appear in the rail. */
export const SYSTEMS = [
  { id: 'surface',  color: '#c9a08b', name: { en: 'Body surface',   si: 'ශරීර පෘෂ්ඨය',            ta: 'உடல் மேற்பரப்பு' } },
  { id: 'skeletal', color: '#e6dcc4', name: { en: 'Skeleton',       si: 'අස්ථි පද්ධතිය',          ta: 'எலும்புத் தொகுதி' } },
  { id: 'nervous',  color: '#e4c766', name: { en: 'Nervous system', si: 'ස්නායු පද්ධතිය',         ta: 'நரம்புத் தொகுதி' } },
  { id: 'cardio',   color: '#c2413a', name: { en: 'Heart & vessels',si: 'හෘද වාහිනී පද්ධතිය',     ta: 'இதய இரத்தக் குழாய்த் தொகுதி' } },
  { id: 'resp',     color: '#6fa8c7', name: { en: 'Breathing',      si: 'ශ්වසන පද්ධතිය',          ta: 'சுவாசத் தொகுதி' } },
  { id: 'digest',   color: '#c98a55', name: { en: 'Digestion',      si: 'ආහාර ජීර්ණ පද්ධතිය',     ta: 'செரிமானத் தொகுதி' } },
  { id: 'urinary',  color: '#8a9e5b', name: { en: 'Urinary system', si: 'මුත්‍රා පද්ධතිය',         ta: 'சிறுநீர்த் தொகுதி' } },
  { id: 'endo',     color: '#b07bbf', name: { en: 'Glands',         si: 'අන්තරාසර්ග ග්‍රන්ථි',     ta: 'நாளமில்லாச் சுரப்பிகள்' } },
  { id: 'lymph',    color: '#6fbf9b', name: { en: 'Lymphatic',      si: 'වසා පද්ධතිය',            ta: 'நிணநீர்த் தொகுதி' } },
];

export const SYSTEM_BY_ID = Object.fromEntries(SYSTEMS.map((s) => [s.id, s]));

/** Systems switched on the first time someone opens the atlas. */
export const DEFAULT_ON = ['surface', 'skeletal', 'cardio', 'resp', 'digest', 'urinary', 'lymph', 'endo', 'nervous'];

/** Camera presets. Distance is in metres; the body is 1.75 m tall. */
export const VIEWS = {
  front: { theta: 0,             phi: 1.5 },
  back:  { theta: Math.PI,       phi: 1.5 },
  left:  { theta: Math.PI / 2,   phi: 1.5 },
  right: { theta: -Math.PI / 2,  phi: 1.5 },
  top:   { theta: 0,             phi: 0.22 },
};
