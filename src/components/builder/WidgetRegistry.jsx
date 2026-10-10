import { layoutWidgets } from './widgets/layout.jsx';
import { basicWidgets } from './widgets/basic.jsx';
import { mediaWidgets } from './widgets/media.jsx';
import { cardWidgets } from './widgets/cards.jsx';
import { interactiveWidgets } from './widgets/interactive.jsx';
import { codeWidgets } from './widgets/code.jsx';
import { newBlockId } from './blockTree.js';

/**
 * Central registry. Each widget definition has:
 *   type, label, category, icon, description
 *   defaults   default props for a new block
 *   fields     schema that drives the Property Inspector
 *   slots?     (props) => [{ name, label }] for widgets that hold other blocks
 *   Render     React component: ({ props, slot, editing, ctx }) => JSX
 */
export const CATEGORIES = [
  { id: 'layout', label: 'Layout & Structure' },
  { id: 'basic', label: 'Basic Content' },
  { id: 'media', label: 'Media & Embeds' },
  { id: 'cards', label: 'Composite Cards' },
  { id: 'interactive', label: 'Interactive & UI' },
  { id: 'code', label: 'Custom Code' },
];

export const ALL_WIDGETS = [...layoutWidgets, ...basicWidgets, ...mediaWidgets, ...cardWidgets, ...interactiveWidgets, ...codeWidgets];
export const WIDGETS = Object.fromEntries(ALL_WIDGETS.map((w) => [w.type, w]));

export const getWidget = (type) => WIDGETS[type];
export const widgetsByCategory = () => CATEGORIES.map((c) => ({ ...c, widgets: ALL_WIDGETS.filter((w) => w.category === c.id) }));
export const getSlots = (block) => WIDGETS[block.type]?.slots?.({ ...WIDGETS[block.type].defaults, ...block.props }) ?? [];

/** Creates a new block: { id, type, props }. Props are a deep copy of the widget defaults. */
export function createBlock(type, overrides = {}) {
  const w = WIDGETS[type];
  if (!w) throw new Error(`Unknown widget type: ${type}`);
  return { id: newBlockId(), type, props: JSON.parse(JSON.stringify({ ...w.defaults, ...overrides })) };
}

/** Router: renders a block with the widget registered for its type. */
export function BlockView({ block, slot, editing = false, ctx }) {
  const w = WIDGETS[block.type];
  if (!w) return <div className="pb-unknown">Unknown block type "{block.type}". It is kept in your data but cannot be shown.</div>;
  const Render = w.Render;
  return <Render props={{ ...w.defaults, ...block.props }} slot={slot || (() => null)} editing={editing} ctx={ctx} />;
}
