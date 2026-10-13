import { num } from './shared.jsx';

const H = { left: 'flex-start', center: 'center', right: 'flex-end' };
const V = { top: 'flex-start', middle: 'center', bottom: 'flex-end' };
const AUTO = { between: 'space-between', around: 'space-around', evenly: 'space-evenly' };

/** Auto Layout settings -> CSS custom properties read by `.pbf` (see page.css). Pure, so it can be tested on its own. */
export function frameVars(p) {
  const column = p.dir === 'column';
  const ax = H[p.ax] || H.left, ay = V[p.ay] || V.top;
  const autoGap = AUTO[p.gapMode];
  const pad = p.pad || {};
  const px = (v) => `${Math.max(0, num(v, 0))}px`;
  const padding = pad.mode === 'each' ? [pad.a, pad.b, pad.c, pad.d].map(px).join(' ') : px(pad.all ?? 0);
  // Alignment matrix: horizontal choice is the main axis in a row and the cross axis in a column.
  let jc = column ? ay : ax;
  let ai = column ? ax : ay;
  if (autoGap) jc = autoGap;
  if (p.baseline && !column) ai = 'baseline';
  return {
    '--f-dir': column ? 'column' : 'row', '--f-wrap': p.dir === 'wrap' || p.wrap ? 'wrap' : 'nowrap', '--f-gap': autoGap ? '0px' : px(p.gap),
    '--f-jc': jc, '--f-ai': ai, '--f-ac': column ? ax : ay, '--f-pad': padding,
  };
}

function Frame({ props, slot }) {
  const dir = props.dir === 'column' ? 'col' : 'row';
  return <div className={`pbf is-${dir}`} style={frameVars({ ...props, dir: props.dir === 'wrap' ? 'wrap' : props.dir })}>{slot('children')}</div>;
}

export const frameWidgets = [
  {
    type: 'frame', label: 'Frame', category: 'layout', icon: 'box',
    description: 'An auto-layout box, like a Figma frame: row, column or wrap, with gap, padding and a 9-point alignment grid.',
    defaults: {
      dir: 'column', gap: 16, gapMode: 'fixed', pad: { mode: 'uniform', all: 24, a: 24, b: 24, c: 24, d: 24 }, ax: 'left', ay: 'top', baseline: false,
      design: { radius: { mode: 'uniform', all: 16, tl: 16, tr: 16, br: 16, bl: 16 }, clip: true, fills: [{ id: 'f0', type: 'solid', visible: true, opacity: 100, blend: 'normal', color: { c: '#eef0f5', a: 100 } }] },
      slots: { children: [] },
    },
    slots: () => [{ name: 'children', label: 'Frame content' }],
    fields: [
      { key: 'dir', label: 'Direction', type: 'select', options: [['row', 'Horizontal (row)'], ['column', 'Vertical (column)'], ['wrap', 'Horizontal, wrapping']], help: 'Which way the items inside run. Wrapping moves items to a new line when they run out of room.' },
      { key: 'gapMode', label: 'Spacing between items', type: 'select', options: [['fixed', 'Fixed gap'], ['between', 'Auto: space between'], ['around', 'Auto: space around'], ['evenly', 'Auto: space evenly']] },
      { key: 'gap', label: 'Gap (px)', type: 'range', min: 0, max: 160, step: 2, unit: 'px', showIf: (p) => p.gapMode === 'fixed' || !p.gapMode },
      { key: 'pad', label: 'Padding', type: 'box4' },
      { key: 'ax', label: 'Alignment', type: 'matrix', help: 'Where the items sit inside the frame.' },
      { key: 'baseline', label: 'Align text baselines', type: 'toggle', showIf: (p) => p.dir !== 'column', help: 'Lines up the first line of text in each item. Overrides the top, middle, bottom choice.' },
    ],
    Render: Frame,
  },
];
