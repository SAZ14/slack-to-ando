import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import JSZip from 'jszip';
import { parseExport } from '../src/parse.js';
import { analyze, totals, roster, RE_ASK } from '../src/audit.js';
import { buildWiki, toMarkdown, substantive } from '../src/wiki.js';
import { clean, permalink } from '../src/text.js';

const D = await parseExport(fs.readFileSync('sample/northwind-slack-export.zip'), JSZip, 'northwind.zip');
const A = analyze(D);
const W = buildWiki(D, A);
const byTopic = t => W.owners.find(o => o.topic.toLowerCase().includes(t));

test('parses the standard Slack export layout', () => {
  assert.equal(Object.keys(D.users).length, 12);
  assert.equal(Object.keys(D.ch).length, 8);
  assert.ok(D.chIds.engineering.startsWith('C'));
});

test('rejects a zip that is not a Slack export', async () => {
  const z = new JSZip(); z.file('hello.txt', 'hi');
  await assert.rejects(parseExport(await z.generateAsync({ type: 'uint8array' }), JSZip), /users\.json/);
});

test('audit finds relay work, repeat questions and an agent roster', () => {
  const t = totals(A);
  assert.ok(t.share > 0.2 && t.share < 0.8, `share ${t.share}`);
  assert.ok(A.reps.length >= 10);
  const kinds = roster(A).map(r => r.k);
  for (const k of ['answer', 'digest']) assert.ok(kinds.includes(k), k);
});

test('ask detection', () => {
  assert.ok(RE_ASK.test('who owns the billing service now?'));
  assert.ok(RE_ASK.test('can someone review my PR?'));
  assert.ok(!RE_ASK.test('merged, thanks'));
});

test('ownership follows the latest claim and keeps history', () => {
  const billing = byTopic('billing');
  assert.equal(D.users[billing.owner], 'Arjun Mehta');
  assert.deepEqual(billing.previous.map(id => D.users[id]), ['Dev Patel']);
  assert.equal(D.users[byTopic('payments').owner], 'Dev Patel');
  assert.equal(D.users[byTopic('deploy pipeline').owner], 'Arjun Mehta');
  assert.ok(billing.sources.length >= 3);
});

test('decisions are extracted and restatements merged', () => {
  const trial = W.decisions.filter(d => /14-day trial/i.test(d.statement));
  assert.equal(trial.length, 1);
  assert.ok(trial[0].sources.length > 1);
  assert.ok(W.decisions.some(d => /SQS/.test(d.statement)));
  assert.ok(!W.decisions.some(d => /\?$/.test(d.statement)));
});

test('FAQ picks substantive, current answers and merges paraphrases', () => {
  const sso = W.faq.filter(f => /sso/i.test(f.question));
  assert.equal(sso.length, 1, 'SSO questions merged');
  assert.match(sso[0].answer.text, /Reset config/);
  const billing = W.faq.find(f => /billing/i.test(f.question));
  assert.match(clean(billing.answer.text, D.users), /Arjun/);
  assert.ok(billing.superseded, 'old billing answer flagged');
  for (const f of W.faq) assert.ok(substantive(f.answer.text), f.question);
});

test('generic replies are not answers', () => {
  for (const t of ['on it', "I'll dm you", '+1, would like to know too', 'looking']) assert.ok(!substantive(t), t);
});

test('every wiki entry cites a source message', () => {
  for (const e of [...W.owners, ...W.decisions, ...W.faq]) assert.ok(e.sources.length > 0);
});

test('markdown output with permalinks', () => {
  const md = toMarkdown(W, D, { domain: 'northwind.slack.com', company: 'Northwind' });
  assert.match(md, /^# Northwind wiki/);
  assert.match(md, /## Who owns what[\s\S]*## Decisions[\s\S]*## Answers to repeat questions/);
  assert.match(md, /https:\/\/northwind\.slack\.com\/archives\/C\w+\/p\d{16}/);
  assert.match(md, /\[Refund policy\]\(https:\/\/www\.notion\.so/);
});

test('permalink format', () => {
  assert.equal(permalink('acme.slack.com', 'C1', { ts: '1700000000.123456' }), 'https://acme.slack.com/archives/C1/p1700000000123456');
  assert.equal(permalink('', 'C1', { ts: '1' }), '');
});
