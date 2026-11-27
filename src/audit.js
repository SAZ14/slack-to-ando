// Relay audit: classify human messages, cluster repeat questions, find human routers,
// and propose an agent roster per channel.
import { toks, clean } from './text.js';

export const RE_ASK = /\b(can|could|would) (you|someone|anyone|somebody)\b|\banyone (know|have|seen|got)\b|\bdoes anyone\b|\bwho('s| is)? (owns|knows|has|can|is on|on call|runs)\b|\bany (update|news|eta)\b|\bstatus on\b|\bwhere('?s| is| are| do| can)\b|\bhow do (i|we)\b|\bwhat did we decide\b|\bwhat'?s our\b|\bis \S+ (down|broken)\b/i;
const RE_STAT = /\b(standup|stand-up|update|status|eod|wip|yesterday|today:|recap|weekly|shipped|blocked|rolled back|postmortem)\b/i;
const RE_TOOL = /(github\.com|linear\.app|sentry\.io|notion\.so|posthog|granola)/i;
const RE_INC = /\b(down|outage|errors?|500s?|alert|incident|spike|failing|rollback|latency)\b/i;
const RE_DOC = /\b(doc|spec|policy|wiki|notion|written down|decide)\b/i;
const HUMAN_SUBTYPES = new Set(['thread_broadcast', 'file_share', 'me_message']);

