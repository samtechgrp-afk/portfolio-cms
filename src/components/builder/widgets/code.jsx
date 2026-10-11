import { useMemo, useState } from 'react';
import { LANGUAGES, highlight } from '../../../cms/lib/highlight.js';
import { LinkWrap, Placeholder, SandboxFrame, num } from './shared.jsx';

const SHORTCODES = {
  year: () => String(new Date().getFullYear()),
  date: () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
  project_title: (_a, ctx) => ctx?.projectTitle || '',
  br: (_a, _c, k) => <br key={k} />,
  link: (a, _c, k) => <LinkWrap key={k} href={a.url} newTab>{a.text || a.url}</LinkWrap>,
  email: (a, _c, k) => <LinkWrap key={k} href={`mailto:${a.address || ''}`}>{a.text || a.address}</LinkWrap>,
  button: (a, _c, k) => <LinkWrap key={k} href={a.url} className="pb-btn is-fill is-md">{a.text || 'Button'}</LinkWrap>,
};

/** Replaces [name attr="value"] tokens with React nodes. Output is never injected as HTML. */
function renderShortcodes(text, ctx) {
  const re = /\[(\w+)((?:\s+\w+="[^"]*")*)\s*\]/g;
  const out = [];
  let last = 0;
  let k = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const attrs = {};
    m[2].replace(/(\w+)="([^"]*)"/g, (_, a, b) => { attrs[a] = b; return ''; });
    const node = SHORTCODES[m[1]]?.(attrs, ctx, k++);
    out.push(node !== undefined ? node : m[0]);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function CodeSnippet({ props, editing }) {
  const code = props.code || '';
  const html = useMemo(() => highlight(code, props.language), [code, props.language]);
  const [copied, setCopied] = useState(false);
  const copy = () => navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); });
  if (!code.trim()) return <Placeholder icon="code">Paste your code in the properties panel.</Placeholder>;
  const lines = code.split('\n').length;
  return (
    <figure className="pb-codeblock">
      <figcaption>
        <span>{props.filename || props.language}</span>
        {props.copyButton && <button type="button" onClick={copy} tabIndex={editing ? -1 : 0}>{copied ? 'Copied' : 'Copy'}</button>}
      </figcaption>
      <div className="pb-codeblock__body">
        {props.lineNumbers && <pre className="pb-codeblock__gutter" aria-hidden="true">{Array.from({ length: lines }, (_, i) => i + 1).join('\n')}</pre>}
        <pre className="pb-code" tabIndex={0}><code className={`lang-${props.language}`} dangerouslySetInnerHTML={{ __html: html }} /></pre>
      </div>
    </figure>
  );
}

export const codeWidgets = [
  {
    type: 'shortcode', label: 'Shortcode', category: 'code', icon: 'terminal',
    description: 'Dynamic text such as the current year, buttons and links.',
    defaults: { code: '© [year] [project_title]. Questions? [email address="muelprah@gmail.com" text="Email me"]' },
    fields: [
      {
        key: 'code', label: 'Shortcode text', type: 'textarea', rows: 5, mono: true,
        help: 'Available: [year] [date] [project_title] [br] [link url="https://…" text="…"] [email address="…" text="…"] [button url="…" text="…"]',
      },
    ],
    Render: ({ props, ctx }) => (props.code?.trim()
      ? <div className="pb-shortcode">{renderShortcodes(props.code, ctx)}</div>
      : <Placeholder icon="terminal">Type some shortcode text.</Placeholder>),
  },
  {
    type: 'html', label: 'HTML', category: 'code', icon: 'code',
    description: 'Your own HTML, CSS or script, shown in a safe sandbox.',
    defaults: { code: '<div style="padding:24px;border-radius:12px;background:#eef3ff;color:#003fbf;font:600 18px system-ui">Custom HTML block</div>', height: 160 },
    fields: [
      { key: 'code', label: 'HTML code', type: 'textarea', rows: 10, mono: true, help: 'Runs in a sandboxed frame, so scripts here cannot touch the rest of the page.' },
      { key: 'height', label: 'Frame height (px)', type: 'range', min: 40, max: 900, step: 10 },
    ],
    Render: ({ props }) => (props.code?.trim()
      ? <SandboxFrame code={props.code} height={num(props.height, 160)} title="Custom HTML" />
      : <Placeholder icon="code">Paste your HTML in the properties panel.</Placeholder>),
  },
  {
    type: 'codesnippet', label: 'Code Snippet', category: 'code', icon: 'code',
    description: 'A syntax-highlighted code listing with a file name and copy button.',
    defaults: { filename: 'example.js', language: 'js', lineNumbers: true, copyButton: true, code: "// Fade a block in when it scrolls into view\nconst io = new IntersectionObserver((entries) => {\n  entries.forEach((e) => e.isIntersecting && e.target.classList.add('is-visible'));\n});\ndocument.querySelectorAll('.reveal').forEach((el) => io.observe(el));" },
    fields: [
      { key: 'filename', label: 'File name (optional)', type: 'text' },
      { key: 'language', label: 'Language', type: 'select', options: LANGUAGES.map((l) => [l, l]) },
      { key: 'code', label: 'Code', type: 'textarea', rows: 12, mono: true },
      { key: 'lineNumbers', label: 'Show line numbers', type: 'toggle' },
      { key: 'copyButton', label: 'Show a copy button', type: 'toggle' },
    ],
    Render: CodeSnippet,
  },
];
