export type Category =
  | 'garbage'
  | 'water'
  | 'power'
  | 'security'
  | 'builder'
  | 'strays'
  | 'gas'
  | 'roads'
  | 'maintenance'
  | 'community';

export type Intent = 'complaint' | 'question' | 'update' | 'resolution' | 'discussion';

// Keyword weights per category. First-match-wins is fragile across overlapping topics
// (e.g. "water bill"), so we score each category and pick the max. Tie → fall to
// 'community'. Tuned against the 14k-line export we have on hand.
//
// All `.*` gaps between tokens are bounded with `(?:\w+\s+){0,N}` to prevent catastrophic
// backtracking on long forwarded messages.
const KEYWORDS: Record<Category, RegExp[]> = {
  garbage: [
    /\bgarbage\b/i, /\bwaste\b/i, /\bskip(ped|ping)?\b/i, /\btrash\b/i,
    /\bvan\b(?:\s+\w+){0,3}\s+(collect|pick)/i, /\bpickup\b/i,
    /\bdry\b(?:\s+\w+){0,2}\s+\bwet\b/i, /\bdust\s?bin/i,
    /\bsegregat/i, /\bbbmp\b/i,
  ],
  water: [
    /\bwater\b/i, /\btanker(s)?\b/i, /\bbwssb\b/i, /\bborewell\b/i, /\bsump\b/i,
    /\boverhead\b(?:\s+\w+){0,2}\s+tank/i, /\bcauvery\b/i,
  ],
  power: [
    /\bpower\b(?!\s+of)/i, /\belectric(ity)?\b/i, /\bbescom\b/i, /\boutage\b/i,
    /\btripped?\b/i, /\bvoltage\b/i, /\btransformer\b/i, /\bgenerator\b/i,
  ],
  security: [
    /\bsecurity\b/i, /\bguard(s)?\b/i, /\bgate\b/i, /\bcctv\b/i, /\bintruder\b/i,
    /\btheft\b/i, /\bstranger\b/i, /\bvisitor\b/i, /\bMSR\b/,
    /\bsecurity\s+agency\b/i,
  ],
  builder: [
    /\bbuilder\b/i, /\bhandover\b/i, /\bdeveloper\b/i, /\bdeed\b/i, /\bsale\s*deed/i,
    /\blegal\b/i, /\blawyer\b/i, /\bFIR\b/, /\bcourt\b/i, /\bnotice\b/i,
    /\bdocument\b/i, /\bcontract\b/i, /\bMOU\b/, /\bagreement\b/i,
    /\bodion\b(?:\s+\w+){0,3}\s+\bbuilder/i,
  ],
  strays: [
    /\bstray(s)?\b/i, /\bdog(s)?\b/i, /\bpup(py|pies)\b/i, /\bbite\b/i, /\bbark/i,
    /\bferal\b/i, /\bcattle\b/i, /\bcow(s)?\b/i,
  ],
  gas: [
    /\bGAIL\b/, /\bgas\b/i, /\bpipeline\b/i, /\bLPG\b/i, /\bcylinder\b/i,
    /\bpiped\b(?:\s+\w+){0,2}\s+gas/i,
  ],
  roads: [
    /\broad(s)?\b/i, /\bpothole/i, /\bspeed\s*break/i, /\btar/i, /\basphalt/i,
    /\bfootpath\b/i, /\bdrain(age)?\b/i, /\brajkaluve\b/i,
  ],
  maintenance: [
    /\bmaintenance\b/i, /\bclubhouse\b/i, /\bpool\b/i, /\bgym\b/i, /\bSTP\b/,
    /\bsewerage\b/i, /\bsewage\b/i, /\bpest\b/i, /\bmosquito\b/i, /\bfumigat/i,
    /\bgardener\b/i, /\bsweeper\b/i, /\bcleaning\b/i, /\blandscap/i, /\bAGM\b/,
    /\bbudget\b/i, /\bMyGate\b/i, /\bdues?\b/i, /\bvendor\b/i,
  ],
  community: [],
};