// Broader question shapes seen in real chat ("Is there a way…", "Why does…"), used when the message also has a "?".
const RE_Q = /\b(is there|are there|is it|can i|can we|can you|could i|could you|should i|should we|how (do|does|did|can|would|should|to|is|are)|what('?s| is| are| do| does| would)|why (does|do|did|is|are|would|doesn'?t|isn'?t|can'?t|won'?t)|which|where|when (should|do|does|is)|does (anyone|anybody|someone)|has (anyone|anybody)|anyone|any (idea|ideas|way|tips))\b/i;
export const isAsk = (tx, mentions = 0) => RE_ASK.test(tx) || (/\?/.test(tx) && (RE_Q.test(tx) || mentions > 0));

export const isBot = m => m.subtype === 'bot_message' || !!m.bot_id;
export const isHuman = m => !isBot(m) && (!m.subtype || HUMAN_SUBTYPES.has(m.subtype));
export const isReply = m => m.thread_ts && m.thread_ts !== m.ts;

/** Thread replies keyed by `${channel}|${thread_ts}`. */
export function threads(D) {
  const T = new Map();
  for (const [name, msgs] of Object.entries(D.ch))
    for (const m of msgs) if (isHuman(m) && isReply(m)) {
      const k = `${name}|${m.thread_ts}`;
      if (!T.has(k)) T.set(k, []);
      T.get(k).push(m);
    }
  return T;
}

export function analyze(D, { similarity = SIMILARITY } = {}) {
  let minT = Infinity, maxT = 0;
  const chans = [], asks = [], people = {};
  const P = id => (people[id] ??= { pinged: 0, answered: 0 });

  for (const [name, msgs] of Object.entries(D.ch)) {
    const s = { name, ask: 0, stat: 0, tool: 0, oth: 0, bot: 0, inc: 0, gh: 0, doc: 0, human: 0 };
    const askers = new Map();
    for (const m of msgs) {
      const t = +m.ts;
      if (t) { minT = Math.min(minT, t); maxT = Math.max(maxT, t); }
      if (isBot(m)) { s.bot++; continue; }
      if (!isHuman(m)) continue;
      const tx = m.text || '';
      s.human++;
      if (isReply(m) && askers.has(m.thread_ts)) {
        if (m.user && m.user !== askers.get(m.thread_ts)) P(m.user).answered++;
        s.oth++;
        continue;
      }
      const ments = [...tx.matchAll(/<@([A-Z0-9]+)>/g)].map(x => x[1]);
      if (RE_INC.test(tx)) s.inc++;
      if (/github\.com/i.test(tx)) s.gh++;
      if (RE_DOC.test(tx)) s.doc++;
      if (!isReply(m) && isAsk(tx, ments.length)) {
        s.ask++;
        askers.set(m.ts, m.user);
        ments.forEach(u => P(u).pinged++);
        asks.push({ ch: name, m, tk: toks(tx) });
      } else if (RE_STAT.test(tx)) s.stat++;
      else if (RE_TOOL.test(tx) && tx.replace(/<[^>]*>|https?:\S+/g, '').trim().split(/\s+/).length < 8) s.tool++;
      else s.oth++;
    }
    if (s.human) chans.push(s);
  }

  const weeks = Math.max(1, (maxT - minT) / (7 * 86400));
  const clusters = clusterAsks(asks, similarity);
  const reps = clusters.filter(c => c.items.length > 1)
    .map(c => ({ ...c, n: c.items.length, text: c.items[0].m.text }))
    .sort((a, b) => b.n - a.n);
  chans.sort((a, b) => (b.ask + b.stat + b.tool) - (a.ask + a.stat + a.tool));
  return { chans, reps, people, weeks, minT, maxT };
}

/**
 * Group asks that are worded alike. TF-IDF cosine against each cluster's first question,
 * with an inverted index so it stays fast on hundreds of thousands of messages.
 * Very common words (in over 5% of asks) are not indexed; they carry little signal.
 */
export const SIMILARITY = 0.5;
export function clusterAsks(asks, threshold = SIMILARITY) {
  const df = new Map();
  for (const a of asks) for (const w of new Set(a.tk)) df.set(w, (df.get(w) || 0) + 1);
  const N = asks.length || 1, common = Math.max(20, N * 0.05);
  const vec = tk => {
    const v = new Map();
    for (const w of tk) v.set(w, (v.get(w) || 0) + 1);
    let n = 0;
    for (const [w, c] of v) { const x = c * (Math.log((N + 1) / ((df.get(w) || 0) + 1)) + 1); v.set(w, x); n += x * x; }
    n = Math.sqrt(n) || 1;
    for (const [w, x] of v) v.set(w, x / n);
    return v;
  };
  const clusters = [], index = new Map();
  for (const a of asks) {
    // Skip follow-ups ("what's the exact error?") and replies aimed at one person: not reusable questions.
    const tx = a.m.text || '';
    if (a.tk.length < 3 || /^\s*<@/.test(tx)) continue;
    if (/\byour?\b/i.test(tx) && !/\b(any|some)(one|body)\b|\byou (all|guys|folks)\b/i.test(tx)) continue; // "can you show your Msg type?"
    const v = vec(a.tk), score = new Map();
    for (const [w, x] of v) for (const ci of index.get(w) || []) score.set(ci, (score.get(ci) || 0) + x * clusters[ci].v.get(w));
    let best = -1, bs = 0;
    for (const [ci, sc] of score) if (sc > bs) { bs = sc; best = ci; }
    if (best >= 0 && bs >= threshold) { clusters[best].items.push(a); clusters[best].chs.add(a.ch); continue; }
    const ci = clusters.length;
    clusters.push({ tk: a.tk, v, items: [a], chs: new Set([a.ch]) });
    for (const w of v.keys()) if ((df.get(w) || 0) <= common) { if (!index.has(w)) index.set(w, []); index.get(w).push(ci); }
  }
  for (const c of clusters) delete c.v;
  return clusters;
}

export function totals(A, mAsk = 4, mStat = 3) {
  let ask = 0, stat = 0, tool = 0, human = 0;
  for (const s of A.chans) { ask += s.ask; stat += s.stat; tool += s.tool; human += s.human; }
  return { ask, stat, tool, human, hours: (ask * mAsk + stat * mStat + tool) / 60 / A.weeks, share: (ask + stat + tool) / (human || 1) };
}

export const ROLE = {
  triage: { t: 'Incident triage agent', does: ['Watches Sentry alerts and "is X down?" messages', 'Opens the Linear issue and pings the owner, so nobody plays dispatcher', 'Drafts the postmortem from the thread into workspace memory'] },
  pr: { t: 'PR shepherd agent', does: ['Picks up "can someone review" asks and assigns a reviewer by code ownership', 'Posts a two-line diff summary with the GitHub link', 'Nudges stale PRs before standup'] },
  digest: { t: 'Digest agent', does: ['Collects updates as a recurring automation instead of a daily ritual', 'Posts one weekly recap with shipped, blocked and next', 'Flags blockers to the person who can unblock them'] },
  answer: { t: 'Answer agent', does: ['Replies to repeat questions from the workspace wiki, with the source message linked', 'Writes new answers back to the wiki when a human answers', 'Hands off to a human only when it is unsure'] },
};

function rolesFor(s, repIn) {
  const R = [], h = s.human || 1;
  if (s.inc / h > 0.25) R.push({ k: 'triage', sc: s.inc });
  if (s.gh >= 4) R.push({ k: 'pr', sc: s.gh });
  if (s.stat / h > 0.3) R.push({ k: 'digest', sc: s.stat });
  if (repIn >= 3 || (s.ask / h > 0.3 && s.doc >= 3)) R.push({ k: 'answer', sc: repIn * 3 + s.ask });
  if (!R.length && s.ask / h > 0.2) R.push({ k: 'answer', sc: s.ask });
  return R.sort((a, b) => b.sc - a.sc).slice(0, 2).map(x => x.k);
}

/** [{ k, chs: [channelStats] }] ordered by how many channels each agent covers. */
export function roster(A) {
  const repBy = {};
  A.reps.forEach(c => c.chs.forEach(ch => (repBy[ch] = (repBy[ch] || 0) + c.n)));
  const seat = {};
  A.chans.forEach(s => rolesFor(s, repBy[s.name] || 0).forEach(k => (seat[k] ??= []).push(s)));
  return Object.keys(seat).sort((a, b) => seat[b].length - seat[a].length).map(k => ({ k, chs: seat[k] }));
}

export function routers(A, users, mAsk = 4) {
  return Object.entries(A.people)
    .map(([id, p]) => ({ id, name: users[id] || id, ...p, hours: (p.pinged + p.answered) * mAsk / 60 / A.weeks }))
    .filter(p => p.pinged + p.answered > 0)
    .sort((a, b) => b.hours - a.hours);
}

export function planText(D, A, t) {
  let s = `Ando rollout plan (from Slack relay audit)\n${D.label}\n\nHeadline: ${t.hours.toFixed(1)} hrs/week of relay work, ${Math.round(t.share * 100)}% of human messages.\n\n`;
  roster(A).forEach((p, i) => { s += `${i + 1}. ${ROLE[p.k].t} → ${p.chs.map(c => '#' + c.name).join(', ')}\n   ${ROLE[p.k].does.join('\n   ')}\n`; });
  s += '\nSeed workspace memory with the top repeat questions:\n' + A.reps.slice(0, 5).map(c => `- "${clean(c.text, D.users)}" (${c.n}x)`).join('\n');
  return s;
}
