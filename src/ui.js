import { parseExport } from './parse.js';
import { analyze, totals, roster, routers, planText, ROLE } from './audit.js';
import { buildWiki, toMarkdown } from './wiki.js';
import { polishFaq } from './polish.js';
import { esc, clean, day, firstName, permalink } from './text.js';

const $ = id => document.getElementById(id);
const S = { D: null, A: null, W: null };
const store = { get: k => { try { return localStorage.getItem(k) || ''; } catch { return ''; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } } };
const name = id => S.D.users[id] || id || 'someone';
const domain = () => $('domain').value.trim();

/** Slack text → safe HTML with real links and @names. */
function rich(t) {
  t = String(t || '');
  let out = '', last = 0;
  for (const m of t.matchAll(/<(https?:[^|>]+)(?:\|([^>]+))?>|<@([A-Z0-9]+)>/g)) {
    out += esc(t.slice(last, m.index));
    out += m[3] ? '@' + esc(firstName(name(m[3])))
      : `<a href="${esc(m[1])}" target="_blank" rel="noopener">${esc(m[2] || m[1].replace(/^https?:\/\/(www\.)?/, ''))}</a>`;
    last = m.index + m[0].length;
  }
  return (out + esc(t.slice(last))).replace(/`([^`]+)`/g, '<code>$1</code>');
}

function sources(list, label = 'sources') {
  const items = list.map(s => {
    const url = permalink(domain(), S.D.chIds?.[s.ch], s.m);
    const head = `<b>#${esc(s.ch)}</b> · ${esc(name(s.m.user))} · <span class="when">${day(s.m.ts)}</span>${url ? ` · <a href="${esc(url)}" target="_blank" rel="noopener">open in Slack</a>` : ''}`;
    return `<li>${head}<br>${rich(s.m.text)}</li>`;
  }).join('');
  return `<details class="src"><summary>${list.length} ${list.length === 1 ? label.replace(/s$/, '') : label}</summary><ul>${items}</ul></details>`;
}

