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
import { frameWidgets } from './widgets/frame.jsx';
import { shapeWidgets } from './widgets/shape.jsx';
import { profileCardWidgets } from './widgets/ProfileCardBlock.jsx';
import { FONT_FIELD } from './widgets/shared.jsx';
import { fontScopeStyle } from '../typography.js';
import { newBlockId } from './blockTree.js';
import DesignWrap from './design/DesignWrap.jsx';
import { hasDesign } from './design/model.js';

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
  { id: 'shapes', label: 'Shapes & Vectors' },
  { id: 'basic', label: 'Basic Content' },
  { id: 'media', label: 'Media & Embeds' },
  { id: 'cards', label: 'Composite Cards' },
  { id: 'interactive', label: 'Interactive & UI' },
  { id: 'code', label: 'Custom Code' },
];

// Widgets that get a "Font" picker (one font from the library for the whole block).
const FONT_TYPES = new Set(['heading', 'text', 'button', 'readmore', 'testimonial', 'counter', 'tabs', 'accordion', 'imagebox', 'iconbox', 'iconlist', 'alert', 'rating', 'progress', 'detaillist', 'taglist', 'buttongroup', 'projectgrid']);
export const TEXT_TYPES = FONT_TYPES;
const withFont = (w) => (FONT_TYPES.has(w.type) ? { ...w, defaults: { ...w.defaults, font: '' }, fields: [...w.fields, FONT_FIELD] } : w);

export const ALL_WIDGETS = [
  ...frameWidgets, ...layoutWidgets, ...shapeWidgets, ...basicWidgets, ...listWidgets, ...mediaWidgets, heroCarouselWidget, ...heroWidgets, ...bannerWidgets, ...cardWidgets, ...profileCardWidgets, ...interactiveWidgets, ...codeWidgets,
].map(withFont);
export const WIDGETS = Object.fromEntries(ALL_WIDGETS.map((w) => [w.type, w]));

/** How a widget paints: 'css' (the box itself), 'ellipse' (box with round corners), 'svg' (drawn by the widget), 'line'. */
export const paintModeOf = (w, props) => (w?.paintMode ? w.paintMode(props) : 'css');
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
  const node = <Render props={props} slot={slot || (() => null)} editing={editing} ctx={ctx} blockId={block.id} />;
  // A block-level font choice applies to everything inside the block.
  const mode = w.paintMode ? w.paintMode(props) : 'css';
  const scope = fontScopeStyle(props.font);
  const inner = scope ? <div className="pb-font" style={scope}>{node}</div> : node;
  // Universal Design settings (size, fills, strokes, effects, states ...) apply to every widget the same way.
  return hasDesign(props.design)
    ? <DesignWrap id={block.id} design={props.design} editing={editing} ownsPaint={mode === 'svg' || mode === 'line'} style={mode === 'ellipse' ? { borderRadius: '50%' } : undefined}>{inner}</DesignWrap>
    : inner;
}
