// Rule-based + simulated-AI transaction classifier (FR4).
// Layer 1: deterministic keyword rules (high confidence).
// Layer 2: a simulated "AI" bag-of-words scorer (medium confidence).
// Anything neither layer is confident about stays Uncategorized for manual review.

export const TAGS = {
  BUSINESS_INCOME: 'Business Income',
  NON_BUSINESS: 'Non-Business Income',
  DEDUCTIBLE: 'Deductible Expense',
  UNCATEGORIZED: 'Uncategorized',
};

/** Tags a user may assign from the "Change Tag" dropdown. */
export const ASSIGNABLE_TAGS = [TAGS.BUSINESS_INCOME, TAGS.NON_BUSINESS, TAGS.DEDUCTIBLE];

export const REVIEW_NOTE = 'Uncategorized — Manual Review Required';

const NON_BUSINESS_IN = [
  'interest', 'dividend', 'venmo', 'zelle', 'cashback', 'gift', 'salary', 'reimbursement',
  'tax refund', 'friend', 'family',
];
const BUSINESS_IN = [
  'stripe', 'paypal', 'payout', 'invoice', 'wire', 'consulting', 'retainer', 'upwork', 'fiverr',
  'freelance', 'milestone', 'client',
];
const PERSONAL_OUT = [
  'netflix', 'spotify', 'grocery', 'groceries', 'whole foods', 'restaurant', 'uber eats',
  'doordash', 'gym', 'pharmacy', 'cinema', 'disney', 'hbo', 'starbucks',
];
const DEDUCTIBLE_OUT = [
  'aws', 'amazon web', 'google workspace', 'gsuite', 'adobe', 'figma', 'notion', 'zoom', 'slack',
  'github', 'gitlab', 'vercel', 'netlify', 'digitalocean', 'cloudflare', 'namecheap', 'godaddy',
  'hosting', 'domain', 'saas', 'coworking', 'wework', 'insurance', 'accountant', 'bookkeeping',
  'legal', 'conference', 'software', 'license', 'macbook', 'internet', 'phone bill', 'canva',
  'copilot', 'openai', 'anthropic',
];

// Simulated AI vocabulary (looser, context-style hints).
const AI_VOCAB = {
  [TAGS.DEDUCTIBLE]: [
    'office', 'desk', 'monitor', 'keyboard', 'mouse', 'laptop', 'equipment', 'printer', 'supplies',
    'travel', 'flight', 'hotel', 'training', 'course', 'books', 'marketing', 'ads', 'advertising',
    'tool', 'cloud', 'api', 'server', 'data', 'stand', 'webcam', 'headset',
  ],
  [TAGS.NON_BUSINESS]: [
    'dining', 'cafe', 'coffee', 'shopping', 'fashion', 'clothes', 'movie', 'game', 'health',
    'fitness', 'pizza', 'bar', 'pub', 'taxi', 'uber', 'lyft',
  ],
  [TAGS.BUSINESS_INCOME]: [
    'project', 'deposit', 'agency', 'studio', 'labs', 'corp', 'ltd', 'inc', 'contract',
    'development', 'design', 'escrow', 'payment',
  ],
};

function containsAny(text, words) {
  return words.some((w) => text.includes(w));
}

function tokenize(text) {
  return text.split(/[^a-z0-9]+/).filter(Boolean);
}

/** Never throws: tolerates null/undefined/blank descriptions and non-numeric amounts. */
export function classifyTransaction(input) {
  const description = typeof input?.description === 'string' ? input.description.trim() : '';
  const amount = Number(input?.amount);

  if (!description || !Number.isFinite(amount) || amount === 0) {
    return {
      tag: TAGS.UNCATEGORIZED,
      method: 'rule',
      confidence: 0,
      reviewRequired: true,
      reason: !description
        ? 'Empty description — cannot classify'
        : 'Zero or invalid amount — cannot classify',
    };
  }

  const text = description.toLowerCase();
  const isIncome = amount > 0;

  // ---- Layer 1: deterministic rules ----
  if (isIncome) {
    if (containsAny(text, NON_BUSINESS_IN)) {
      return done(TAGS.NON_BUSINESS, 'rule', 0.96, 'Matched personal-income keyword');
    }
    if (containsAny(text, BUSINESS_IN)) {
      return done(TAGS.BUSINESS_INCOME, 'rule', 0.97, 'Matched client/payout keyword');
    }
  } else {
    if (containsAny(text, PERSONAL_OUT)) {
      return done(TAGS.NON_BUSINESS, 'rule', 0.95, 'Matched personal-spend keyword');
    }
    if (containsAny(text, DEDUCTIBLE_OUT)) {
      return done(TAGS.DEDUCTIBLE, 'rule', 0.97, 'Matched business-expense keyword');
    }
  }

  // ---- Layer 2: simulated AI scorer ----
  const tokens = tokenize(text);
  const eligible = isIncome
    ? [TAGS.BUSINESS_INCOME, TAGS.NON_BUSINESS]
    : [TAGS.DEDUCTIBLE, TAGS.NON_BUSINESS];
  let best = { tag: null, hits: 0 };
  let runnerUp = 0;
  for (const tag of eligible) {
    const hits = tokens.filter((t) => AI_VOCAB[tag].includes(t)).length;
    if (hits > best.hits) {
      runnerUp = best.hits;
      best = { tag, hits };
    } else if (hits > runnerUp) {
      runnerUp = hits;
    }
  }
  if (best.tag && best.hits > runnerUp) {
    const confidence = Math.min(0.9, 0.55 + 0.15 * best.hits);
    return done(best.tag, 'ai', confidence, `AI model matched ${best.hits} context signal(s)`);
  }

  return {
    tag: TAGS.UNCATEGORIZED,
    method: 'ai',
    confidence: 0.2,
    reviewRequired: true,
    reason: 'Low classifier confidence',
  };
}

function done(tag, method, confidence, reason) {
  return { tag, method, confidence, reviewRequired: false, reason };
}