// ---------- audit ----------
function renderAudit() {
  const A = S.A, mA = +$('mAsk').value, mS = +$('mStat').value;
  $('vAsk').textContent = mA; $('vStat').textContent = mS;
  const t = totals(A, mA, mS);
  $('kHours').textContent = t.hours < 10 ? t.hours.toFixed(1) : Math.round(t.hours);
  $('kShare').textContent = Math.round(100 * t.share) + '%';
  $('kRepeat').textContent = A.reps.length;
  const rs = routers(A, S.D.users, mA);
  const lead = [...rs].sort((a, b) => b.answered - a.answered)[0];
  $('finding').textContent = lead?.answered ? `${firstName(lead.name)} answered ${lead.answered} questions in ${Math.round(A.weeks)} weeks. An agent with the wiki could have answered most of them.` : '';

  const top = A.chans.slice(0, 12), mx = Math.max(...top.map(s => s.human), 1);
  $('chans').innerHTML = top.map(s => {
    const pct = v => (100 * v / s.human).toFixed(1) + '%', rest = s.human - s.ask - s.stat - s.tool;
    return `<div class="ch"><div class="n">#${esc(s.name)}</div><div class="bar" title="${s.ask} asks, ${s.stat} status, ${s.tool} tool glue, ${rest} conversation" style="width:${(100 * s.human / mx).toFixed(1)}%">` +
      `<span style="width:${pct(s.ask)};background:var(--ask)"></span><span style="width:${pct(s.stat)};background:var(--stat)"></span><span style="width:${pct(s.tool)};background:var(--tool)"></span><span style="width:${pct(rest)}"></span></div>` +
      `<div class="v">${Math.round(100 * (s.ask + s.stat + s.tool) / s.human)}% relay</div></div>`;
  }).join('');

  const plan = roster(A);
  $('roster').innerHTML = plan.length ? plan.map(({ k, chs }) => {
    const load = chs.reduce((sum, s) => sum + (k === 'digest' ? s.stat * mS : s.ask * mA), 0) / 60 / A.weeks;
    return `<div class="agent"><h3>${ROLE[k].t}</h3><div class="ch2">Seat in ${chs.map(s => '#' + esc(s.name)).join(', ')}</div><ul>${ROLE[k].does.map(d => `<li>${d}</li>`).join('')}</ul><div class="why">Takes about ${load.toFixed(1)} hrs/week off the humans in these channels.</div></div>`;
  }).join('') : '<p class="empty">Not enough relay work in this export to justify an agent.</p>';

  $('reps').innerHTML = A.reps.slice(0, 8).map(c => `<tr><td>"${esc(clean(c.text, S.D.users))}"</td><td class="num">${c.n}</td><td>${[...c.chs].map(x => `<span class="tag">#${esc(x)}</span>`).join('')}</td></tr>`).join('')
    || '<tr><td colspan="3" class="empty">No repeated questions found.</td></tr>';
  $('routers').innerHTML = rs.slice(0, 6).map(p => `<tr><td>${esc(p.name)}</td><td class="num">${p.pinged}</td><td class="num">${p.answered}</td><td class="num">${p.hours.toFixed(1)}</td></tr>`).join('')
    || '<tr><td colspan="4" class="empty">No thread answers found.</td></tr>';
}

// ---------- wiki ----------
function renderWiki() {
  const W = S.W;
  $('wOwners').textContent = W.owners.length;
  $('wDecisions').textContent = W.decisions.length;
  $('wFaq').textContent = W.faq.length;

  $('owners').innerHTML = W.owners.map(o => `<tr><td><b>${esc(cap(o.topic))}</b></td><td>${esc(name(o.owner))}</td><td class="nw">${day(o.since)}</td><td>${esc(o.previous.map(name).join(', '))}</td><td>${sources(o.sources, 'messages')}</td></tr>`).join('')
    || '<tr><td colspan="5" class="empty">No ownership found. Try a longer export.</td></tr>';

  $('decisions').innerHTML = W.decisions.map(d => `<li><div class="d">${day(d.ts)}</div><div><div class="s">${rich(cap(d.statement))}</div><div class="sm mute">${esc(name(d.by))} in #${esc(d.ch)}${d.sources.length > 1 ? ` · restated ${d.sources.length - 1}×` : ''}</div>${sources(d.sources, 'messages')}</div></li>`).join('')
    || '<li class="empty">No decisions found.</li>';

  $('faq').innerHTML = W.faq.map(f => `<article class="qa"><h3>${esc(cap(f.question))}</h3>` +
    `<p class="a">${f.polished ? richMd(f.polished) : rich(f.answer.text)}</p>` +
    `<div class="meta">Asked ${f.asked}× in ${f.chs.map(c => '#' + esc(c)).join(', ')}. Answered by ${esc(name(f.answeredBy))}${f.agree > 1 ? `, confirmed in ${f.agree} threads` : ''}.${f.polished ? ' Polished by Claude.' : ''}</div>` +
    (f.superseded ? `<p class="sm"><span class="flag">Answer changed</span> Earlier: "${rich(f.superseded.text)}" (${day(f.superseded.ts)})</p>` : '') +
    (f.also?.length ? `<p class="sm mute">Also asked as: ${f.also.map(q => `"${esc(q)}"`).join(', ')}</p>` : '') +
    sources(f.sources, 'sources') + '</article>').join('')
    || '<p class="empty">No answered repeat questions found.</p>';
}
const cap = s => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
const richMd = t => esc(t).replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (_, l, u) => `<a href="${u}" target="_blank" rel="noopener">${l}</a>`);
const markdown = () => toMarkdown(S.W, S.D, { domain: domain(), company: S.company });

