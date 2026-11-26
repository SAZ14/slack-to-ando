// Slack workspace export (.zip) → { users, ch, chIds, label }.
// Layout: users.json, channels.json, <channel>/<YYYY-MM-DD>.json, optionally nested in one top folder.
// JSZip is passed in so this module runs in the browser (CDN global) and in Node (npm package).

export async function parseExport(data, JSZip, fileName = 'export.zip') {
  const zip = await JSZip.loadAsync(data);
  const paths = Object.keys(zip.files).filter(p => !p.startsWith('__MACOSX/'));

  const usersPath = paths.find(p => /(^|\/)users\.json$/.test(p));
  if (!usersPath) throw new Error('No users.json found. Is this a Slack workspace export?');
  const base = usersPath.replace(/users\.json$/, '');
  const read = async p => JSON.parse(await zip.file(p).async('string'));

  const users = {};
  for (const u of await read(usersPath)) users[u.id] = u.real_name || u.profile?.real_name || u.name || u.id;

  const chIds = {};
  const chPath = paths.find(p => p === base + 'channels.json');
  if (chPath) for (const c of await read(chPath)) chIds[c.name] = c.id;

  const ch = {};
  for (const p of paths) {
    const m = p.slice(base.length).match(/^([^/]+)\/\d{4}-\d{2}-\d{2}\.json$/);
    if (!m || zip.files[p].dir) continue;
    try { (ch[m[1]] ??= []).push(...await read(p)); } catch { /* skip unreadable day files */ }
  }
  if (!Object.keys(ch).length) throw new Error('Found users.json but no channel folders.');
  for (const msgs of Object.values(ch)) msgs.sort((a, b) => a.ts - b.ts);

  return {
    users, ch, chIds,
    label: `${fileName}: ${Object.keys(users).length} people, ${Object.keys(ch).length} channels`,
  };
}
