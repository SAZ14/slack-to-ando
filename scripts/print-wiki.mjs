// Print the day-one wiki for a Slack export as Markdown.
//   node scripts/print-wiki.mjs [export.zip] [workspace.slack.com]
import fs from 'fs';
import JSZip from 'jszip';
import { parseExport } from '../src/parse.js';
import { analyze } from '../src/audit.js';
import { buildWiki, toMarkdown } from '../src/wiki.js';

const file = process.argv[2] || 'sample/northwind-slack-export.zip';
const D = await parseExport(fs.readFileSync(file), JSZip, file.split('/').pop());
const A = analyze(D);
console.log(toMarkdown(buildWiki(D, A), D, { domain: process.argv[3] || '', company: 'Team' }));
