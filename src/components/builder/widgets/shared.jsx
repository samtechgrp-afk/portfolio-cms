import { useMemo } from 'react';
import { renderMarkdown } from '../../../cms/lib/markdown.js';
import { Icon } from '../icons.jsx';

export const num = (v, d) => {
  const n = Number(v);
  return v === '' || v === null || v === undefined || Number.isNaN(n) ? d : n;
};

/** Only allow web, mail, phone, in-page and relative links. Blocks javascript: and data: URLs. */
export const safeHref = (u) => {
  const t = (u || '').trim();
  return /^(https?:|mailto:|tel:|#|\/)/i.test(t) ? t : undefined;
};

export const safeId = (s) => (s || '').replace(/[^a-zA-Z0-9_-]/g, '-');

/** opts('a', ['b', 'Label B']) -> [['a','A'], ['b','Label B']] */
export const opts = (...items) => items.map((p) => (Array.isArray(p) ? p : [p, p[0].toUpperCase() + p.slice(1)]));

export const ALIGN = { key: 'align', label: 'Alignment', type: 'select', options: opts('left', 'center', 'right') };

export function Md({ source, className = '' }) {
  const html = useMemo(() => renderMarkdown(source || ''), [source]);
  return <div className={`pb-prose ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Placeholder({ icon = 'image', children }) {
  return (
    <div className="pb-placeholder">
      <Icon name={icon} size={22} />
      <span>{children}</span>
    </div>
  );
}

/** Runs untrusted HTML in a sandboxed iframe: scripts may run, but cannot touch the CMS page or its storage. */
export function SandboxFrame({ code, height = 240, title }) {
  const doc = `<meta charset="utf-8"><base target="_blank"><style>body{margin:0;font-family:system-ui,sans-serif}</style>${code}`;
  return (
    <iframe
      className="pb-frame" title={title} sandbox="allow-scripts allow-popups"
      srcDoc={doc} style={{ height }} loading="lazy" referrerPolicy="no-referrer"
    />
  );
}

export function LinkWrap({ href, newTab, className, children, ...rest }) {
  const h = safeHref(href);
  if (!h) return <span className={className} {...rest}>{children}</span>;
  return (
    <a className={className} href={h} {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...rest}>
      {children}
    </a>
  );
}

export function Stars({ value = 0, max = 5, size = 24, color }) {
  const v = Math.max(0, Math.min(max, num(value, 0)));
  return (
    <span className="pb-stars" role="img" aria-label={`Rated ${v} out of ${max}`} style={color ? { '--star': color } : undefined}>
      {Array.from({ length: max }, (_, i) => {
        const fill = Math.max(0, Math.min(1, v - i));
        return (
          <span className="pb-star" key={i} style={{ width: size, height: size }}>
            <Icon name="star" size={size} />
            <span className="pb-star__fill" style={{ width: `${fill * 100}%` }}>
              <Icon name="star" size={size} fill="currentColor" />
            </span>
          </span>
        );
      })}
    </span>
  );
}
