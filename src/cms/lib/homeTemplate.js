import { newBlockId } from '../../components/builder/blockTree.js';

/**
 * The portfolio's landing page as page-builder blocks, so it can be edited in the CMS.
 * "Edit home page" creates the `home` project from this when it does not exist yet.
 * Everything here is plain data: change any of it in the page builder after it is created.
 */
const block = (type, props, extra = {}) => ({ id: newBlockId(), type, props, ...extra });
const thumb = (id) => `https://drive.google.com/thumbnail?id=${id}&sz=w900`;
const driveView = (id) => `https://drive.google.com/file/d/${id}/view`;
const link = (label, url, style = 'fill') => ({ label, linkType: 'url', url, projectSlug: '', anchor: '', style });
const anchor = (id, label = '') => block('anchor', { anchorId: id, label });
const spacer = (height = 72) => block('spacer', { height });
const h2 = (text) => block('heading', { text, level: 'h2', size: 'auto', align: 'left', url: '' });
const muted = (content) => block('text', { content, align: 'left', columns: '1', color: 'muted' });
const gallery = (items) => block('gallery', {
  layout: 'masonry', columns: '3', lightbox: true, showCaptions: true, ratio: 'auto', gap: 'md',
  images: items.map(([id, caption]) => ({ url: thumb(id), alt: caption, caption })),
});
const video = (id, caption) => block('video', { mode: 'url', url: driveView(id), aspect: '16/9', facade: true, caption, poster: '' });

const VIDEOS = [["1zGK4XpH1yInGNIGGfhG17CqDa7Br1A96", "Bridge Makers Conference: speaker feature"], ["1g3N9BInOcKf6e_6dZm_AFntxszYVnkzD", "Send-off film"], ["13vrRV4rPVB3WqDmGF1R-0yLHAcXkiaKb", "Long Legacy: short cut"], ["1YU6olMXz-rfd6ge4PGcitxg4Pu-z5m33", "PIA logo animation"], ["1YDNQNMI_xtY1DIcian9RU3uVwjRLbrap", "Intro design"], ["1UP3El1fmadEPVSbgM2GMp2WqZqgkT0is", "Kenkey advert"]];
const CAMPAIGNS = [["121WYdaKOggV-3yFq6UsC70JDA_4MpJYy", "SCC Obuasi Crusade flyer"], ["1AeJt4lhXSW-K6XHLMYIJwP2u7G6z8kdy", "Drama night flyer"], ["1xmDrwW3yZFbgqGZfhCPzEIz_k03rHK7D", "Crusade projection screen"], ["1LhNkmJ3xTtIYmzLPO-uJd0y7SlLDee8-", "Event flyer"], ["1RXoUuMDao_TlN3KYyl-3qa9JP5OJNldP", "Graduation photography promo"], ["1TbGCZeyn4YEl9OPYwUirXDXAZmq-SvYK", "Event flyer"], ["18h-3CTZINPWW_iLI8kpxCTo2qRfKnTgQ", "Birthday graphic"], ["1qMyEktQUuC_dfTMJU3vhADqscXfg1Okd", "Wedding invitation with QR code"], ["1MY5hK9l2SzMTBRtLTVF7keGXKxtGvKlD", "Programme day graphic"], ["1A9yMVp8F7zAFajxLotUJ_PTfZk7xIzoO", "Breast cancer awareness graphic"], ["1DFyML196FVxi-p1u-IsMzlpwxsnbt88e", "Crusade flyer, alternate layout"], ["16kgVZYWpeiuTYepLo131PLP7xuF79X_7", "Appreciation card"]];
const BRAND = [["1imGbpd7FCaOsT6-l53GXN1yXW3WZFaH_", "My Worship, My Testimony: sales flyer"], ["1065fzg-8qGa14dkYTR9bL-AxtDxjIFiu", "T-shirt graphic, front"], ["1fIEzWG89YCTJwyHoAF6vaCLL2Kh24xGS", "T-shirt graphic, black"], ["10DbO8FWzm_7DzPLxZ6b-I4mh802jvmq7", "T-shirt sales flyer"], ["17h3nE3jynuy1uGWHszoSAMExIH6Q684d", "CESA tees, full range"], ["1RipWipjCqeQphwRxZ9rYL0Nmu6Oqqrbq", "CESA tee with back print"], ["1F_BOVjjm6NrV4xkjdkwk6EnlJDmia3Xn", "Logo design"], ["1FUi2jvX7eqFhxUEMsbKOQvX9vk8GJt5j", "Logo design"], ["1CWGLiS8RHLbzO6XNltDQxHp7asB_YIA6", "Closet brand graphic"], ["1AFCl7okjAbWaLP__hgLv6piQo95mIdCa", "Sticker design"]];
const PRINT = [["1wcaTMjdR9Bu_YCaBuLxrUlzIXzK0_9C_", "Brochure mockup"], ["13KR6uamJuKGqABSptGiukgvbP3-iE4e8", "Memorial programme, cover"], ["1lDZh3yGP2RmvzcdblJzKofMeiYmwiezm", "Memorial programme, inside page"], ["1QnJxoiio1qpyfBLAfWV8Z_opMJmscomN", "Cover page design"], ["17_x9yaQLLau6wUR9Y5TAZfcXV8fKsXG8", "Booklet cover"], ["1JLoSBfHJpwCQPLtoPWmatitXDWbKITPe", "Biography page layout"]];

