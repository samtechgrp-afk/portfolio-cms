// Small, dependency-free Markdown renderer. All input is HTML-escaped first,
// and only http(s) links and images are allowed, so the output is safe to inject.
const esc = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function inline(raw) {
  let s = esc(raw);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
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

  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`</${list}>`); list = null; } };

  for (const line of lines) {
    if (code !== null) {
      if (line.startsWith('```')) { out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`); code = null; }
      else code.push(line);
      continue;
    }
    if (line.startsWith('```')) { flushPara(); flushList(); code = []; continue; }

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
  if (code !== null) out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
  flushPara(); flushList();
  return out.join('\n');
}
