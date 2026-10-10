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
  "typography": { "fontUrl": "", "headingFont": "sans-serif", "bodyFont": "sans-serif" },
  "blocks": [ { "id": "blk_123", "type": "heading", "props": { "text": "Hello", "level": "h2" } } ]
}
```

- `fontUrl` holds one stylesheet link per line (up to 6).
- Layout blocks (Container, Grid, Sidebar) keep nested blocks in `props.slots`, e.g. `props.slots.col1 = [ ...blocks ]`.
- Projects saved by the first version are migrated automatically: `coverImageUrl` becomes `coverUrl`, and a Markdown `body` becomes a Text Editor block.

## The 32 widgets

- **Layout & Structure (7):** Container, Grid, Divider, Spacer, Menu Anchor, Sidebar, Link in Bio
- **Basic Content (6):** Heading, Text Editor, Button, Icon, Text Path, Read More
- **Media & Embeds (6):** Image, Video (embed URL or HTML code), Basic Gallery, Image Carousel (slider / carousel / slideshow), SoundCloud, Google Maps
- **Composite Cards (4):** Image Box, Icon Box, Icon List, Testimonial
- **Interactive & UI (7):** Star Rating, Counter, Tabs, Accordion, Social Icons, Progress Bar, Alert
- **Custom Code (2):** Shortcode, HTML

To add a widget: create a definition (`type`, `label`, `category`, `defaults`, `fields`, `Render`) in `widgets/` and add it to the array there. The registry, picker and inspector pick it up automatically.

## Testing

Use **Add test page (all blocks)** on the dashboard to create a draft page containing one of every widget. To start over with fresh sample data, clear the `portfolio.cms.projects.v2` key in your browser's Local Storage and reload.

## Showing pages on your site

`PageRenderer` renders a saved project. Pass it the project's `blocks`, `typography` and `title`:

```jsx
import { PageRenderer } from './components/builder';
<PageRenderer blocks={p.blocks} typography={p.typography} title={p.title} />
```

## Supabase (connected)

The CMS is wired to the Supabase project **samuel-portfolio** (London, `mzgbiqerlizirlybrkvp`). The settings are in `.env`; clear both values to fall back to LocalStorage with no login.

- **Table:** `public.projects`. Columns match the data model; `typography` and `blocks` are `jsonb`.
- **Row-level security:** anyone can read rows with `status = 'published'`. Only the signed-in owner (`muelprah@gmail.com`) can read drafts and create, edit or delete.
- **Login:** `src/cms/lib/auth.js` (email and password). Create the user once in the Supabase dashboard: Authentication, Users, Add user, tick Auto Confirm. Then turn off "Allow new users to sign up" under Authentication, Sign In / Providers.
- **Import:** after you sign in, a banner offers to move projects saved in this browser into the database. It skips slugs that already exist.
- **Data layer:** `src/cms/lib/supabaseStore.js` has the same interface as the LocalStorage store.

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