const INTENT_SIGNALS = {
  resolution: [
    /\bdone\b/i, /\bcompleted\b/i, /\bresolved\b/i, /\bsorted\b/i, /\bcleared\b/i,
    /\bfixed\b/i, /\bthanks\b/i, /\bthank you\b/i,
  ],
  complaint: [
    /\bnot\s+(?:\w+\s+){0,3}(work|happen|collect|pick|done|come)/i,
    /\bdidn'?t\b/i, /\bdid not\b/i, /\bno\s+(power|water|garbage|security|guard)/i,
    /\bagain\b/i, /\bstill\b/i, /\bbroken\b/i, /\bissue\b/i, /\bproblem\b/i,
    /\bpain(ful)?\b/i, /\burgent\b/i, /\bcomplaint\b/i, /\b3rd day\b/i, /\b2nd day\b/i,
  ],
  question: [/\?\s*$/, /^any\b/i, /\bcan anyone\b/i, /\bany contact\b/i, /^is\b/i],
  update: [/\bupdate\b/i, /\binform/i, /\bnotice\b/i, /\bplease\s+note\b/i, /\bFYI\b/i],
};

// Negation/contrast adverbs that flip a resolution-toned message into a complaint.
// "Thanks but still no water" should be a complaint, not a resolution.
const CONTRAST = /\b(but|however|still|yet|though)\b/i;

// Phase mention only when contextually anchored — bare "P2" anywhere in the text
// produced too many false positives ("got the P2 visa stamped" etc.).
const PHASE_ANCHORED =
  /\b(?:phase\s*[-:]?\s*)?(P\d{1,2})\b|\b(NGC)\b(?:\s*[-:]?\s*\d{1,4})?/i;
// Only attribute phases when the category suggests a structural/community concern.
const PHASE_CATEGORIES = new Set<Category>([
  'builder', 'maintenance', 'roads', 'water', 'power', 'gas', 'security', 'garbage',
]);

export function classify(body: string): { category: Category; intent: Intent; phase: string | null } {
  const text = body.normalize('NFKC');

  // Score categories by hit count, prefer non-community.
  let bestCat: Category = 'community';
  let bestScore = 0;
  for (const cat of Object.keys(KEYWORDS) as Category[]) {
    if (cat === 'community') continue;
    let s = 0;
    for (const re of KEYWORDS[cat]) if (re.test(text)) s++;
    if (s > bestScore) {
      bestScore = s;
      bestCat = cat;
    }
  }

  // Intent — score each, pick the most informative.
  // Priority: complaint > question > resolution > update > discussion.
  // Special rule: if resolution words AND contrast words both appear, it's a complaint
  // ("Thanks but still no water"). Prevents the most common misclassification.
  const hits = {
    resolution: INTENT_SIGNALS.resolution.some((re) => re.test(text)),
    complaint: INTENT_SIGNALS.complaint.some((re) => re.test(text)),
    question: INTENT_SIGNALS.question.some((re) => re.test(text)),
    update: INTENT_SIGNALS.update.some((re) => re.test(text)),
  };
  const hasContrast = CONTRAST.test(text);

  let intent: Intent = 'discussion';
  if (hits.complaint || (hits.resolution && hasContrast)) intent = 'complaint';
  else if (hits.question) intent = 'question';
  else if (hits.resolution) intent = 'resolution';
  else if (hits.update) intent = 'update';

  // Phase only when category implies a per-phase concern; reduces "P2 visa" false hits.
  let phase: string | null = null;
  if (PHASE_CATEGORIES.has(bestCat)) {
    const m = PHASE_ANCHORED.exec(text);
    if (m) phase = (m[1] ?? m[2] ?? '').toUpperCase() || null;
  }

  return { category: bestCat, intent, phase };
}
