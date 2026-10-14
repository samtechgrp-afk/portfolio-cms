import { Editable, requestField, useInlineEdit } from '../inlineEdit.jsx';
import { fontScopeStyle } from '../../typography.js';
import { LinkWrap, isExternalHref, resolveLink, safeHref } from './shared.jsx';
import { Icon } from '../icons.jsx';

export const BIO_MAX = 300;
export const STATUSES = {
  open: { label: 'Open to remote work', color: '#22c55e' },
  contract: { label: 'Available for Contract', color: '#86efac' },
  none: { label: 'Not Looking', color: '#ef4444' },
};
export const ELEMENTS = [['status', 'Status'], ['avatar', 'Avatar'], ['name', 'Name'], ['location', 'Location'], ['bio', 'Bio'], ['btn1', 'Button 1'], ['btn2', 'Button 2']];

/** "Samuel Prah" -> "SP", "ama" -> "A". Used when there is no photo. */
export function initialsOf(name, override) {
  const o = (override || '').trim();
  if (o) return o.slice(0, 3).toUpperCase();
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts.length === 1 ? parts[0][0] : parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
const shown = (p, key) => p.show?.[key] !== false;
const btnLink = (p) => resolveLink({ linkType: p.btn1LinkType, url: p.btn1Url, projectSlug: p.btn1ProjectSlug, anchor: p.btn1Anchor });

function ProfileCard({ props: p, editing, blockId }) {
  const inline = useInlineEdit();
  const live = !!(editing && inline?.patch);
  const status = STATUSES[p.status] || STATUSES.open;
  // On the canvas the buttons are not links, so clicking their text edits it instead of navigating.
  const href1 = live ? undefined : btnLink(p);
  const cv = live ? undefined : safeHref(p.cvUrl);
  const initials = initialsOf(p.name, p.initials);
  const photo = p.avatarUrl && /^https?:\/\//i.test(p.avatarUrl) ? p.avatarUrl : '';
  const E = { blockId, editing };
  const hex = (v, d) => (/^#[0-9a-f]{6}$/i.test(v || '') ? v : d);
  const b1Style = p.btnCustom ? { background: hex(p.btn1Bg, '#2563eb'), color: hex(p.btn1Fg, '#ffffff'), boxShadow: 'none' } : undefined;
  const b2Style = p.btnCustom
    ? { color: hex(p.btn2Fg, '#dbeafe'), borderColor: hex(p.btn2Border, '#3b82f6'), background: p.btn2Fill ? hex(p.btn2Bg, '#ffffff') : 'transparent' }
    : undefined;
  const avStyle = {
    ...(p.avatarShape === 'circle' ? { borderRadius: '50%' } : p.avatarShape === 'square' ? { borderRadius: '6px' } : p.avatarShape === 'rounded' ? { borderRadius: '22px' } : {}),
    ...(p.avatarCustom && !photo ? { background: hex(p.avatarBg, '#1d4ed8'), borderColor: hex(p.avatarBg, '#1d4ed8') } : {}),
  };
  const cardStyle = p.cardCustom ? {
    '--pf-bg': hex(p.cardBg, '#ffffff'), '--pf-text': hex(p.cardText, '#111111'), '--pf-muted': hex(p.cardMuted, '#5f6673'),
    borderColor: hex(p.cardBorder, '#d9dce3'), boxShadow: p.cardGlow ? `0 0 15px ${hex(p.cardBorder, '#d9dce3')}66` : 'none',
  } : null;
  const avTextStyle = p.avatarCustom ? { color: hex(p.avatarFg, '#ffffff') } : undefined;

  return (
    <article className={`pb-profile is-${p.align || 'left'}${p.cardCustom ? ' is-themed' : ''}`} style={{ ...(fontScopeStyle(p.font) || {}), ...(cardStyle || {}) }} aria-label={`Profile: ${p.name || 'unnamed'}`}>
      {shown(p, 'status') && (
        <div className="pb-profile__status">
          <span className="pb-profile__dot" style={{ background: status.color, boxShadow: `0 0 8px ${status.color}` }} aria-hidden="true" />
          {live ? (
            <select
              className="pb-profile__select" data-inline="true" aria-label="Availability status" value={STATUSES[p.status] ? p.status : 'open'}
              onChange={(e) => inline.patch(blockId, { status: e.target.value })} onKeyDown={(e) => e.stopPropagation()}
            >
              {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          ) : <span>{status.label}</span>}
        </div>
      )}

      {(shown(p, 'avatar') || shown(p, 'name') || shown(p, 'location')) && (
        <div className="pb-profile__who">
          {shown(p, 'avatar') && (
            <div className="pb-profile__avatar" style={avStyle}>
              {photo ? <img src={photo} alt={p.avatarAlt || p.name || ''} referrerPolicy="no-referrer" /> : <span aria-label={`Initials ${initials}`} style={avTextStyle}>{initials}</span>}
              {live && <button type="button" className="pb-profile__avatar-action" data-inline="true" onClick={() => requestField('avatarUrl')}>Update Photo / Initials</button>}
            </div>
          )}
          {(shown(p, 'name') || shown(p, 'location')) && (
            <div className="pb-profile__id">
              {shown(p, 'name') && <Editable {...E} tag="h3" className="pb-profile__name" field="name" value={p.name} maxLength={80} label="Name" placeholder="Your name" />}
              {shown(p, 'location') && (
                <p className="pb-profile__loc">
                  <Icon name="map-pin" size={14} />
                  <Editable {...E} tag="span" field="location" value={p.location} maxLength={80} label="Location" placeholder="City, Country" />
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {shown(p, 'bio') && (
        <div className="pb-profile__bio">
          <Editable {...E} tag="p" className="pb-profile__text" field="bio" value={p.bio} multiline maxLength={BIO_MAX} label="Bio" placeholder="Write a short bio" />
          {live && <span className="pb-profile__count" aria-live="polite">{(p.bio || '').length} / {BIO_MAX} chars</span>}
        </div>
      )}

      {(shown(p, 'btn1') || shown(p, 'btn2')) && (
        <div className="pb-profile__actions">
          {shown(p, 'btn1') && (
            <LinkWrap href={href1} newTab={isExternalHref(href1)} className={`pb-profile__btn is-primary${p.btnCustom ? ' is-custom' : ''}`} style={b1Style}>
              <Editable {...E} tag="span" field="btn1Text" value={p.btn1Text} maxLength={40} label="Button 1 text" placeholder="Button" />
            </LinkWrap>
          )}
          {shown(p, 'btn2') && (
            <LinkWrap href={cv} download={cv ? '' : undefined} newTab={false} className={`pb-profile__btn is-pill${p.btnCustom ? ' is-custom' : ''}`} style={b2Style}>
              <Editable {...E} tag="span" field="btn2Text" value={p.btn2Text} maxLength={40} label="Button 2 text" placeholder="Button" />
            </LinkWrap>
          )}
        </div>
      )}
    </article>
  );
}

export const profileCardWidgets = [
  {
    type: 'profilecard', label: 'Profile Card', category: 'cards', icon: 'user',
    description: 'A dark profile card: availability status, photo or initials, name, location, bio and two buttons (contact and CV download).',
    defaults: {
      show: { status: true, avatar: true, name: true, location: true, bio: true, btn1: true, btn2: true },
      status: 'open', avatarUrl: '', avatarAlt: '', initials: '',
      name: 'Samuel Prah', location: 'Takoradi, Ghana',
      bio: 'Creative director and designer building brand, event and motion work for campaigns across Ghana and beyond.',
      btn1Text: 'Message me', btn1LinkType: 'url', btn1Url: 'mailto:muelprah@gmail.com', btn1ProjectSlug: '', btn1Anchor: '',
      btn2Text: 'Download CV', cvUrl: '/Samuel_Prah_Creative_Director_CV.docx', cvName: 'Samuel_Prah_Creative_Director_CV.docx',
      avatarShape: '', avatarCustom: false, avatarBg: '#1d4ed8', avatarFg: '#ffffff',
      cardCustom: false, cardBg: '#ffffff', cardText: '#111111', cardMuted: '#5f6673', cardBorder: '#d9dce3', cardGlow: false,
      btnCustom: false, btn1Bg: '#2563eb', btn1Fg: '#ffffff', btn2Fill: false, btn2Bg: '#ffffff', btn2Fg: '#111111', btn2Border: '#111111',
      align: 'left', font: '',
    },
    fields: [
      { key: 'show', label: 'Elements', type: 'elements', help: 'Switch parts of the card on or off.' },
      { key: 'status', label: 'Status', type: 'select', options: Object.entries(STATUSES).map(([k, v]) => [k, v.label]), showIf: (p) => shown(p, 'status') },
      { key: 'avatarUrl', label: 'Photo', type: 'media', showIf: (p) => shown(p, 'avatar'), help: 'Upload a photo, pick one from the library or paste a link. With no photo the card shows initials.' },
      { key: 'initials', label: 'Initials (optional)', type: 'text', maxLength: 3, showIf: (p) => shown(p, 'avatar') && !p.avatarUrl, help: 'Leave empty to use the first letters of the name.' },
      { key: 'avatarAlt', label: 'Photo description (alt text)', type: 'text', showIf: (p) => shown(p, 'avatar') && !!p.avatarUrl },
      { key: 'avatarShape', label: 'Photo shape', type: 'select', options: [['', 'Default'], ['circle', 'Circle'], ['rounded', 'Rounded square'], ['square', 'Square']], showIf: (p) => shown(p, 'avatar') },
      { key: 'avatarCustom', label: 'Custom initials colours', type: 'toggle', showIf: (p) => shown(p, 'avatar') && !p.avatarUrl },
      { key: 'avatarBg', label: 'Initials background', type: 'color', showIf: (p) => shown(p, 'avatar') && !p.avatarUrl && !!p.avatarCustom },
      { key: 'avatarFg', label: 'Initials text', type: 'color', showIf: (p) => shown(p, 'avatar') && !p.avatarUrl && !!p.avatarCustom },
      { key: 'name', label: 'Name', type: 'text', maxLength: 80, showIf: (p) => shown(p, 'name') },
      { key: 'location', label: 'Location', type: 'text', maxLength: 80, showIf: (p) => shown(p, 'location') },
      { key: 'bio', label: 'Bio', type: 'textarea', rows: 5, maxLength: BIO_MAX, showIf: (p) => shown(p, 'bio') },
      { key: 'btn1Text', label: 'Primary button text', type: 'text', maxLength: 40, showIf: (p) => shown(p, 'btn1') },
      { key: 'btn1Url', label: 'Primary button link', type: 'link', prefix: 'btn1', showIf: (p) => shown(p, 'btn1'), help: 'Use mailto:you@example.com for an email link, tel: for a phone number, or pick a page.' },
      { key: 'btn2Text', label: 'Secondary button text', type: 'text', maxLength: 40, showIf: (p) => shown(p, 'btn2') },
      { key: 'cvUrl', label: 'CV file', type: 'file', accept: '.pdf,.doc,.docx', nameKey: 'cvName', uploadLabel: 'Upload new file for CV', showIf: (p) => shown(p, 'btn2'), help: 'PDF, DOC or DOCX up to 10 MB. Visitors download it when they click the button.' },
      { key: 'cardCustom', label: 'Custom card colours', type: 'toggle', help: 'Off keeps the dark neon card.' },
      { key: 'cardBg', label: 'Card background', type: 'color', showIf: (p) => !!p.cardCustom },
      { key: 'cardText', label: 'Card text colour', type: 'color', showIf: (p) => !!p.cardCustom },
      { key: 'cardMuted', label: 'Secondary text colour (location)', type: 'color', showIf: (p) => !!p.cardCustom && shown(p, 'location') },
      { key: 'cardBorder', label: 'Card outline colour', type: 'color', showIf: (p) => !!p.cardCustom },
      { key: 'cardGlow', label: 'Glow around the card', type: 'toggle', showIf: (p) => !!p.cardCustom },
      { key: 'btnCustom', label: 'Custom button colours', type: 'toggle', showIf: (p) => shown(p, 'btn1') || shown(p, 'btn2'), help: 'Off keeps the default blue styling.' },
      { key: 'btn1Bg', label: 'Primary button colour', type: 'color', showIf: (p) => !!p.btnCustom && shown(p, 'btn1') },
      { key: 'btn1Fg', label: 'Primary button text colour', type: 'color', showIf: (p) => !!p.btnCustom && shown(p, 'btn1') },
      { key: 'btn2Fill', label: 'Fill the secondary button', type: 'toggle', showIf: (p) => !!p.btnCustom && shown(p, 'btn2') },
      { key: 'btn2Bg', label: 'Secondary button fill', type: 'color', showIf: (p) => !!p.btnCustom && shown(p, 'btn2') && !!p.btn2Fill },
      { key: 'btn2Fg', label: 'Secondary button text colour', type: 'color', showIf: (p) => !!p.btnCustom && shown(p, 'btn2') },
      { key: 'btn2Border', label: 'Secondary button outline colour', type: 'color', showIf: (p) => !!p.btnCustom && shown(p, 'btn2') },
      { key: 'align', label: 'Card position', type: 'select', options: [['left', 'Left'], ['center', 'Centre'], ['right', 'Right']] },
    ],
    Render: ProfileCard,
  },
];
