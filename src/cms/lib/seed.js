import { createBlock, ALL_WIDGETS } from '../../components/builder/WidgetRegistry.jsx';
import { DEFAULT_TYPOGRAPHY } from '../../components/typography.js';

const thumb = (id) => `https://drive.google.com/thumbnail?id=${id}&sz=w900`;
const view = (id) => `https://drive.google.com/file/d/${id}/view`;
const IMG = [thumb('121WYdaKOggV-3yFq6UsC70JDA_4MpJYy'), thumb('1imGbpd7FCaOsT6-l53GXN1yXW3WZFaH_'), thumb('17h3nE3jynuy1uGWHszoSAMExIH6Q684d')];

const base = { typography: { ...DEFAULT_TYPOGRAPHY } };

/** Starter content, taken from the portfolio. Edit or delete from the dashboard. */
export function buildSeedProjects() {
  return [
    {
      ...base, id: 'seed-1', title: 'Bridge Makers Conference: speaker feature', slug: 'bridge-makers-conference-speaker-feature',
      summary: 'A speaker feature film cut for the Bridge Makers Conference.', categories: ['Video editing', 'Motion graphics'],
      coverUrl: '', liveUrl: view('1zGK4XpH1yInGNIGGfhG17CqDa7Br1A96'), status: 'published', createdAt: '2026-05-15',
      blocks: [
        createBlock('heading', { text: 'Overview' }),
        createBlock('text', { content: 'Edited and finished a **speaker feature** for the conference.\n\n- Multi-camera edit\n- Colour and audio clean-up\n- Lower thirds and titles' }),
        createBlock('video', { url: view('1zGK4XpH1yInGNIGGfhG17CqDa7Br1A96') }),
      ],
    },
    {
      ...base, id: 'seed-2', title: 'SCC Obuasi Crusade campaign', slug: 'scc-obuasi-crusade-campaign',
      summary: 'Flyers and projection screens for a campus crusade.', categories: ['Graphic design', 'Event campaigns'],
      coverUrl: IMG[0], liveUrl: '', status: 'published', createdAt: '2026-06-26',
      blocks: [
        createBlock('heading', { text: 'Crusade flyer' }),
        createBlock('image', { url: IMG[0], alt: 'Crusade flyer', caption: 'Main flyer' }),
        createBlock('text', { content: 'Flyer, alternate layouts and a **projection screen** for the First Edition crusade.' }),
        createBlock('button', { text: 'Get in touch', url: 'mailto:muelprah@gmail.com' }),
      ],
    },
    {
      ...base, id: 'seed-3', title: 'My Worship, My Testimony merchandise', slug: 'my-worship-my-testimony-merchandise',
      summary: 'T-shirt graphics and the sales flyers that sold them.', categories: ['Graphic design', 'Brand and merch'],
      coverUrl: IMG[1], liveUrl: '', status: 'published', createdAt: '2026-04-25',
      blocks: [createBlock('image', { url: IMG[1], alt: 'T-shirt sales flyer' }), createBlock('text', { content: 'Front and back print artwork, plus the order flyer.' })],
    },
    {
      ...base, id: 'seed-4', title: 'PIA logo animation', slug: 'pia-logo-animation',
      summary: 'A short animated logo reveal.', categories: ['Motion graphics'],
      coverUrl: '', liveUrl: view('1YU6olMXz-rfd6ge4PGcitxg4Pu-z5m33'), status: 'draft', createdAt: '2026-05-16',
      blocks: [createBlock('video', { url: view('1YU6olMXz-rfd6ge4PGcitxg4Pu-z5m33') })],
    },
    {
      ...base, id: 'seed-5', title: 'CESA tees', slug: 'cesa-tees',
      summary: 'A full tee range with back prints.', categories: ['Brand and merch'],
      coverUrl: IMG[2], liveUrl: '', status: 'published', createdAt: '2025-01-18',
      blocks: [createBlock('image', { url: IMG[2], alt: 'CESA tees' })],
    },
  ];
}

/** A draft project containing one of every widget, for testing the builder. */
export function makeShowcaseProject() {
  const over = {
    image: { url: IMG[0], alt: 'Crusade flyer', caption: 'An image block with a caption' },
    gallery: { images: IMG.map((url, i) => ({ url, alt: `Gallery image ${i + 1}` })) },
    carousel: { images: IMG.map((url, i) => ({ url, alt: `Slide ${i + 1}`, caption: `Slide ${i + 1}` })) },
    imagebox: { imageUrl: IMG[1] },
    video: { url: view('1zGK4XpH1yInGNIGGfhG17CqDa7Br1A96') },
    soundcloud: { url: 'https://soundcloud.com/forss/flickermood' },
    hero: { bgType: 'image', bgUrl: IMG[0] },
    'hero-carousel': {
      items: IMG.map((url, i) => ({ title: ['Crusade campaign', 'Merch drop', 'Tee range'][i], year: ['2026', '2026', '2025'][i], category: ['Event campaign', 'Brand', 'Merch'][i], backdropUrl: url, posterUrl: url, linkType: 'anchor', url: '', projectSlug: '', anchor: 'showcase-top' })),
    },
    text: { content: 'Inline styling: ==highlighted==, ++underlined++, ~~struck~~ and [blue text]{#0057ff}.\n\n```js\nconst greeting = \"hello\"; // highlighted code\n```' },
  };
  const blocks = ALL_WIDGETS.map((w) => createBlock(w.type, over[w.type] || {}));
  const get = (t) => blocks.find((b) => b.type === t);
  Object.assign(get('container').props, { background: 'soft', slots: { children: [createBlock('heading', { text: 'Inside a container', level: 'h3' }), createBlock('text', { content: 'Layout blocks can hold other blocks.' })] } });
  get('grid').props.layout = 'asym-1-2';
  get('grid').props.slots.col1 = [createBlock('iconbox')];
  get('grid').props.slots.col2 = [createBlock('imagebox', { imageUrl: IMG[2] })];
  get('sidebar').props.slots.side = [createBlock('iconlist')];
  get('sidebar').props.slots.main = [createBlock('text', { content: 'Main column next to a sidebar.' })];
  return {
    title: 'Widget showcase (test page)', slug: 'widget-showcase', summary: 'One of every block, for testing the page builder.',
    categories: ['Test'], coverUrl: '', liveUrl: '', status: 'draft', createdAt: new Date().toISOString().slice(0, 10),
    typography: {
      fontUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap',
      headingFont: '"Playfair Display", serif', bodyFont: 'Inter, sans-serif',
    },
    blocks,
  };
}
