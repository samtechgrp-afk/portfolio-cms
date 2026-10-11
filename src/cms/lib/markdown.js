import { highlight } from './highlight.js';

// Small, dependency-free Markdown renderer. All input is HTML-escaped first,
// and only http(s) links and images are allowed, so the output is safe to inject.
const esc = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function inline(raw) {
  let s = esc(raw);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  // Inline styling: ==highlight==, ++underline++, ~~strike~~, [text]{#0057ff} colour, [text]{font:Brand Sans} font.
  s = s.replace(/\[([^\]]+)\]\{(#[0-9a-fA-F]{6})\}/g, '<span style="color:$2">$1</span>');
  s = s.replace(/\[([^\]]+)\]\{font:([A-Za-z0-9][A-Za-z0-9 _-]{0,59})\}/g, '<span style="font-family:&quot;$2&quot;,sans-serif">$1</span>');
  s = s.replace(/==([^=]+)==/g, '<mark>$1</mark>');
  s = s.replace(/\+\+([^+]+)\+\+/g, '<u>$1</u>');
  s = s.replace(/~~([^~]+)~~/g, '<s>$1</s>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return s;
}

export function renderMarkdown(src = '') {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let para = [];
  let list = null; // 'ul' | 'ol'
  let code = null;
  let codeLang = '';

  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`</${list}>`); list = null; } };

  for (const line of lines) {
    if (code !== null) {
      if (line.startsWith('```')) { out.push(`<pre class="pb-code"><code class="lang-${esc(codeLang)}">${highlight(code.join('\n'), codeLang)}</code></pre>`); code = null; }
      else code.push(line);
      continue;
    }
    if (line.startsWith('```')) { flushPara(); flushList(); code = []; codeLang = line.slice(3).trim().split(/\s+/)[0].replace(/[^A-Za-z0-9+-]/g, ''); continue; }

    const h = line.match(/^(#{1,3})\s+(.*)$/);
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    const bq = line.match(/^>\s?(.*)$/);

    if (h) { flushPara(); flushList(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); }
    else if (/^---+$/.test(line.trim())) { flushPara(); flushList(); out.push('<hr>'); }
    else if (ul || ol) {
      flushPara();
      const type = ul ? 'ul' : 'ol';
      if (list !== type) { flushList(); out.push(`<${type}>`); list = type; }
      out.push(`<li>${inline((ul || ol)[1])}</li>`);
    }
    else if (bq) { flushPara(); flushList(); out.push(`<blockquote>${inline(bq[1])}</blockquote>`); }
    else if (!line.trim()) { flushPara(); flushList(); }
    else { flushList(); para.push(line.trim()); }
  }
  if (code !== null) out.push(`<pre class="pb-code"><code class="lang-${esc(codeLang)}">${highlight(code.join('\n'), codeLang)}</code></pre>`);
  flushPara(); flushList();
  return out.join('\n');
}
