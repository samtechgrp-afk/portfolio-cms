import './page.css';
import { BlockView } from './WidgetRegistry.jsx';
import { typographyStyle, useTypographyAssets } from '../typography.js';
import { useSiteIcon } from '../siteIcon.js';

export function RenderBlocks({ blocks, ctx }) {
  return blocks.filter((b) => !b.hidden).map((b) => (
    <div className="pb-block" key={b.id} data-type={b.type} data-block-id={b.id}>
      <BlockView
        block={b}
        ctx={ctx}
        slot={(name) => (
          <div className="pb-slot"><RenderBlocks blocks={b.props?.slots?.[name] || []} ctx={ctx} /></div>
        )}
      />
    </div>
  ));
}

/**
 * Read-only page. Use this on the public site:
 *   <PageRenderer blocks={p.blocks} typography={p.typography} title={p.title} fonts={fontLibrary} />
 * `siteIconUrl` is the favicon from Site settings (empty string = the default icon). `fonts` is the font library; only the fonts this page uses are loaded. `projects` ([{ title, slug, summary, coverUrl, categories }])
 * feeds Project Grid blocks. Hidden blocks are skipped.
 */
export default function PageRenderer({ blocks = [], typography, title = '', fonts = [], projects = [], siteIconUrl, className = '' }) {
  useTypographyAssets(typography, { fonts, blocks });
  useSiteIcon(siteIconUrl); // the site icon (favicon) from Site settings; undefined leaves the current icon alone
  return (
    <article className={`pb-page ${className}`} style={typographyStyle(typography)}>
      {blocks.length ? <RenderBlocks blocks={blocks} ctx={{ projectTitle: title, projects }} /> : <p className="pb-muted">This page has no content yet.</p>}
    </article>
  );
}
