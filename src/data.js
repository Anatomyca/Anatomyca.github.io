/**
 * The atlas content.
 *
 *  id     — stable slug, also used in the URL (#heart)
 *  sys    — system id from config.js
 *  build  — key of the builder in geometry.js
 *  name   — English / Sinhala / Tamil
 *  latin  — anatomical term
 *  blurb  — two plain sentences
 *  jobs   — what it does, in the reader's words
 *  lk     — Sri Lankan public-health context, general and non-diagnostic
 *  near   — ids worth jumping to next
 *
 * Translations were compiled from standard Sinhala and Tamil anatomical
 * usage. Have a clinician or teacher review them before classroom use.
 */
export const PARTS = [
  /* ── surface ─────────────────────────────────────────────── */
  {
    id: 'skin', sys: 'surface', build: 'skin',
    name: { en: 'Skin', si: 'සම', ta: 'தோல்' }, latin: 'Integumentum commune',
    blurb: 'The body\'s outer layer and its largest organ, roughly two square metres of waterproof, self-repairing tissue. It is also a sense organ, a thermostat and part of the immune system.',
    jobs: ['Keeps water in and microbes out', 'Cools the body through sweat', 'Makes vitamin D in sunlight'],
    lk: 'Sri Lanka sits close to the equator, so ultraviolet levels are high year round even on cloudy days.',
    near: ['skull', 'ribcage'],
  },

  /* ── skeleton ────────────────────────────────────────────── */
  {
    id: 'skull', sys: 'skeletal', build: 'skull',
    name: { en: 'Skull', si: 'හිස්කබල', ta: 'மண்டையோடு' }, latin: 'Cranium',
    blurb: 'Twenty-two bones fused into a rigid case around the brain, with openings for the eyes, nose and ears. Only the jaw moves freely.',
    jobs: ['Shields the brain from impact', 'Holds the eyes in bony sockets', 'Anchors the muscles of chewing'],
    near: ['brain', 'mandible'],
  },
  {
    id: 'mandible', sys: 'skeletal', build: 'mandible',
    name: { en: 'Lower jaw', si: 'යටි හකු', ta: 'கீழ்த்தாடை' }, latin: 'Mandibula',
    blurb: 'The strongest bone in the face and the only one in the skull that moves. It hinges just in front of each ear.',
    jobs: ['Carries the lower teeth', 'Drives chewing and speech'],
    lk: 'Chewing betel quid with tobacco is the main reason oral cancer is among the commonest cancers in Sri Lankan men.',
    near: ['skull'],
  },
  {
    id: 'spine', sys: 'skeletal', build: 'spine',
    name: { en: 'Spine', si: 'කොඳු ඇට පෙළ', ta: 'முதுகுத்தண்டு' }, latin: 'Columna vertebralis',
    blurb: 'Thirty-three vertebrae stacked in a gentle double curve, cushioned by discs of cartilage. The curves act as a spring.',
    jobs: ['Carries the weight of head and trunk', 'Protects the spinal cord', 'Lets the trunk bend and twist'],
    lk: 'Low back pain is one of the top causes of years lived with disability here, and heavy manual lifting is a major trigger.',
    near: ['spinal-cord', 'ribcage', 'pelvis'],
  },
  {
    id: 'ribcage', sys: 'skeletal', build: 'ribcage',
    name: { en: 'Ribs', si: 'ඉළ ඇට කූඩුව', ta: 'விலா எலும்புக் கூடு' }, latin: 'Costae',
    blurb: 'Twelve pairs of curved bones that swing up and out with every breath. The lower pairs stay free at the front.',
    jobs: ['Shelters the heart and lungs', 'Moves to widen the chest as you breathe in'],
    near: ['sternum', 'lungs', 'heart'],
  },
  {
    id: 'sternum', sys: 'skeletal', build: 'sternum',
    name: { en: 'Breastbone', si: 'පපු ඇටය', ta: 'மார்பெலும்பு' }, latin: 'Sternum',
    blurb: 'A flat blade down the middle of the chest where the upper ribs meet through springy cartilage. Its lower tip is the landmark used in CPR.',
    jobs: ['Ties the rib cage together at the front', 'Protects the heart and great vessels'],
    near: ['ribcage', 'heart'],
  },
  {
    id: 'clavicle', sys: 'skeletal', build: 'clavicle',
    name: { en: 'Collarbone', si: 'අකු ඇටය', ta: 'காறை எலும்பு' }, latin: 'Clavicula',
    blurb: 'A slender S-shaped strut between the breastbone and the shoulder blade. It is the only bony link between arm and trunk.',
    jobs: ['Holds the shoulder out from the chest', 'Transfers force from arm to skeleton'],
    near: ['scapula', 'humerus'],
  },
  {
    id: 'scapula', sys: 'skeletal', build: 'scapula',
    name: { en: 'Shoulder blade', si: 'හබල් ඇටය', ta: 'தோள்பட்டை எலும்பு' }, latin: 'Scapula',
    blurb: 'A flat triangle that glides over the back of the rib cage rather than locking to it. That freedom is why the shoulder has such range.',
    jobs: ['Gives the arm muscles a moving base', 'Forms the shallow shoulder socket'],
    near: ['humerus', 'clavicle'],
  },
  {
    id: 'humerus', sys: 'skeletal', build: 'humerus',
    name: { en: 'Upper arm bone', si: 'බාහු අස්ථිය', ta: 'மேற்கை எலும்பு' }, latin: 'Humerus',
    blurb: 'A single long bone from shoulder to elbow, with a ball at the top and a hinge at the bottom. A nerve for the hand runs in a groove along its back.',
    jobs: ['Lengthens the reach of the arm', 'Anchors the shoulder and elbow muscles'],
    near: ['forearm', 'scapula'],
  },
  {
    id: 'forearm', sys: 'skeletal', build: 'forearm',
    name: { en: 'Forearm bones', si: 'පෙරබාහු අස්ථි', ta: 'முன்னங்கை எலும்புகள்' }, latin: 'Radius et ulna',
    blurb: 'Two bones side by side: the radius rolls over the ulna to turn the palm up or down. The ulna forms the point of the elbow.',
    jobs: ['Rotate the hand without moving the elbow', 'Carry load from hand to upper arm'],
    near: ['hand', 'humerus'],
  },
  {
    id: 'hand', sys: 'skeletal', build: 'hand',
    name: { en: 'Hand bones', si: 'අතේ ඇට', ta: 'கை எலும்புகள்' }, latin: 'Ossa manus',
    blurb: 'Twenty-seven bones per hand — wrist, palm and fingers. A quarter of all the bones in the body are in the two hands.',
    jobs: ['Grip, pinch and manipulate', 'Spread load across the wrist'],
    near: ['forearm'],
  },
  {
    id: 'pelvis', sys: 'skeletal', build: 'pelvis',
    name: { en: 'Pelvis', si: 'ශ්‍රෝණිය', ta: 'இடுப்பு எலும்பு' }, latin: 'Pelvis',
    blurb: 'A basin of fused bone that passes the weight of the trunk into the legs. It is wider and shallower in women.',
    jobs: ['Supports the abdominal organs', 'Links spine to legs', 'Anchors the hip muscles'],
    near: ['femur', 'bladder', 'spine'],
  },
  {
    id: 'femur', sys: 'skeletal', build: 'femur',
    name: { en: 'Thigh bone', si: 'කලවා අස්ථිය', ta: 'தொடை எலும்பு' }, latin: 'Femur',
    blurb: 'The longest, heaviest bone in the body, angled inward from hip to knee. Its neck is the part that breaks in a fall.',
    jobs: ['Carries body weight when you walk', 'Forms the hip and knee joints'],
    lk: 'Hip fractures after a simple fall are becoming commoner as the population ages — Sri Lanka has one of the fastest ageing populations in South Asia.',
    near: ['lowerleg', 'pelvis'],
  },
  {
    id: 'lowerleg', sys: 'skeletal', build: 'lowerleg',
    name: { en: 'Shin bones', si: 'කෙණ්ඩා අස්ථි', ta: 'கீழ்க்கால் எலும்புகள்' }, latin: 'Tibia et fibula',
    blurb: 'The thick tibia takes almost all the load; the slim fibula beside it is mostly a muscle anchor and part of the ankle.',
    jobs: ['Transmit weight to the foot', 'Stabilise the ankle joint'],
    near: ['foot', 'femur'],
  },
  {
    id: 'foot', sys: 'skeletal', build: 'foot',
    name: { en: 'Foot bones', si: 'පාදයේ ඇට', ta: 'பாத எலும்புகள்' }, latin: 'Ossa pedis',
    blurb: 'Twenty-six bones arranged into arches that flatten and recoil with every step. The heel bone is the largest.',
    jobs: ['Absorb landing shock', 'Push the body forward', 'Balance on uneven ground'],
    near: ['lowerleg'],
  },

  /* ── nervous ─────────────────────────────────────────────── */
  {
    id: 'brain', sys: 'nervous', build: 'brain',
    name: { en: 'Brain', si: 'මොළය', ta: 'மூளை' }, latin: 'Cerebrum',
    blurb: 'About 1.4 kg of folded tissue holding roughly 86 billion nerve cells. It takes a fifth of the body\'s oxygen while weighing a fiftieth of it.',
    jobs: ['Turns sensation into perception', 'Plans and drives movement', 'Holds memory, language and mood'],
    lk: 'Stroke is a leading cause of death and long-term disability here; high blood pressure is the single biggest risk behind it.',
    near: ['cerebellum', 'spinal-cord', 'skull'],
  },
  {
    id: 'cerebellum', sys: 'nervous', build: 'cerebellum',
    name: { en: 'Cerebellum', si: 'අනුමොළය', ta: 'சிறுமூளை' }, latin: 'Cerebellum',
    blurb: 'A tightly pleated lobe tucked under the back of the brain. It holds more nerve cells than the rest of the brain combined.',
    jobs: ['Smooths and times movement', 'Keeps balance and posture', 'Stores motor skills'],
    near: ['brain', 'spinal-cord'],
  },
  {
    id: 'spinal-cord', sys: 'nervous', build: 'spinalCord',
    name: { en: 'Spinal cord', si: 'සුෂුම්නාව', ta: 'தண்டுவடம்' }, latin: 'Medulla spinalis',
    blurb: 'A cable of nerve tissue about as thick as a finger, running inside the spine and ending near the waist. Below that it continues as a spray of nerve roots.',
    jobs: ['Carries signals between brain and body', 'Runs reflexes without waiting for the brain'],
    near: ['spine', 'sciatic', 'brain'],
  },
  {
    id: 'sciatic', sys: 'nervous', build: 'sciatic',
    name: { en: 'Sciatic nerve', si: 'සයැටික් ස්නායුව', ta: 'சயாட்டிக் நரம்பு' }, latin: 'Nervus ischiadicus',
    blurb: 'The thickest nerve in the body, as wide as a thumb where it leaves the pelvis. It runs down the back of the thigh and splits behind the knee.',
    jobs: ['Moves the muscles of leg and foot', 'Carries sensation from the lower limb'],
    near: ['spinal-cord', 'femur'],
  },

  /* ── heart & vessels ─────────────────────────────────────── */
  {
    id: 'heart', sys: 'cardio', build: 'heart',
    name: { en: 'Heart', si: 'හෘදය', ta: 'இதயம்' }, latin: 'Cor',
    blurb: 'A four-chambered muscular pump about the size of a closed fist, sitting slightly left of centre behind the breastbone. It beats around 100,000 times a day.',
    jobs: ['Pushes blood to the lungs for oxygen', 'Drives blood to every other tissue', 'Adjusts output to match effort'],
    lk: 'Ischaemic heart disease is the leading cause of hospital deaths in Sri Lanka, and it tends to appear about a decade earlier in South Asians than in Europeans.',
    near: ['aorta', 'lungs', 'vena-cava'],
  },
  {
    id: 'aorta', sys: 'cardio', build: 'aorta',
    name: { en: 'Aorta', si: 'මහා ධමනිය', ta: 'பெருநாடி' }, latin: 'Aorta',
    blurb: 'The main artery leaving the heart, about the width of a garden hose. It arches over the heart and runs down in front of the spine before splitting to the legs.',
    jobs: ['Carries oxygen-rich blood out of the heart', 'Smooths the pulse with its elastic wall'],
    lk: 'Roughly one in four Sri Lankan adults lives with raised blood pressure, which stiffens arteries like this one over time.',
    near: ['heart', 'carotids', 'kidneys'],
  },
  {
    id: 'vena-cava', sys: 'cardio', build: 'venaCava',
    name: { en: 'Vena cava', si: 'මහා ශිරාව', ta: 'பெருஞ்சிரை' }, latin: 'Vena cava',
    blurb: 'Two wide, thin-walled veins that return used blood to the right side of the heart — one from above the diaphragm, one from below.',
    jobs: ['Return blood from body to heart', 'Act as a reservoir when you are still'],
    near: ['heart', 'liver'],
  },
  {
    id: 'pulmonary', sys: 'cardio', build: 'pulmonary',
    name: { en: 'Lung vessels', si: 'පෙනහළු රුධිර වාහිනී', ta: 'நுரையீரல் இரத்தக் குழாய்கள்' }, latin: 'Vasa pulmonalia',
    blurb: 'The short circuit between heart and lungs. Unusually, the arteries here carry blood low in oxygen and the veins carry it rich.',
    jobs: ['Send blood to the lungs to be refreshed', 'Bring oxygenated blood back to the heart'],
    near: ['heart', 'lungs'],
  },
  {
    id: 'carotids', sys: 'cardio', build: 'carotids',
    name: { en: 'Neck arteries', si: 'කැරොටිඩ් ධමනි', ta: 'கழுத்துத் தமனிகள்' }, latin: 'Arteriae carotides',
    blurb: 'The pair of arteries you can feel pulsing beside the windpipe. Each splits in the neck, one branch for the face and one for the brain.',
    jobs: ['Supply the brain with blood', 'Report blood pressure to the brainstem'],
    near: ['brain', 'aorta'],
  },

  /* ── breathing ───────────────────────────────────────────── */
  {
    id: 'trachea', sys: 'resp', build: 'trachea',
    name: { en: 'Windpipe', si: 'ශ්වාස නාලය', ta: 'மூச்சுக்குழாய்' }, latin: 'Trachea',
    blurb: 'A tube held open by C-shaped rings of cartilage, running from the voice box to the middle of the chest. The soft gap at the back lets swallowed food pass behind it.',
    jobs: ['Carries air to and from the lungs', 'Traps dust in mucus and sweeps it up'],
    near: ['bronchi', 'lungs'],
  },
  {
    id: 'bronchi', sys: 'resp', build: 'bronchi',
    name: { en: 'Bronchi', si: 'ශ්වසනිකා', ta: 'மூச்சுக்குழல்கள்' }, latin: 'Bronchi',
    blurb: 'The branching airways inside each lung, dividing about twenty-three times down to sacs thinner than tissue paper.',
    jobs: ['Spread air through the lungs', 'Narrow or widen to control airflow'],
    lk: 'Asthma affects a substantial share of Sri Lankan schoolchildren; cooking smoke and dust are common triggers indoors.',
    near: ['lungs', 'trachea'],
  },
  {
    id: 'lungs', sys: 'resp', build: 'lungs',
    name: { en: 'Lungs', si: 'පෙනහළු', ta: 'நுரையீரல்கள்' }, latin: 'Pulmones',
    blurb: 'A pair of spongy organs whose inner surface, unfolded, would cover about half a tennis court. The left is smaller to make room for the heart.',
    jobs: ['Move oxygen into the blood', 'Clear carbon dioxide out', 'Warm and humidify air'],
    lk: 'Sri Lanka still notifies several thousand new tuberculosis cases a year, and it remains treatable and curable free of charge in the state system.',
    near: ['bronchi', 'heart', 'diaphragm'],
  },
  {
    id: 'diaphragm', sys: 'resp', build: 'diaphragm',
    name: { en: 'Diaphragm', si: 'ප්‍රාචීරය', ta: 'உதரவிதானம்' }, latin: 'Diaphragma',
    blurb: 'A domed sheet of muscle separating chest from abdomen. It flattens as you breathe in, which is what actually pulls air into the lungs.',
    jobs: ['Does most of the work of quiet breathing', 'Raises pressure for coughing and lifting'],
    near: ['lungs', 'liver', 'stomach'],
  },

  /* ── digestion ───────────────────────────────────────────── */
  {
    id: 'oesophagus', sys: 'digest', build: 'oesophagus',
    name: { en: 'Food pipe', si: 'ආහාර නාලය', ta: 'உணவுக்குழாய்' }, latin: 'Oesophagus',
    blurb: 'A muscular tube about 25 cm long behind the windpipe. It squeezes food downward in waves, so swallowing works even upside down.',
    jobs: ['Moves food from throat to stomach', 'Seals the stomach shut at its lower end'],
    near: ['stomach', 'trachea'],
  },
  {
    id: 'stomach', sys: 'digest', build: 'stomach',
    name: { en: 'Stomach', si: 'ආමාශය', ta: 'இரைப்பை' }, latin: 'Gaster',
    blurb: 'A J-shaped bag that holds a meal and mixes it with acid strong enough to dissolve metal. A layer of mucus is all that stops it digesting itself.',
    jobs: ['Stores a meal and releases it slowly', 'Starts protein digestion', 'Kills most swallowed microbes'],
    lk: 'Gastritis and reflux are among the commonest complaints at outpatient clinics; long-term relief usually needs a cause found, not just antacids.',
    near: ['oesophagus', 'small-intestine', 'liver'],
  },
  {
    id: 'liver', sys: 'digest', build: 'liver',
    name: { en: 'Liver', si: 'අක්මාව', ta: 'கல்லீரல்' }, latin: 'Hepar',
    blurb: 'The largest internal organ, tucked under the right ribs, running about 500 separate chemical jobs. It is the only organ that regrows lost tissue.',
    jobs: ['Filters and processes everything absorbed from the gut', 'Makes bile, clotting factors and proteins', 'Stores sugar and releases it between meals'],
    lk: 'Alcohol-related and fatty liver disease are both rising in Sri Lanka, and fatty liver can appear even in people who never drink.',
    near: ['gallbladder', 'stomach', 'pancreas'],
  },
  {
    id: 'gallbladder', sys: 'digest', build: 'gallbladder',
    name: { en: 'Gallbladder', si: 'පිත්තාශය', ta: 'பித்தப்பை' }, latin: 'Vesica biliaris',
    blurb: 'A small pear-shaped sac under the liver that concentrates bile and squirts it out when fat arrives in the gut.',
    jobs: ['Stores bile between meals', 'Releases it to help digest fat'],
    near: ['liver', 'small-intestine'],
  },
  {
    id: 'pancreas', sys: 'digest', build: 'pancreas',
    name: { en: 'Pancreas', si: 'අග්න්‍යාශය', ta: 'கணையம்' }, latin: 'Pancreas',
    blurb: 'A soft gland lying across the back of the abdomen that does two unrelated jobs — digestive juices into the gut, hormones into the blood.',
    jobs: ['Makes enzymes that break down food', 'Releases insulin to control blood sugar'],
    lk: 'Diabetes is common here and often appears at a lower body weight than in Western populations, so waist size matters more than the scale alone.',
    near: ['liver', 'stomach', 'small-intestine'],
  },
  {
    id: 'small-intestine', sys: 'digest', build: 'smallIntestine',
    name: { en: 'Small intestine', si: 'කුඩා බඩවැල', ta: 'சிறுகுடல்' }, latin: 'Intestinum tenue',
    blurb: 'Six metres of coiled tube where almost all nutrients are absorbed. Its lining is folded into millions of finger-like villi.',
    jobs: ['Finishes digesting food', 'Absorbs nutrients into the blood'],
    near: ['stomach', 'large-intestine'],
  },
  {
    id: 'large-intestine', sys: 'digest', build: 'largeIntestine',
    name: { en: 'Large intestine', si: 'මහා බඩවැල', ta: 'பெருங்குடல்' }, latin: 'Intestinum crassum',
    blurb: 'A wide frame around the small intestine that reclaims water and salts. It houses most of the body\'s gut bacteria.',
    jobs: ['Absorbs water and minerals', 'Ferments fibre', 'Forms and stores waste'],
    lk: 'Colorectal cancer is increasing as diets shift away from traditional high-fibre rice-and-vegetable meals.',
    near: ['small-intestine', 'spleen'],
  },

  /* ── urinary ─────────────────────────────────────────────── */
  {
    id: 'kidneys', sys: 'urinary', build: 'kidneys',
    name: { en: 'Kidneys', si: 'වකුගඩු', ta: 'சிறுநீரகங்கள்' }, latin: 'Renes',
    blurb: 'Two bean-shaped filters against the back wall of the abdomen, each holding about a million filtering units. Together they process the whole blood volume many times a day.',
    jobs: ['Clear waste and excess water', 'Balance salts and acidity', 'Help control blood pressure'],
    lk: 'Chronic kidney disease of unknown cause is concentrated among farming families in the dry zone — Anuradhapura, Polonnaruwa and nearby districts — and early screening is free at state clinics.',
    near: ['ureters', 'adrenals', 'bladder'],
  },
  {
    id: 'ureters', sys: 'urinary', build: 'ureters',
    name: { en: 'Ureters', si: 'මුත්‍රා වාහිනී', ta: 'சிறுநீர்க்குழாய்கள்' }, latin: 'Ureteres',
    blurb: 'Two narrow muscular tubes carrying urine from kidney to bladder. They squeeze in waves rather than relying on gravity.',
    jobs: ['Move urine downward', 'Stop urine flowing back to the kidney'],
    lk: 'Kidney stones are frequent among outdoor workers in the dry zone, where heat and low fluid intake concentrate the urine.',
    near: ['kidneys', 'bladder'],
  },
  {
    id: 'bladder', sys: 'urinary', build: 'bladder',
    name: { en: 'Bladder', si: 'මුත්‍රාශය', ta: 'சிறுநீர்ப்பை' }, latin: 'Vesica urinaria',
    blurb: 'A muscular bag in the pelvis that stretches as it fills. The urge to go usually starts at around 300 ml.',
    jobs: ['Stores urine', 'Empties under conscious control'],
    near: ['ureters', 'pelvis'],
  },

  /* ── glands ──────────────────────────────────────────────── */
  {
    id: 'thyroid', sys: 'endo', build: 'thyroid',
    name: { en: 'Thyroid', si: 'තයිරොයිඩ් ග්‍රන්ථිය', ta: 'தைராய்டு சுரப்பி' }, latin: 'Glandula thyroidea',
    blurb: 'A butterfly-shaped gland wrapped around the front of the windpipe. Its hormones set the pace of metabolism in every cell.',
    jobs: ['Sets the body\'s metabolic speed', 'Guides growth and brain development in children'],
    lk: 'Universal salt iodisation, introduced in 1995, cut goitre in Sri Lankan schoolchildren dramatically within a decade.',
    near: ['trachea', 'carotids'],
  },
  {
    id: 'adrenals', sys: 'endo', build: 'adrenals',
    name: { en: 'Adrenal glands', si: 'අධිවෘක්ක ග්‍රන්ථි', ta: 'அட்ரீனல் சுரப்பிகள்' }, latin: 'Glandulae suprarenales',
    blurb: 'Two small caps sitting on top of the kidneys. The outer layer makes steroid hormones, the core makes adrenaline.',
    jobs: ['Drive the fight-or-flight response', 'Control salt, water and stress hormones'],
    near: ['kidneys'],
  },

  /* ── lymphatic ───────────────────────────────────────────── */
  {
    id: 'spleen', sys: 'lymph', build: 'spleen',
    name: { en: 'Spleen', si: 'ප්ලීහාව', ta: 'மண்ணீரல்' }, latin: 'Splen',
    blurb: 'A fist-sized filter behind the stomach on the left, packed with immune cells. You can live without it, but infections then need more care.',
    jobs: ['Removes worn-out red blood cells', 'Stores platelets', 'Makes antibodies against blood-borne microbes'],
    lk: 'In dengue, the platelet count that doctors watch so closely reflects work done here and in the bone marrow; warning signs matter more than the number alone.',
    near: ['stomach', 'large-intestine'],
  },
];

export const PART_BY_ID = Object.fromEntries(PARTS.map((p) => [p.id, p]));
