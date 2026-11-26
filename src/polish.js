// Optional: rewrite extracted FAQ answers into clean wiki prose with Claude.
// Runs in the browser with the visitor's own Anthropic API key, which is kept in memory only.
// Only the extracted question/answer snippets are sent, never the whole export.
import { mdText } from './wiki.js';

export async function polishFaq(faq, users, { apiKey, model = 'claude-sonnet-5-5' }) {
  if (!apiKey) throw new Error('Paste an Anthropic API key first.');
  const items = faq.map(f => ({ id: f.id, question: f.question, answer: mdText(f.answer.text, users) }));
  const prompt = `You are writing a company wiki from Slack answers.
For each item, rewrite "answer" as one or two clear sentences a new hire can act on.
Keep every fact, name, number and Markdown link exactly. Do not add facts that are not in the answer.
Return only a JSON array of {"id","answer"} objects.

${JSON.stringify(items, null, 1)}`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model, max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Claude API error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text = (await res.json()).content?.map(c => c.text || '').join('') || '';
  const json = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
  const byId = new Map(json.map(x => [x.id, x.answer]));
  let n = 0;
  for (const f of faq) if (typeof byId.get(f.id) === 'string') { f.polished = byId.get(f.id); n++; }
  return n;
}
