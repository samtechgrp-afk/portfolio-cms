# Portfolio CMS

A small React admin for managing portfolio projects. Built with React 18 and Vite, plain CSS using the portfolio's design tokens, and LocalStorage behind a swappable store.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in /dist
```

## Structure

```
src/
  main.jsx
  components/
    FontManager.jsx             typography: font stylesheet links, heading/body families, live preview
    typography.js               link injection hook (useFontLinks), font-stack sanitising
    builder/
      WidgetRegistry.jsx        registry + router: widget type -> renderer, defaults, field schema
      widgets/                  the 32 widgets (layout, basic, media, cards, interactive, code)
      BlockCanvas.jsx           ordered, nestable canvas: move up/down, duplicate, edit, delete
      BlockPickerModal.jsx      "Add a block" modal, grouped into 6 categories, searchable
      PropertyInspector.jsx     side panel; edits block.props in real time (schema-driven)
      PageRenderer.jsx          read-only renderer. Reuse it on the public site.
      blockTree.js              pure helpers: find, move, duplicate, remove, insert, nested clone
      icons.jsx, page.css, builder.css
  cms/
    CmsApp.jsx                  state, save, delete, publish toggle, export, toasts
    components/
      ProjectList.jsx           dashboard: search, filters, sort, quick actions
      ProjectEditor.jsx         tabs: Details, Typography, Page builder, Preview
      TagInput, Field, ConfirmDialog, Toast
    lib/
      projectsStore.js          LocalStorage layer + migration from the old schema
      validation.js, markdown.js, seed.js, format.js
