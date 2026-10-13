import { num } from './shared.jsx';

/**
 * Text-readability gradient for blocks that put text over a background image.
 * One implementation shared by the Hero Banner, Hero Carousel and Image Banner, so the editor preview
 * (BlockCanvas) and the public site (PageRenderer) draw exactly the same overlay.
 *
 * Props it adds to a block:
 *   gradientEnabled    boolean, default true
 *   gradientDirection  'bottom-to-top' (dark at the bottom) | 'top-to-bottom' (dark at the top) | 'radial' (vignette)
 *   gradientOpacity    0-100, strength at the darkest point, default 70
 *   gradientColor      hex colour of the dark end, default #101114
 */
export const GRADIENT_DEFAULTS = {
  gradientEnabled: true,
  gradientDirection: 'bottom-to-top',
  gradientOpacity: 70,
  gradientColor: '#101114',
};

const HEX = /^#([0-9a-f]{6})$/i;
const rgbOf = (c) => {
  const m = HEX.exec((c || '').trim()) || HEX.exec(GRADIENT_DEFAULTS.gradientColor);
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

// Alpha ramp from the clear end (0%) to the dark end (100%). The eased curve avoids a visible line where the fade starts.
const RAMP = [[0, 0], [14, 0.07], [30, 0.2], [48, 0.4], [66, 0.65], [84, 0.88], [100, 1]];

/** The CSS `background` value for the overlay. */
export function gradientCss({ direction, opacity, color } = {}) {
  const peak = Math.min(100, Math.max(0, num(opacity, GRADIENT_DEFAULTS.gradientOpacity))) / 100;
  const rgb = rgbOf(color);
  const at = (a) => `rgba(${rgb}, ${(a * peak).toFixed(3)})`;
  if (direction === 'radial') {
    return `radial-gradient(ellipse at center, ${at(0)} 28%, ${at(0.2)} 52%, ${at(0.55)} 78%, ${at(1)} 100%)`;
  }
  // 0% is the clear end, 100% the dark end. `to bottom` puts the dark end at the bottom edge, `to top` at the top edge.
  const stops = RAMP.map(([pos, a]) => `${at(a)} ${pos}%`).join(', ');
  return `linear-gradient(${direction === 'top-to-bottom' ? 'to top' : 'to bottom'}, ${stops})`;
}

export const gradientOn = (props) => props.gradientEnabled !== false;

/** The overlay layer. Sits between the media and the text layer; never catches clicks. */
export function GradientOverlay({ props }) {
  if (!gradientOn(props)) return null;
  return (
    <div
      className="pb-gradient"
      aria-hidden="true"
      data-direction={props.gradientDirection || GRADIENT_DEFAULTS.gradientDirection}
      style={{ background: gradientCss({ direction: props.gradientDirection, opacity: props.gradientOpacity, color: props.gradientColor }) }}
    />
  );
}

/** Inspector fields. `visible(props)` limits them to blocks that actually have a background image. */
export const gradientFields = (visible = () => true) => [
  {
    key: 'gradientEnabled', label: 'Enable Text Readability Gradient', type: 'toggle', showIf: visible,
    help: 'Fades the image to a dark colour where the text sits, so titles and buttons stay easy to read.',
  },
  {
    key: 'gradientDirection', label: 'Gradient direction', type: 'select', showIf: (p) => visible(p) && gradientOn(p),
    options: [['bottom-to-top', 'Bottom to Top'], ['top-to-bottom', 'Top to Bottom'], ['radial', 'Radial Vignette']],
    help: 'Bottom to Top is darkest at the bottom edge. Pick the side where your text sits.',
  },
  { key: 'gradientOpacity', label: 'Gradient opacity', type: 'range', min: 0, max: 100, step: 5, unit: '%', showIf: (p) => visible(p) && gradientOn(p) },
  { key: 'gradientColor', label: 'Gradient colour', type: 'color', showIf: (p) => visible(p) && gradientOn(p), help: 'Use a dark colour with light text. For dark text, choose a light colour.' },
];

