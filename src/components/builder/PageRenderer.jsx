import './page.css';
import { BlockView } from './WidgetRegistry.jsx';
import { typographyStyle, useTypographyAssets } from '../typography.js';

export function RenderBlocks({ blocks, ctx }) {
  return blocks.filter((b) => !b.hidden).map((b) => (
    <div className="pb-block" key={b.id} data-type={b.type}>
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
 * `fonts` is the font library; only the fonts this page uses are loaded. `projects` ([{ title, slug, summary, coverUrl, categories }])
 * feeds Project Grid blocks. Hidden blocks are skipped.
 */
export default function PageRenderer({ blocks = [], typography, title = '', fonts = [], projects = [], className = '' }) {
  useTypographyAssets(typography, { fonts, blocks });
  return (
    <article className={`pb-page ${className}`} style={typographyStyle(typography)}>
      {blocks.length ? <RenderBlocks blocks={blocks} ctx={{ projectTitle: title, projects }} /> : <p className="pb-muted">This page has no content yet.</p>}
    </article>
  );
}