```

## Data model (saved to LocalStorage under `portfolio.cms.projects.v2`)

```json
{
  "id": "proj-123", "title": "Project Title", "slug": "project-title", "summary": "...",
  "coverUrl": "...", "liveUrl": "", "categories": ["Design"], "status": "draft", "createdAt": "2026-10-09",
  "typography": { "fontUrl": "", "headingFont": "sans-serif", "bodyFont": "sans-serif",
                  "customFontName": "", "customFontUrl": "", "fontFormat": "" },
  "blocks": [ { "id": "blk_123", "type": "heading", "props": { "text": "Hello", "level": "h2" } } ]
}
```

- `fontUrl` holds one stylesheet link per line (up to 6).
- `customFontName`, `customFontUrl` and `fontFormat` are from the older single-font feature and still work. New fonts live in the font library table. Blocks refer to library fonts by family name (`props.font`), and any block can carry `hidden: true`.
- Layout blocks (Container, Grid, Sidebar) keep nested blocks in `props.slots`, e.g. `props.slots.col1 = [ ...blocks ]`.
- Projects saved by the first version are migrated automatically: `coverImageUrl` becomes `coverUrl`, and a Markdown `body` becomes a Text Editor block.

## The 35 widgets

- **Layout & Structure (7):** Container, Grid (1, 2, 3 or 4 columns, six asymmetric presets or custom widths, gap, vertical and text alignment), Divider, Spacer, Menu Anchor, Sidebar, Link in Bio
- **Basic Content (6):** Heading, Text Editor (Markdown, inline styling, code fences with syntax highlighting, size, line spacing, colour, font), Button (links to an external URL, a project page `/work/:slug`, a project's live site, or an anchor), Icon, Text Path, Read More
- **Media & Embeds (8):** Image, Video, Basic Gallery (lightbox and captions), Image Carousel, **Hero Carousel**, SoundCloud, Google Maps, **Hero Banner** (headline, subdeck, image or video background, buttons, font bindings)
- **Composite Cards (4):** Image Box, Icon Box, Icon List, Testimonial
- **Interactive & UI (7):** Star Rating, Counter, Tabs, Accordion, Social Icons, Progress Bar, Alert
- **Custom Code (3):** Shortcode, HTML, **Code Snippet** (highlighted JS, TS, JSON, CSS, HTML, Python, Bash, SQL)

**Hero Carousel** (`hero-carousel`) is a dark 12px-rounded banner with top and bottom gradient shading and a floating glass bar (`backdrop-filter: blur(16px)`, `rgba(255,255,255,0.12)`) of poster thumbnails showing title, year and category. Clicking a thumbnail cross-fades the `.banner-bg` background over 0.6s ease, marks the thumbnail active and shows an animated play icon; the arrow keys move between items, and the active item's link becomes the button. Add, remove, reorder and edit items (title, year, category, backdrop, poster, target link) in the properties panel. Code: `widgets/HeroCarouselBlock.jsx` and `.css`.

## Editing blocks

- Drag the grip (top left of a block) to reorder, including into and out of containers, or use the up and down buttons. A blue line shows where the block will land. Undo (or Ctrl+Z) reverses it.
- The eye button hides a block. It stays in the page data but is not shown on the site; the canvas dims it and labels it Hidden.
- Duplicate, delete and the property panel work as before. The Preview tab shows the page as visitors see it, at desktop, tablet or mobile width.

To add a widget: create a definition (`type`, `label`, `category`, `defaults`, `fields`, `Render`) in `widgets/` and add it to the array there. Field types include `font` (library picker) and `link` (project, live site, anchor or URL).

## Testing

Use **Add test page (all blocks)** on the dashboard to create a draft page containing one of every widget. To start over with fresh sample data, clear the `portfolio.cms.projects.v2` key in your browser's Local Storage and reload.

## Showing pages on your site

`PageRenderer` renders a saved project. Pass it the project's `blocks`, `typography` and `title`:

```jsx
import { PageRenderer } from './components/builder';
<PageRenderer blocks={p.blocks} typography={p.typography} title={p.title} />
```

## Home page

Click **Edit home page** on the dashboard. It opens (or creates) the project with the slug `home`. When it is **published** and has at least one block, the portfolio site shows it at `/` instead of the default layout. The slug is locked, `home` never appears in the Projects cards, and `/work/home` redirects to `/`. If it is a draft, empty, or Supabase is unreachable, the site shows its default layout.

## Font library

**Font library** (dashboard button, and inside each page's Typography tab) holds every font you upload. Add several .ttf, .otf, .woff or .woff2 files at once; each gets a family name, a weight (100 to 900) and a style (normal or italic), pre-filled from the file name. Files with the same family name form one family (for example Brand Sans 400, 700 and 700 italic). Each file's first bytes are checked, so a renamed non-font file is rejected, and the bucket only accepts font types up to 5 MB.

- **Where it is stored:** files in the public Supabase Storage bucket `fonts` (random names), and one row per file in the table `public.fonts`: `family`, `file_url`, `storage_path`, `format`, `weight`, `style`.
- **Use it:** the Use for headings and Use for body buttons set the page's default fonts. Many blocks (Heading, Text Editor, Button, Tabs, Testimonial and others) have a **Font** picker for a single block, the Hero Banner has separate headline and subdeck fonts, and in a Text Editor `[word]{font:Brand Sans}` styles a few words.
- **Loading:** `injectFontFace(fontName, fontUrl, format, { weight, style })` adds the `@font-face` rule and a preload link. `PageRenderer` injects only the fonts a page actually uses, so unused fonts cost nothing. Rules are shared and reference-counted, so switching between dark and light mode never reloads or flickers a font.
- **Deleting** a font asks for confirmation, shows how many pages use it, and removes the row and the file. Pages that used it fall back to their default fonts.
- Uploads need the Supabase connection. Pages saved with the older single-font feature keep working (their fonts were moved into the library automatically).

## Shared code

The page renderer is also used by the portfolio site repo. Shared files: `components/typography.js`, `components/builder/` (`PageRenderer.jsx`, `WidgetRegistry.jsx`, `blockTree.js`, `icons.jsx`, `page.css`, and the whole `widgets/` folder including `HeroCarouselBlock.jsx` and `.css`), and `cms/lib/markdown.js` and `cms/lib/highlight.js`. Editor-only files (`BlockCanvas`, `BlockPickerModal`, `PropertyInspector`, `BuilderContext`, `FontManager`) are not shared. After changing any of these, run `npm run sync -- ../portfolio-cms` inside the site repo to copy them across.

## Supabase (connected)

The CMS is wired to the Supabase project **samuel-portfolio** (London, `mzgbiqerlizirlybrkvp`). The settings are in `.env`; clear both values to fall back to LocalStorage with no login.

- **Table:** `public.projects`. Columns match the data model; `typography` and `blocks` are `jsonb`.
- **Row-level security:** anyone can read rows with `status = 'published'`. Only the signed-in owner (`muelprah@gmail.com`) can read drafts and create, edit or delete.
- **Login:** `src/cms/lib/auth.js` (email and password). Create the user once in the Supabase dashboard: Authentication, Users, Add user, tick Auto Confirm. Then turn off "Allow new users to sign up" under Authentication, Sign In / Providers.
- **Import:** after you sign in, a banner offers to move projects saved in this browser into the database. It skips slugs that already exist.
- **Data layer:** `src/cms/lib/supabaseStore.js` has the same interface as the LocalStorage store, plus `uploadFont` and `removeFont`.
- **Storage:** bucket `fonts` is public to read. Only the owner can upload or delete. Allowed types: font/ttf, font/otf, font/woff, font/woff2.

## Hosting on GitHub and Vercel

1. Create an empty repository on GitHub (private is fine), for example `portfolio-cms`. Do not add a README or .gitignore there.
2. In this folder:
   ```bash
   git init -b main
   git add .
   git commit -m "Portfolio CMS"
   git remote add origin https://github.com/YOUR-USERNAME/portfolio-cms.git
   git push -u origin main
   ```
3. On vercel.com choose Add New, Project, then import the repository. Vercel detects Vite on its own, so leave the build settings alone and click Deploy. If asked to connect GitHub, allow it for that one repository.
4. Open the Vercel URL and sign in with the owner account.

`.env` is committed on purpose. It holds only the Supabase project URL and the publishable key, which are public by design. Row-level security protects the data. Never commit a `service_role` key. `vercel.json` adds basic security headers so the admin page can't be embedded in another site.

## Important before going live

- **Keep sign-ups off.** Writes are limited to the owner's email by row-level security, but turn off public sign-ups anyway so strangers can't create accounts.
- **The public portfolio does not read this data yet.** Use "Export published (JSON)" to download `projects.json` (it includes `blocks` and `typography`), or have the portfolio fetch published rows from the backend and render them with `PageRenderer`.
- **HTML and embed blocks run in a sandbox.** The HTML block and the Video "HTML code" mode render inside a sandboxed iframe, so pasted scripts cannot read the CMS or its stored data.


## Editing the landing page (slug `home`)

Click **Edit home page** on the dashboard. If no `home` project exists yet, it opens a ready-made copy of the current landing page (intro, tools and fields, motion videos, campaign / brand / print galleries, about, skills, experience, contact). Every part is an ordinary block you can edit, reorder, hide or delete.

- Sections that appear in the site menu are **Menu Anchor** blocks with a *label*. Anchors with no label are link targets only.
- **Project grid** shows your published projects, **Detail list**, **Tag list** and **Button group** cover the intro facts, skills, experience and buttons.
- Videos use a click-to-play poster (Google Drive or YouTube). Galleries support masonry layout and a lightbox.
- The public site keeps its built-in layout until `home` is **Published**. If the page is missing, a draft, empty or fails to load, the built-in layout is shown.

Widget count: 39.

## Font upload notes

Font files are re-labelled with the standard font type before upload, and the bucket accepts the older labels some Windows browsers send (`application/x-font-ttf`, `font/sfnt`, `application/octet-stream` and similar). If an upload still fails, the message now includes the server's reason.
