// Print random samples of repeat-question groups, wiki answers, or owners/decisions from the
// converted MSR 2020 corpus, for manual checking.
//   EXPORTS=corpus-exports SEED=123 node scripts/sample-corpus.mjs clusters 10
//   EXPORTS=corpus-exports SEED=777 node scripts/sample-corpus.mjs faq 10
//   EXPORTS=corpus-exports node scripts/sample-corpus.mjs od 0
import fs from 'fs'; import JSZip from 'jszip';
import { parseExport } from '../src/parse.js';
import { analyze } from '../src/audit.js';
import { buildWiki } from '../src/wiki.js';
import { clean } from '../src/text.js';
const kind = process.argv[2], n = +process.argv[3];
let seed = +(process.env.SEED || 11); const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = (a, k) => { const c = [...a], o = []; while (o.length < k && c.length) o.push(c.splice(Math.floor(r() * c.length), 1)[0]); return o; };
const t = (s, k = 170) => clean(s, D.users).replace(/\s+/g, ' ').slice(0, k);
let D;
for (const c of ['racket', 'clojurians', 'pythondev', 'elmlang']) {
  D = await parseExport(fs.readFileSync(`${process.env.EXPORTS || 'corpus-exports'}/${c}-slack-export.zip`), JSZip);
  const A = analyze(D, { similarity: +(process.env.SIM || 0.5) }), W = buildWiki(D, A);
  const per = c === 'racket' ? 3 : n;
  if (kind === 'clusters') pick(A.reps, per).forEach((cl, i) => { console.log(`\n[${c} C${i}] n=${cl.n}`); cl.items.slice(0, 3).forEach(it => console.log('   Q:', t(it.m.text))); });
  if (kind === 'faq') pick(W.faq, per).forEach((f, i) => console.log(`\n[${c} F${i}] asked=${f.asked}\n   Q: ${t(f.question)}\n   A: ${t(f.answer.text, 220)}`));
  if (kind === 'od') { W.owners.forEach(o => console.log(`[${c} OWN] ${o.topic} => ${D.users[o.owner]} | ${t(o.sources[0].m.text, 140)}`)); W.decisions.forEach(d => console.log(`[${c} DEC] ${t(d.sources[0].m.text, 160)}`)); }
}
