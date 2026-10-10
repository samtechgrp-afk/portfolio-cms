import './page.css';
import { BlockView } from './WidgetRegistry.jsx';
import { typographyStyle, useTypographyAssets } from '../typography.js';

export function RenderBlocks({ blocks, ctx }) {
  return blocks.map((b) => (
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

/** Read-only page. Use this on the public site: <PageRenderer blocks={p.blocks} typography={p.typography} title={p.title} /> */
export default function PageRenderer({ blocks = [], typography, title = '', className = '' }) {
  useTypographyAssets(typography);
  return (
    <article className={`pb-page ${className}`} style={typographyStyle(typography)}>
      {blocks.length ? <RenderBlocks blocks={blocks} ctx={{ projectTitle: title }} /> : <p className="pb-muted">This page has no content yet.</p>}
    </article>
  );
}
