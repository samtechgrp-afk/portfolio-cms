import { layoutWidgets } from './widgets/layout.jsx';
import { basicWidgets } from './widgets/basic.jsx';
import { mediaWidgets } from './widgets/media.jsx';
import { cardWidgets } from './widgets/cards.jsx';
import { interactiveWidgets } from './widgets/interactive.jsx';
import { codeWidgets } from './widgets/code.jsx';
import { heroWidgets } from './widgets/hero.jsx';
import { listWidgets } from './widgets/lists.jsx';
import { heroCarouselWidget } from './widgets/HeroCarouselBlock.jsx';
import { bannerWidgets } from './widgets/banner.jsx';
import { FONT_FIELD } from './widgets/shared.jsx';
import { fontScopeStyle } from '../typography.js';
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

// Widgets that get a "Font" picker (one font from the library for the whole block).
const FONT_TYPES = new Set(['heading', 'text', 'button', 'readmore', 'testimonial', 'counter', 'tabs', 'accordion', 'imagebox', 'iconbox', 'iconlist', 'alert', 'rating', 'progress', 'detaillist', 'taglist', 'buttongroup', 'projectgrid']);
const withFont = (w) => (FONT_TYPES.has(w.type) ? { ...w, defaults: { ...w.defaults, font: '' }, fields: [...w.fields, FONT_FIELD] } : w);

export const ALL_WIDGETS = [
  ...layoutWidgets, ...basicWidgets, ...listWidgets, ...mediaWidgets, heroCarouselWidget, ...heroWidgets, ...bannerWidgets, ...cardWidgets, ...interactiveWidgets, ...codeWidgets,
].map(withFont);
export const WIDGETS = Object.fromEntries(ALL_WIDGETS.map((w) => [w.type, w]));

export const getWidget = (type) => WIDGETS[type];
export const widgetsByCategory = () => CATEGORIES.map((c) => ({ ...c, widgets: ALL_WIDGETS.filter((w) => w.category === c.id) }));
/** Defaults + saved props, upgraded by the widget's own `normalize` when it has one (older saved blocks keep working). */
export const resolveProps = (w, props) => {
  const merged = { ...w.defaults, ...props };
  return w.normalize ? w.normalize(merged) : merged;
};
export const getSlots = (block) => (WIDGETS[block.type] ? WIDGETS[block.type].slots?.(resolveProps(WIDGETS[block.type], block.props)) ?? [] : []);

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
  const props = resolveProps(w, block.props);
  const node = <Render props={props} slot={slot || (() => null)} editing={editing} ctx={ctx} />;
  // A block-level font choice applies to everything inside the block.
  const scope = fontScopeStyle(props.font);
  return scope ? <div className="pb-font" style={scope}>{node}</div> : node;
}
