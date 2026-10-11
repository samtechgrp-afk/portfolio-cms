/* Tiny syntax highlighter (no dependency). Returns HTML-safe markup with <span class="tok-*"> wrappers.
   Supported: js, ts, jsx, tsx, json, css, html, xml, python, bash, sql. Anything else is returned escaped. */
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const words = (list) => `\\b(?:${list.join('|')})\\b`;
const STR = String.raw`"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'`;
const NUM = String.raw`\b\d+(?:\.\d+)?(?:[a-z%]+)?\b`;

// Each language is one regex; capture groups map, in order, to token classes.
const JS = {
  re: new RegExp(`(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)|(${STR}|\`(?:\\\\.|[^\`\\\\])*\`)|(${NUM})|(${words(['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'class', 'extends', 'import', 'from', 'export', 'default', 'new', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'switch', 'case', 'break', 'continue', 'typeof', 'instanceof', 'in', 'of', 'true', 'false', 'null', 'undefined', 'this', 'interface', 'type', 'enum', 'public', 'private'])})`, 'g'),
  classes: ['c', 's', 'n', 'k'],
};
const LANGS = {
  js: JS,
  json: { re: new RegExp(`(${STR})|(${NUM})|(${words(['true', 'false', 'null'])})`, 'g'), classes: ['s', 'n', 'k'] },
  css: { re: new RegExp(`(\\/\\*[\\s\\S]*?\\*\\/)|(${STR})|(#[0-9a-fA-F]{3,8}\\b|${NUM})|(@[\\w-]+|![a-z]+)`, 'g'), classes: ['c', 's', 'n', 'k'] },
  html: { re: new RegExp(`(<!--[\\s\\S]*?-->)|(${STR})|(<\\/?[A-Za-z][\\w:-]*|\\/?>)`, 'g'), classes: ['c', 's', 't'] },
  python: {
    re: new RegExp(`(#[^\\n]*)|("""[\\s\\S]*?"""|'''[\\s\\S]*?'''|${STR})|(${NUM})|(${words(['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'not', 'and', 'or', 'import', 'from', 'as', 'with', 'try', 'except', 'finally', 'raise', 'lambda', 'None', 'True', 'False', 'pass', 'yield', 'async', 'await'])})`, 'g'),
    classes: ['c', 's', 'n', 'k'],
  },
  bash: {
    re: new RegExp(`(#[^\\n]*)|(${STR})|(${NUM})|(${words(['if', 'then', 'else', 'elif', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac', 'function', 'echo', 'cd', 'export', 'git', 'npm', 'npx', 'sudo', 'curl', 'mkdir', 'rm', 'cp', 'mv'])})`, 'g'),
    classes: ['c', 's', 'n', 'k'],
  },
  sql: {
    re: new RegExp(`(--[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)|('(?:''|[^'])*')|(${NUM})|((?:${['select', 'from', 'where', 'insert', 'into', 'values', 'update', 'set', 'delete', 'create', 'table', 'alter', 'drop', 'index', 'join', 'left', 'right', 'inner', 'outer', 'on', 'group', 'by', 'order', 'having', 'limit', 'and', 'or', 'not', 'null', 'primary', 'key', 'default', 'unique', 'check', 'as', 'distinct', 'policy', 'to', 'using', 'with'].map((w) => `\\b${w}\\b`).join('|')}))`, 'gi'),
    classes: ['c', 's', 'n', 'k'],
  },
};
const ALIASES = { javascript: 'js', ts: 'js', typescript: 'js', jsx: 'js', tsx: 'js', mjs: 'js', xml: 'html', svg: 'html', py: 'python', sh: 'bash', shell: 'bash', zsh: 'bash', postgres: 'sql', postgresql: 'sql', scss: 'css' };

export const LANGUAGES = ['js', 'ts', 'jsx', 'tsx', 'json', 'css', 'html', 'python', 'bash', 'sql', 'text'];

export function highlight(code, lang = '') {
  const key = ALIASES[lang.toLowerCase()] || lang.toLowerCase();
  const spec = LANGS[key];
  if (!spec) return esc(code);
  const re = new RegExp(spec.re.source, spec.re.flags);
  let out = '';
  let last = 0;
  let m;
  while ((m = re.exec(code))) {
    if (m[0] === '') { re.lastIndex += 1; continue; }
    const idx = m.findIndex((g, i) => i > 0 && g !== undefined);
    out += esc(code.slice(last, m.index)) + `<span class="tok-${spec.classes[idx - 1]}">${esc(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  return out + esc(code.slice(last));
}