// ---------- loading ----------
function load(D, company) {
  S.D = D; S.A = analyze(D); S.W = buildWiki(D, S.A); S.company = company;
  const t = totals(S.A);
  $('err').textContent = '';
  $('src').textContent = `${D.label} · ${S.A.weeks.toFixed(1)} weeks · ${t.human.toLocaleString()} human messages`;
  renderAudit(); renderWiki(); labelStacks();
}
async function handle(file) {
  if (!file) return;
  $('dropLabel').textContent = `Reading ${file.name}…`;
  try { load(await parseExport(file, window.JSZip, file.name), file.name.replace(/(-slack)?(-export)?\.zip$/i, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Your team'); }
  catch (e) { $('err').textContent = e.message || 'Could not read that file.'; }
  finally { $('dropLabel').textContent = 'Drop your Slack export (.zip)'; }
}
async function loadSample() {
  $('dropLabel').textContent = 'Loading sample…';
  try {
    const res = await fetch('sample/northwind-slack-export.zip');
    if (!res.ok) throw new Error('Sample not found');
    load(await parseExport(await res.arrayBuffer(), window.JSZip, 'Sample: Northwind (invented)'), 'Northwind');
  } catch { $('err').textContent = 'Could not load the sample here. Serve the folder over http (npm run serve) or drop an export.'; }
  finally { $('dropLabel').textContent = 'Drop your Slack export (.zip)'; }
}

function labelStacks() {
  for (const c of document.querySelectorAll('.stack td')) {
    let i = 0, p = c;
    while ((p = p.previousElementSibling)) i += p.colSpan;
    c.dataset.l = c.closest('table').rows[0].cells[i]?.textContent || '';
  }
}

function route() {
  const v = location.hash === '#wiki' ? 'wiki' : 'audit';
  $('view-audit').hidden = v !== 'audit'; $('view-wiki').hidden = v !== 'wiki';
  for (const t of ['audit', 'wiki']) {
    if (t === v) $('tab-' + t).setAttribute('aria-current', 'page'); else $('tab-' + t).removeAttribute('aria-current');
  }
}

async function copy(text, msgEl, ok) {
  try { await navigator.clipboard.writeText(text); $(msgEl).textContent = ok; }
  catch { $(msgEl).textContent = 'The browser blocked the clipboard.'; }
}

// ---------- events ----------
const drop = $('drop'), fi = $('file');
drop.addEventListener('click', () => fi.click());
drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fi.click(); } });
fi.addEventListener('change', () => handle(fi.files[0]));
drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('on'); });
drop.addEventListener('dragleave', () => drop.classList.remove('on'));
drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('on'); handle(e.dataTransfer.files[0]); });
$('sample').addEventListener('click', loadSample);
$('mAsk').addEventListener('input', () => S.A && renderAudit());
$('mStat').addEventListener('input', () => S.A && renderAudit());
$('copyPlan').addEventListener('click', () => S.A && copy(planText(S.D, S.A, totals(S.A, +$('mAsk').value, +$('mStat').value)), 'copiedPlan', 'Copied. Paste it into an Ando channel.'));
$('domain').value = store.get('slack-domain');
$('domain').addEventListener('input', () => { store.set('slack-domain', domain()); if (S.W) { renderWiki(); labelStacks(); } });
$('copyMd').addEventListener('click', () => S.W && copy(markdown(), 'mdMsg', 'Copied wiki Markdown.'));
$('dl').addEventListener('click', () => {
  if (!S.W) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([markdown()], { type: 'text/markdown' }));
  a.download = 'wiki.md'; document.body.append(a); a.click(); a.remove();
  $('mdMsg').textContent = 'If nothing downloaded, use Copy Markdown.';
});
$('polish').addEventListener('click', async () => {
  if (!S.W) return;
  const b = $('polish'); b.disabled = true; $('polishMsg').textContent = 'Asking Claude…';
  try { const n = await polishFaq(S.W.faq, S.D.users, { apiKey: $('apiKey').value.trim() }); $('polishMsg').textContent = `Polished ${n} answers.`; renderWiki(); labelStacks(); }
  catch (e) { $('polishMsg').textContent = e.message; }
  finally { b.disabled = false; }
});
addEventListener('hashchange', route);
route();
loadSample();
