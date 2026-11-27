// Text helpers shared by the audit and the wiki.

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const STOP = new Set(('a an the is are was to of for in on at it my our we i you can could would someone anyone does do how who where what ' +
  'any know have this that again now with me get please pls hey quick these days still latest ' +
  // greetings and help-seeking filler that carries no topic
  'hello everyone everybody guys folks all team help question questions beginner newbie noob asked ask asking problem issue ' +
  'thanks thank possible way best better good want wanted trying try tried need like using use get make work working doesn does ' +
  'there here just really something someone somebody anybody idea ideas wondering curious would should').split(' '));

/** Slack mrkdwn → plain text: <@U1> → @Name, <url|label> → label, <url> → url. */
export function clean(t, users = {}) {
  return String(t || '')
    .replace(/<@([A-Z0-9]+)>/g, (_, id) => '@' + firstName(users[id] || 'someone'))
    .replace(/<#[A-Z0-9]+\|([^>]+)>/g, '#$1')
    .replace(/<([^|>]+)\|([^>]+)>/g, '$2')
    .replace(/<(https?:[^>]+)>/g, '$1');
}

/** Links in a Slack message as {url, label}. */
export function links(t) {
  return [...String(t || '').matchAll(/<(https?:[^|>]+)(?:\|([^>]+))?>/g)].map(m => ({ url: m[1], label: m[2] || m[1] }));
}

export const firstName = n => String(n || '').split(' ')[0];

export const toks = t => String(t || '').toLowerCase()
  .replace(/```[\s\S]*?(```|$)/g, ' ') // pasted code blocks
  .replace(/<[^>]*>/g, ' ').replace(/[^a-z0-9' ]/g, ' ')
  .split(/\s+/).filter(w => w.length > 2 && !STOP.has(w));

export function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  let i = 0;
  for (const x of A) if (B.has(x)) i++;
  return i / (A.size + B.size - i || 1);
}

export const day = ts => new Date(+ts * 1000).toISOString().slice(0, 10);

/** Slack permalink for a message, if the workspace URL is known. */
export function permalink(domain, chId, m) {
  if (!domain || !chId || !m?.ts) return '';
  const host = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  let u = `https://${host}/archives/${chId}/p${String(m.ts).replace('.', '')}`;
  if (m.thread_ts && m.thread_ts !== m.ts) u += `?thread_ts=${m.thread_ts}&cid=${chId}`;
  return u;
}
