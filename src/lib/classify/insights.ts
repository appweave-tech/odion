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
const KEYWORDS: Record<Category, RegExp[]> = {
  garbage: [
    /\bgarbage\b/i, /\bwaste\b/i, /\bskip(ped|ping)?\b/i, /\btrash\b/i,
    /\bvan\b.*\b(collect|pick)/i, /\bpickup\b/i, /\bdry\b.*\bwet\b/i, /\bdust\s?bin/i,
    /\bsegregat/i, /\bbbmp\b/i,
  ],
  water: [
    /\bwater\b/i, /\btanker(s)?\b/i, /\bbwssb\b/i, /\bborewell\b/i, /\bsump\b/i,
    /\boverhead\b.*tank/i, /\bcauvery\b/i,
  ],
  power: [
    /\bpower\b(?!\s+of)/i, /\belectric(ity)?\b/i, /\bbescom\b/i, /\boutage\b/i,
    /\btripped?\b/i, /\bvoltage\b/i, /\btransformer\b/i, /\bgenerator\b/i,
  ],
  security: [
    /\bsecurity\b/i, /\bguard(s)?\b/i, /\bgate\b/i, /\bcctv\b/i, /\bintruder\b/i,
    /\btheft\b/i, /\bstranger\b/i, /\bvisitor\b/i, /\bMSR\b/, /\bagency\b/i,
  ],
  builder: [
    /\bbuilder\b/i, /\bhandover\b/i, /\bdeveloper\b/i, /\bdeed\b/i, /\bsale\s*deed/i,
    /\blegal\b/i, /\blawyer\b/i, /\bFIR\b/, /\bcourt\b/i, /\bnotice\b/i,
    /\bdocument\b/i, /\bcontract\b/i, /\bMOU\b/, /\bagreement\b/i, /\bodion\b.*\bbuilder/i,
  ],
  strays: [
    /\bstray(s)?\b/i, /\bdog(s)?\b/i, /\bpup(py|pies)\b/i, /\bbite\b/i, /\bbark/i,
    /\bferal\b/i, /\bcattle\b/i, /\bcow(s)?\b/i,
  ],
  gas: [
    /\bGAIL\b/, /\bgas\b/i, /\bpipeline\b/i, /\bLPG\b/i, /\bcylinder\b/i,
    /\bpiped\b.*gas/i,
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
  community: [
    // catchall — anything else
  ],
};

// Intent signals — applied after category. Order matters: resolution > complaint > question > update.
const INTENT_SIGNALS = {
  resolution: [
    /\bdone\b/i, /\bcompleted\b/i, /\bresolved\b/i, /\bsorted\b/i, /\bcleared\b/i,
    /\bfixed\b/i, /\bthanks\b/i, /\bthank you\b/i, /\bsuper\b/i,
  ],
  complaint: [
    /\bnot\b.*(work|happen|collect|pick|done|come)/i,
    /\bdidn'?t\b/i, /\bdid not\b/i, /\bno\s+(power|water|garbage|security|guard)/i,
    /\bagain\b/i, /\bstill\b/i, /\bbroken\b/i, /\bissue\b/i, /\bproblem\b/i,
    /\bpain(ful)?\b/i, /\burgent\b/i, /\bcomplaint\b/i, /\b3rd day\b/i, /\b2nd day\b/i,
  ],
  question: [/\?\s*$/, /^any\b/i, /\bcan anyone\b/i, /\bany contact\b/i, /^is\b/i],
  update: [/\bupdate\b/i, /\binform/i, /\bnotice\b/i, /\bplease\s+note\b/i, /\bFYI\b/i],
};

const PHASE = /\b(P[1-9]|P1[0-2]|NGC)\b(?!\.)/i;

export function classify(body: string): { category: Category; intent: Intent; phase: string | null } {
  const text = body.normalize('NFKC');

  // Score each category by number of regex hits.
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

  // Intent — pick the strongest hit.
  let intent: Intent = 'discussion';
  for (const k of ['resolution', 'complaint', 'question', 'update'] as const) {
    if (INTENT_SIGNALS[k].some((re) => re.test(text))) {
      intent = k;
      break;
    }
  }

  const ph = PHASE.exec(text);
  return { category: bestCat, intent, phase: ph ? ph[1].toUpperCase() : null };
}
