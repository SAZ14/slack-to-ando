// Day-one wiki: who owns what, decisions, and answers to repeat questions.
// Every entry keeps the Slack messages it came from, so a reader (or an agent) can check it.
import { toks, jaccard, clean, day, permalink, firstName } from './text.js';
import { threads, isHuman, isReply } from './audit.js';

const GENERIC = /^(on it|looking|i'?ll dm|\+1|same|thanks|thank you|ty|me too|bump|same question|good q\b)/i;
const NOISE = new Set(['service', 'now', 'these', 'days', 'again', 'week', 'month', 'starting', 'today', 'for', 'the']);

/** A reply that actually carries information, not "on it" or "+1". */
export function substantive(text) {
  const t = String(text || '').trim();
  return t.replace(/<[^>]+>/g, 'link').length >= 20 && !GENERIC.test(t);
}

const topicKey = t => toks(t).filter(w => !NOISE.has(w)).sort().join(' ');
const tidyTopic = t => String(t || '').replace(/^(the|our)\s+/i, '').replace(/[\s,.;:!]+$/, '').trim();

// ---------- who owns what ----------
const Q_OWNER = /\bwho(?:'s| is)?\s+(?:owns|own|runs|handles|on call for|is on call for)\s+(?:the\s+)?(.+?)(?:\s+(?:now|these days|again|this week|this month))?\?/i;
const Q_ONCALL = /\bwho(?:'s| is)?\s+(?:on call|on-call)\s+for\s+(?:the\s+)?(.+?)(?:\s+(?:now|this week|this month))?\?/i;
const STOP_TAIL = /(?:\s+(?:now|for now|starting\b.*|since\b.*|through\b.*|this week.*|this month.*|from\b.*|as of\b.*|these days)|[,.;!].*)$/i;
const CLAIMS = [
  // "<@U> is on call for payments through end of month"
  { re: /<@([A-Z0-9]+)>\s+(?:is\s+)?on[- ]call\s+for\s+(?:the\s+)?(.+)/i, who: 'mention', fmt: t => `${t} on-call` },
  // "<@U> has payments on-call this month"
  { re: /<@([A-Z0-9]+)>\s+has\s+(.+?)\s+on[- ]call/i, who: 'mention', fmt: t => `${t} on-call` },
  // "<@U> owns billing now", "<@U> owns it now"
  { re: /<@([A-Z0-9]+)>\s+(?:now\s+)?(?:owns|runs|handles|is the owner of)\s+(?:the\s+)?(.+)/i, who: 'mention' },
  // "I own the pricing page copy", "I'm taking over the deploy pipeline from Dev"
  { re: /\bI(?:'m| am)?\s+(?:now\s+)?(?:own|run|handle|taking over|take over|the owner of)\s+(?:the\s+)?(.+)/i, who: 'author' },
];

function claimIn(m, qTopic) {
  const tx = m.text || '';
  for (const c of CLAIMS) {
    const x = tx.match(c.re);
    if (!x) continue;
    const owner = c.who === 'mention' ? x[1] : m.user;
    let topic = tidyTopic((c.who === 'mention' ? x[2] : x[1]).replace(STOP_TAIL, ''));
    if (/^(it|that|this|them)$/i.test(topic)) topic = qTopic || '';
    if (!topic || topic.split(/\s+/).length > 6) continue;
    return { owner, topic: c.fmt ? c.fmt(topic) : topic };
  }
  // "that's me" / "me" in reply to a who-owns question
  if (qTopic && /^(that'?s me|it'?s me|me\b)/i.test(tx.trim())) return { owner: m.user, topic: qTopic };
  return null;
}

export function owners(D, T = threads(D)) {
  const groups = new Map();
  const add = (claim, ch, m, question) => {
    const k = topicKey(claim.topic);
    if (!k) return;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push({ ...claim, ch, m, question });
  };
  for (const [ch, msgs] of Object.entries(D.ch))
    for (const m of msgs) {
      if (!isHuman(m) || isReply(m)) continue;
      const tx = m.text || '';
      const q = tx.match(Q_ONCALL) || tx.match(Q_OWNER);
      if (q) {
        const qTopic = tidyTopic(q[1]) + (Q_ONCALL.test(tx) ? ' on-call' : '');
        for (const r of T.get(`${ch}|${m.ts}`) || []) {
          const c = claimIn(r, qTopic);
          if (c) add(c, ch, r, m);
        }
      } else if (!tx.includes('?')) {
        const c = claimIn(m, '');
        if (c) add(c, ch, m, null);
      }
      if (!q) for (const r of T.get(`${ch}|${m.ts}`) || []) {
        const c = claimIn(r, '');
        if (c) add(c, ch, r, m);
      }
    }
  return [...groups.values()].map(cl => {
    cl.sort((a, b) => a.m.ts - b.m.ts);
    const cur = cl[cl.length - 1];
    const since = cl.find((c, i) => c.owner === cur.owner && (i === 0 || cl[i - 1].owner !== cur.owner)) || cur;
    const previous = [...new Set(cl.filter(c => c.owner !== cur.owner).map(c => c.owner))];
    return {
      topic: cl.map(c => c.topic).sort((a, b) => b.length - a.length)[0],
      owner: cur.owner, since: since.m.ts, previous,
      sources: cl.map(c => ({ ch: c.ch, m: c.m })),
    };
  }).sort((a, b) => b.sources.length - a.sources.length || a.topic.localeCompare(b.topic));
}

// ---------- decisions ----------
const DECISION = [
  /^\s*(?:decision(?:\s+from\s+[^:]+)?|decided|final call|agreed)\s*:\s*(.+)/i,
  /\bwe(?:'ve| have)?\s+decided\s+(?:to\s+|on\s+)?(.+)/i,
  /\b(?:we're|we are|we'll|we will)\s+go(?:ing)?\s+with\s+(.+)/i,
];

export function decisions(D) {
  const out = [];
  for (const [ch, msgs] of Object.entries(D.ch))
    for (const m of msgs) {
      if (!isHuman(m)) continue;
      const tx = (m.text || '').trim();
      if (/\?\s*$/.test(tx)) continue;
      const hit = DECISION.map(re => tx.match(re)).find(Boolean);
      if (!hit) continue;
      const statement = hit[1].replace(/[.\s]*(notes|details|doc)\s+(are\s+)?in\s+<[^>]+>\.?$/i, '').trim();
      const tk = toks(statement);
      const same = out.find(d => d.ch === ch && jaccard(d.tk, tk) >= 0.5);
      if (same) same.sources.push({ ch, m });
      else out.push({ ch, statement, tk, sources: [{ ch, m }] });
    }
  for (const d of out) { d.sources.sort((a, b) => a.m.ts - b.m.ts); d.ts = d.sources[0].m.ts; d.by = d.sources[0].m.user; }
  return out.sort((a, b) => b.ts - a.ts);
}

// ---------- answers to repeat questions ----------
export function faq(D, A, T = threads(D)) {
  const out = [];
  for (const c of A.reps) {
    const answers = [];
    for (const it of c.items)
      for (const r of T.get(`${it.ch}|${it.m.ts}`) || [])
        if (r.user !== it.m.user && substantive(r.text)) answers.push({ ch: it.ch, m: r, q: it.m });
    if (!answers.length) continue;
    answers.sort((a, b) => a.m.ts - b.m.ts);
    const latest = answers[answers.length - 1];
    const lt = toks(latest.m.text);
    const agree = answers.filter(a => jaccard(toks(a.m.text), lt) >= 0.3 || a.m.user === latest.m.user);
    const superseded = answers.filter(a => !agree.includes(a));
    // Question phrasing: the most common wording in the cluster.
    const counts = {};
    c.items.forEach(it => { const k = clean(it.m.text, D.users); counts[k] = (counts[k] || 0) + 1; });
    const question = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    out.push({
      id: 'q' + out.length, question, asked: c.n, chs: [...c.chs],
      answer: latest.m, answeredBy: latest.m.user, agree: agree.length,
      superseded: superseded.length ? superseded[superseded.length - 1].m : null,
      sources: [...agree.slice(-3), ...superseded.slice(-1)].map(a => ({ ch: a.ch, m: a.m })),
      askedAt: { ch: c.items[0].ch, m: c.items[0].m },
      polished: null,
    });
  }
  // Differently worded questions with the same answer are one entry.
  const merged = [];
  for (const f of out) {
    const same = merged.find(g => g.answeredBy === f.answeredBy && jaccard(toks(g.answer.text), toks(f.answer.text)) >= 0.6);
    if (!same) { merged.push(f); continue; }
    same.asked += f.asked; same.agree += f.agree;
    same.chs = [...new Set([...same.chs, ...f.chs])];
    same.also = [...(same.also || []), f.question];
    if (f.answer.ts > same.answer.ts) same.answer = f.answer;
  }
  merged.sort((a, b) => b.asked - a.asked);
  merged.forEach((f, i) => (f.id = 'q' + i));
  return merged;
}

export function buildWiki(D, A) {
  const T = threads(D);
  return { owners: owners(D, T), decisions: decisions(D), faq: faq(D, A, T) };
}

// ---------- markdown ----------
export const mdText = (t, users) => String(t || '')
  .replace(/<(https?:[^|>]+)\|([^>]+)>/g, '[$2]($1)')
  .replace(/<(https?:[^>]+)>/g, '<$1>')
  .replace(/<@([A-Z0-9]+)>/g, (_, id) => '@' + firstName(users[id] || 'someone'));

export function toMarkdown(W, D, { domain = '', company = 'Your team' } = {}) {
  const name = id => D.users[id] || id;
  const src = s => {
    const url = permalink(domain, D.chIds?.[s.ch], s.m);
    const label = `#${s.ch}, ${firstName(name(s.m.user))}, ${day(s.m.ts)}`;
    return url ? `[${label}](${url})` : label;
  };
  const L = [`# ${company} wiki`, '', `_Generated from a Slack export (${D.label}). Every line cites the messages it came from._`, ''];
  L.push('## Who owns what', '');
  for (const o of W.owners) {
    const prev = o.previous.length ? `; previously ${o.previous.map(name).join(', ')}` : '';
    L.push(`- **${cap(o.topic)}**: ${name(o.owner)} (since ${day(o.since)}${prev}). Sources: ${o.sources.slice(-3).map(src).join(' · ')}`);
  }
  L.push('', '## Decisions', '');
  for (const d of W.decisions)
    L.push(`- **${day(d.ts)}**: ${cap(mdText(d.statement, D.users))} (${name(d.by)} in #${d.ch}${d.sources.length > 1 ? `, restated ${d.sources.length - 1}x` : ''}). Source: ${src(d.sources[0])}`);
  L.push('', '## Answers to repeat questions', '');
  for (const f of W.faq) {
    L.push(`### ${cap(f.question)}`, '', f.polished || mdText(f.answer.text, D.users), '',
      `_Asked ${f.asked}x in ${f.chs.map(c => '#' + c).join(', ')}. Answered by ${name(f.answeredBy)}${f.agree > 1 ? `, confirmed in ${f.agree} threads` : ''}${f.superseded ? '. An earlier, different answer was superseded' : ''}. Sources: ${f.sources.slice(0, 3).map(src).join(' · ')}_`, '');
  }
  return L.join('\n');
}

const cap = s => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