export function buildHomeTemplate() {
  const blocks = [
    // ---- intro: name, summary, quick facts, and a contact card ----
    block('grid', {
      layout: 'asym-2-1', gapSize: 56, align: 'start', stack: true,
      slots: {
        col1: [
          block('heading', { text: 'Samuel Prah', level: 'h1', size: 'xl', align: 'left', url: '' }),
          block('text', { content: 'Creative director, graphic designer, motion graphics designer and video editor.', align: 'left', columns: '1', size: '24', lineHeight: '1.3' }),
          block('detaillist', {
            layout: 'inline',
            items: [
              { title: 'Tools', detail: 'Premiere Pro, After Effects, DaVinci Resolve, Photoshop, Illustrator' },
              { title: 'Creative fields', detail: 'Motion graphics, video editing, branding, print and social design, live streaming' },
              { title: 'Location', detail: 'Takoradi, Ghana. Working remotely with teams anywhere.' },
            ],
          }),
        ],
        col2: [
          block('container', {
            background: 'soft', padding: 'md', maxWidth: 'full', radius: 'lg',
            slots: {
              children: [
                block('text', { content: '**Open to remote work**', align: 'left', columns: '1', size: '14' }),
                block('heading', { text: 'Samuel Prah', level: 'h3', size: 'auto', align: 'left', url: '' }),
                muted('Takoradi, Ghana'),
                block('text', { content: '6+ years designing for churches, media houses, schools and small businesses. Currently producing live streams and lecture video at KNUST.', align: 'left', columns: '1', size: '15', color: 'muted' }),
                block('buttongroup', {
                  layout: 'stack', size: 'md', align: 'left',
                  items: [
                    link('Message me', 'mailto:muelprah@gmail.com?subject=Project%20enquiry', 'fill'),
                    link('Download CV', '/Samuel_Prah_Creative_Director_CV.docx', 'outline'),
                    link('LinkedIn', 'https://linkedin.com/in/samuel-prah-5963891b3', 'outline'),
                  ],
                }),
              ],
            },
          }),
        ],
        col3: [], col4: [],
      },
    }),
    spacer(72),

    // ---- projects from the CMS ----
    anchor('projects', 'Projects'),
    h2('Projects'),
    muted('Case studies and recent work. Open one to see the full page.'),
    block('projectgrid', { columns: '3', limit: 12, category: '', showSummary: true, showTags: true }),
    spacer(72),

    // ---- motion graphics and video ----
    anchor('motion', 'Motion & video'),
    h2('Motion graphics and video'),
    muted('Event films, ads, logo animation and live production work.'),
    video(VIDEOS[0][0], VIDEOS[0][1]),
    block('grid', {
      layout: '2', gapSize: 20, align: 'start', stack: true,
      slots: {
        col1: [video(VIDEOS[1][0], VIDEOS[1][1]), video(VIDEOS[3][0], VIDEOS[3][1]), video(VIDEOS[5][0], VIDEOS[5][1])],
        col2: [video(VIDEOS[2][0], VIDEOS[2][1]), video(VIDEOS[4][0], VIDEOS[4][1])],
        col3: [], col4: [],
      },
    }),
    spacer(72),

    // ---- galleries ----
    anchor('campaigns', 'Campaigns'),
    h2('Event campaigns'),
    muted('Flyers, invitations and screen graphics for crusades, drama nights, graduations and celebrations.'),
    gallery(CAMPAIGNS),
    spacer(72),
    anchor('brand', 'Brand & merch'),
    h2('Brand and merchandise'),
    muted('Logos, T-shirt graphics and the sales flyers that sell them.'),
    gallery(BRAND),
    spacer(72),
    anchor('print', 'Print'),
    h2('Print and editorial'),
    muted('Brochures, programmes and cover design.'),
    gallery(PRINT),
    spacer(72),

    // ---- about ----
    anchor('about', 'About'),
    block('grid', {
      layout: 'custom', widths: '1.1fr 1fr', gapSize: 64, align: 'start', stack: true,
      slots: {
        col1: [
          h2('About'),
          block('text', { content: 'I design and edit for people who need work shipped on time. Most of my projects start as a brief and a deadline: a flyer for Saturday, a lecture to edit by Monday, a live stream that cannot drop.\n\nI lead graphic design at Shammah Media, run my own studio, Samtechgrp, and handle live production and video at KNUST\u2019s E-Learning Centre. I also hold a BSc in Construction Technology and Management, which is why my layouts are tidy.', align: 'left', columns: '1' }),
          block('heading', { text: 'Skills', level: 'h3', size: 'auto', align: 'left', url: '' }),
          block('taglist', {
            align: 'left',
            items: ['Motion graphics', 'Video editing', 'Brand identity', 'Art direction', 'Live streaming', 'Photography', 'Project management', 'HTML, CSS, JavaScript'].map((label) => ({ label })),
          }),
        ],
        col2: [
          block('heading', { text: 'Experience', level: 'h3', size: 'auto', align: 'left', url: '' }),
          block('detaillist', {
            layout: 'stacked',
            items: [
              { title: 'National Service, E-Learning Centre', detail: 'KNUST Institute of Distance Learning, Nov 2025 \u2013 Oct 2026' },
              { title: 'Graphic Design Head and I.T. Personnel', detail: 'Shammah Media, Sep 2020 \u2013 present' },
              { title: 'Managing Director', detail: 'Samtechgrp, Aug 2017 \u2013 present' },
              { title: 'Publicity Head', detail: 'Students\u2019 Chaplaincy Council, KNUST, 2023 \u2013 2024' },
            ],
          }),
        ],
        col3: [], col4: [],
      },
    }),
    spacer(72),

    // ---- contact ----
    anchor('contact'),
    block('container', {
      background: 'dark', padding: 'lg', maxWidth: 'full', radius: 'lg',
      slots: {
        children: [
          block('heading', { text: 'Let\u2019s make something good.', level: 'h2', size: 'xl', align: 'left', url: '' }),
          block('text', { content: 'Send a brief, a deadline and a budget range. I reply within a day.', align: 'left', columns: '1', size: '18' }),
          block('buttongroup', {
            layout: 'row', size: 'md', align: 'left',
            items: [
              link('muelprah@gmail.com', 'mailto:muelprah@gmail.com?subject=Project%20enquiry', 'fill'),
              link('+233 55 291 1583', 'tel:+233552911583', 'outline'),
              link('LinkedIn', 'https://linkedin.com/in/samuel-prah-5963891b3', 'outline'),
              link('Pinterest', 'https://pinterest.com/samtechgrp/', 'outline'),
            ],
          }),
        ],
      },
    }),
  ];

  return {
    title: 'Home',
    slug: 'home',
    summary: 'Portfolio of Samuel Prah: graphic design, motion graphics, video editing and creative direction. Based in Takoradi, Ghana. Available for remote work.',
    categories: [],
    coverUrl: '',
    liveUrl: '',
    status: 'draft',
    typography: {
      fontUrl: 'https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap',
      headingFont: '"Schibsted Grotesk", sans-serif',
      bodyFont: '"Schibsted Grotesk", sans-serif',
      customFontName: '', customFontUrl: '', fontFormat: '',
    },
    blocks,
  };
}
