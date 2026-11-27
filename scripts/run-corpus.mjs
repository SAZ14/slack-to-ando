// Run the audit and the wiki on a Slack export and print counts and timings.
//   node scripts/run-corpus.mjs path/to/export.zip [out.json]
import fs from 'fs';
import JSZip from 'jszip';
import { parseExport } from '../src/parse.js';
import { analyze, totals } from '../src/audit.js';
import { buildWiki } from '../src/wiki.js';

const file = process.argv[2];
const t0 = performance.now();
const D = await parseExport(fs.readFileSync(file), JSZip, file.split('/').pop());
const t1 = performance.now();
const A = analyze(D);
const t2 = performance.now();
const W = buildWiki(D, A);
const t3 = performance.now();
const t = totals(A);
const res = {
  file: D.label, messages: Object.values(D.ch).reduce((s, m) => s + m.length, 0), weeks: +A.weeks.toFixed(1),
  ms: { parse: Math.round(t1 - t0), audit: Math.round(t2 - t1), wiki: Math.round(t3 - t2) },
  share: +t.share.toFixed(3), asks: t.ask, repeatClusters: A.reps.length,
  owners: W.owners.length, decisions: W.decisions.length, faq: W.faq.length,
  heapMB: Math.round(process.memoryUsage().heapUsed / 1e6),
};
console.log(JSON.stringify(res));
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify({ D, A, W }, (k, v) => (v instanceof Set ? [...v] : v instanceof Map ? undefined : v)));
