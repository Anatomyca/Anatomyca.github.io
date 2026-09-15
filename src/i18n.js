/**
 * Interface strings. Part names live in data.js; these are the words
 * around them. Missing keys fall back to English rather than breaking.
 */
export const LANGS = ['en', 'si', 'ta'];

const STR = {
  search:      { en: 'Search organs and bones', si: 'අවයව හා අස්ථි සොයන්න', ta: 'உறுப்புகளையும் எலும்புகளையும் தேடுங்கள்' },
  noMatch:     { en: 'Nothing by that name', si: 'එවැනි නමක් හමු නොවීය', ta: 'அப்பெயரில் எதுவும் இல்லை' },
  front:       { en: 'Front', si: 'ඉදිරිපස', ta: 'முன்' },
  back:        { en: 'Back', si: 'පිටුපස', ta: 'பின்' },
  left:        { en: 'Left', si: 'වම', ta: 'இடது' },
  right:       { en: 'Right', si: 'දකුණ', ta: 'வலது' },
  top:         { en: 'Top', si: 'උඩින්', ta: 'மேல்' },
  xray:        { en: 'See through', si: 'පාරදෘශ්‍ය බව', ta: 'ஊடுருவிப் பார்வை' },
  cut:         { en: 'Cut away', si: 'කපා හැරීම', ta: 'வெட்டித் தோற்றம்' },
  cutZ:        { en: 'front to back', si: 'ඉදිරියේ සිට පිටුපසට', ta: 'முன்னிருந்து பின்' },
  cutX:        { en: 'side to side', si: 'පැත්තෙන් පැත්තට', ta: 'பக்கவாட்டில்' },
  cutY:        { en: 'top to bottom', si: 'උඩ සිට යටට', ta: 'மேலிருந்து கீழ்' },
  isolate:     { en: 'Isolate', si: 'වෙන් කරන්න', ta: 'தனிமைப்படுத்து' },
  spin:        { en: 'Turntable', si: 'කරකවන්න', ta: 'சுழற்று' },
  quiz:        { en: 'Quiz me', si: 'ප්‍රශ්න අහන්න', ta: 'வினா கேளுங்கள்' },
  emptyTitle:  { en: 'Pick anything', si: 'ඕනෑම කොටසක් තෝරන්න', ta: 'எதையேனும் தெரிவு செய்யுங்கள்' },
  emptyBody:   {
    en: 'Tap a bone or an organ in the model, or search by name. Every part carries its name in English, Sinhala and Tamil.',
    si: 'ආකෘතියේ ඇති අස්ථියක් හෝ අවයවයක් ස්පර්ශ කරන්න, නැතහොත් නමින් සොයන්න. සෑම කොටසකම නම ඉංග්‍රීසි, සිංහල හා දෙමළ භාෂාවලින් දක්වා ඇත.',
    ta: 'மாதிரியில் ஒரு எலும்பையோ உறுப்பையோ தொடுங்கள், அல்லது பெயரால் தேடுங்கள். ஒவ்வொரு உறுப்பின் பெயரும் ஆங்கிலம், சிங்களம், தமிழ் ஆகிய மூன்றிலும் உள்ளது.',
  },
  names:       { en: 'Names', si: 'නම්', ta: 'பெயர்கள்' },
  jobs:        { en: 'What it does', si: 'කාර්යය', ta: 'செயற்பாடு' },
  lk:          { en: 'In Sri Lanka', si: 'ශ්‍රී ලංකාවේ', ta: 'இலங்கையில்' },
  nearby:      { en: 'Next to it', si: 'අවට කොටස්', ta: 'அருகில் உள்ளவை' },
  focus:       { en: 'Zoom in', si: 'විශාලනය', ta: 'நெருக்கிப் பார்' },
  hideRest:    { en: 'Hide the rest', si: 'අනෙක් සැඟවන්න', ta: 'மற்றவற்றை மறை' },
  showAll:     { en: 'Show everything', si: 'සියල්ල පෙන්වන්න', ta: 'அனைத்தையும் காட்டு' },
  clear:       { en: 'Clear', si: 'ඉවත් කරන්න', ta: 'நீக்கு' },
  parts:       { en: 'parts', si: 'කොටස්', ta: 'பகுதிகள்' },
  quizFind:    { en: 'Find the {name}', si: '{name} සොයන්න', ta: '{name} எங்கே?' },
  quizRight:   { en: 'Correct', si: 'හරි', ta: 'சரி' },
  quizWrong:   { en: 'That was the {name}', si: 'ඒ {name}', ta: 'அது {name}' },
  quizScore:   { en: '{a} of {b}', si: '{b} න් {a}', ta: '{b} இல் {a}' },
  quizDone:    { en: 'Finished — {a} of {b}', si: 'අවසන් — {b} න් {a}', ta: 'முடிந்தது — {b} இல் {a}' },
  quizExit:    { en: 'End quiz', si: 'අවසන් කරන්න', ta: 'முடிக்க' },
  buildingBody:{ en: 'Building the body', si: 'ශරීරය නිර්මාණය වෙමින්', ta: 'உடல் உருவாக்கப்படுகிறது' },
};

let current = 'en';

export function setLang(code) {
  current = LANGS.includes(code) ? code : 'en';
  document.documentElement.lang = current;
  document.documentElement.dataset.lang = current;
}

export function getLang() {
  return current;
}

/** t('quizFind', { name: 'heart' }) */
export function t(key, vars) {
  const entry = STR[key];
  let out = (entry && (entry[current] || entry.en)) || key;
  if (vars) for (const k in vars) out = out.replaceAll(`{${k}}`, vars[k]);
  return out;
}

/** Pick a localised value out of a {en, si, ta} object, falling back to English. */
export function pick(obj) {
  if (!obj) return '';
  return obj[current] || obj.en || '';
}
