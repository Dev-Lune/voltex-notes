# ⚡ Voltex Notes

**Open-source knowledge base for thinkers, builders, and writers.**

Voltex Notes is a modern, full-featured note-taking app with bidirectional linking, graph view, markdown editing, real-time cloud sync, shareable notes, and a plugin marketplace — available as a **web app** and a **Windows desktop app**.

<p align="center">
  <img src="public/voltex-icon.svg" width="128" alt="Voltex Notes logo" />
</p>

<p align="center">
  <a href="https://voltex.devlune.in">Website</a> ·
  <a href="https://voltex.devlune.in/notes">Web App</a> ·
  <a href="https://github.com/Dev-Lune/voltex-notes/releases/latest">Download Desktop</a> ·
  <a href="https://github.com/Dev-Lune/voltex-notes/issues">Report Bug</a>
</p>

---

## Features

### Core Editing
- **Inline markdown editor** — seamless, distraction-free writing experience
- **Split view** — edit and preview side-by-side
- **YAML frontmatter** — collapsible properties editor
- **Smart lists** — auto-continuation for bullets, numbered lists, and task lists
- **Find & Replace** — regex-powered search within notes
- **Table insertion** — one-click markdown table insertion from toolbar
- **Inline title editing** — rename notes directly from the editor
- **Version history** — diff-based version snapshots with rollback

### Knowledge Graph
- **Interactive graph view** — visualize connections between notes
- **Force-directed physics** — spring-based layout with real-time simulation
- **Bidirectional links** — `[[wikilinks]]` create two-way connections
- **Backlinks panel** — see all notes that reference the current note
- **Link autocomplete** — type `[[` and get suggestions
- **Hover preview** — preview linked notes on hover

### Organization
- **Folder system** — drag-and-drop notes into folders
- **Tags** — add and filter by tags
- **Bookmarks** — star important notes
- **Multi-select** — select multiple files and bulk delete
- **Advanced search** — operators like `tag:`, `path:`, `file:`, `type:`, `has:`, `line:`, `-tag:`

### Authentication
- **Email & Password** — sign up and log in with email/password via Firebase Auth
- **Google Sign-In** — one-click Google authentication
- **Profile management** — update display name and profile info
- **Secure sessions** — persistent login state across browser sessions

### Cloud & Real-Time Sync
- **Real-time Firestore sync** — notes sync instantly across all devices via Firestore `onSnapshot` listeners
- **Offline-first** — full offline support with localStorage fallback; works without an account
- **Theme sync** — selected theme and preferences sync across devices when logged in
- **Version history** — diff-based version snapshots stored per note with one-click rollback
- **Conflict resolution** — configurable merge strategies for concurrent edits
- **Export** — download vault as text or individual notes as markdown

### Sharing
- **Public share links** — generate a shareable URL for any note with one click
- **Read-only viewer** — shared notes render in a clean, branded public page with markdown formatting
- **Firestore-backed** — shared notes stored securely; only the owner can update or revoke

### Plugin Marketplace
- **13+ plugins** — Excalidraw drawing, Kanban boards, Git sync, Mind maps, AI assistant, and more
- **Install/Uninstall** — real plugin lifecycle that gates features
- **Settings integration** — manage installed plugins from Settings
- **Feature gating** — drawing and kanban note types require their plugins

### Themes
- **9 built-in themes** — Voltex Dark (default), Nord, Dracula, Gruvbox, Solarized, Tokyo Night, Catppuccin, Rosé Pine, and more
- **Custom theme editor** — create and apply custom color palettes
- **Live preview** — see theme changes in real-time
- **Cross-device sync** — theme preference syncs via Firestore when logged in

### Note Types
- **Markdown** — rich text with wiki-links and formatting
- **Drawing** — Excalidraw canvas for diagrams and sketches (requires plugin)
- **Daily Note** — journal entries with date-based organization
- **Kanban** — task boards with drag-and-drop columns (requires plugin)

### Mobile
- **Responsive design** — full mobile layout with bottom nav
- **Swipe gestures** — swipe to navigate between views
- **Mobile drawer** — optimized sidebar for touch
- **Haptic feedback** — tactile responses on interactions

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) |
| UI | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Components | [Radix UI](https://www.radix-ui.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| Backend | [Firebase](https://firebase.google.com/) (Auth + Firestore + real-time sync) |
| Desktop | [Electron](https://www.electronjs.org/) with auto-updates |
| Deployment | [Vercel](https://vercel.com/) (web) · [GitHub Releases](https://github.com/Dev-Lune/voltex-notes/releases) (desktop) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Dev-Lune/voltex-notes.git
cd voltex-notes

# Install dependencies
npm install

# Start development server (web)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The landing page is at `/` and the notes app is at `/notes`.

### Build for Production

```bash
npm run build    # Web production build
npm start        # Start production server
```

### Desktop App (Electron)

```bash
npm run electron:dev     # Dev mode (Next.js + Electron)
npm run electron:build   # Build .exe installer locally
npm run electron:publish # Build + publish to GitHub Releases
```

See [docs/RELEASE.md](docs/RELEASE.md) for full release instructions.

---

## Project Structure

```
voltex-notes/
├── app/                    # Next.js app router
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Landing homepage
│   ├── notes/page.tsx      # Notes app entry
│   ├── share/[id]/         # Public shared note viewer
│   └── api/                # API routes (marketplace)
├── components/
│   ├── obsidian/           # Core app components
│   │   ├── ObsidianApp.tsx # Root component & state management
│   │   ├── Editor.tsx      # Markdown editor with toolbar
│   │   ├── Sidebar.tsx     # File explorer & search
│   │   ├── GraphView.tsx   # Interactive knowledge graph
│   │   ├── TitleBar.tsx    # App header with navigation
│   │   ├── RightPanel.tsx  # Backlinks & outline panel
│   │   ├── SettingsModal.tsx # Settings with 6 tabs
│   │   ├── MarketplacePanel.tsx # Plugin marketplace
│   │   ├── CommandPalette.tsx   # Ctrl+P command palette
│   │   ├── data.ts         # Types, sample data, utilities
│   │   └── ...
│   └── ui/                 # shadcn/ui components
├── electron/               # Electron main + preload
├── lib/
│   ├── firebase/           # Firebase Auth, Firestore sync, offline fallback
│   └── marketplace/        # Marketplace data & types
├── public/                 # Static assets & logos
├── scripts/                # Build scripts (esbuild for Electron)
└── docs/                   # Documentation (RELEASE.md)
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New note |
| `Ctrl+P` | Command palette |
| `Ctrl+E` | Toggle edit/preview |
| `Ctrl+F` | Find & Replace |
| `Ctrl+G` | Graph view |
| `Ctrl+B` | Bold |
| `Ctrl+I` | Italic |
| `[[…]]` | Link to note |

---

## Configuration

### Firebase Setup

Firebase powers authentication, real-time sync, and note sharing. The app works fully offline without Firebase, but cloud features require it.

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** → Email/Password and Google sign-in providers
3. Enable **Firestore Database** in production mode
4. Deploy Firestore security rules: `firebase deploy --only firestore:rules`
5. Register a **Web App** and copy the config values into `.env.local`

### Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | e.g. `my-project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | e.g. `my-project.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Cloud Messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |

---

## Deployment

### Deploy to Vercel

1. Push the repo to GitHub
2. Import the project at [vercel.com/new](https://vercel.com/new)
3. Add the Firebase environment variables in **Settings → Environment Variables**
4. Deploy — Vercel auto-detects Next.js

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDev-Lune%2Fvoltex-notes)

### Custom Domain

1. In Vercel, go to **Settings → Domains**
2. Add your domain (e.g. `voltex.devlune.in`)
3. Configure DNS at your registrar:
   - **CNAME** → `cname.vercel-dns.com` (for subdomains)
   - **A** → `76.76.21.21` (for apex domains)
4. Vercel provisions an SSL certificate automatically

---

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting a PR.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Use TypeScript for all new code
- Components go in `components/obsidian/`
- Keep state management in `ObsidianApp.tsx`
- Test on both desktop and mobile viewports

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Inspired by [Obsidian](https://obsidian.md/)
- Built with [Next.js](https://nextjs.org/), [React](https://react.dev/), and [Tailwind CSS](https://tailwindcss.com/)
- Icons by [Lucide](https://lucide.dev/)
- UI primitives by [Radix](https://www.radix-ui.com/)

---

## Built by DevLune Studios

<a href="https://devlune.in">
  <img src="https://img.shields.io/badge/DevLune_Studios-4F8EF7?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIHZpZXdCb3g9IjAgMCAxNCAxNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTMgNy41QzEyLjEgMTAuNiA5LjIgMTIuOSA1LjggMTIuOSAyLjIgMTIuOSAtMC4yIDEwIDAgNi41IDAuMyAzLjEgMyAwLjUgNi40IDAuMyA2LjEgMS4yIDYgMi4yIDYgMy4yIDYgNy41IDkuNSAxMSAxMy44IDExIDEzLjUgOS45IDEzLjMgOC43IDEzIDcuNVoiIGZpbGw9IndoaXRlIi8+PC9zdmc+&logoColor=white" alt="DevLune Studios" />
</a>

Voltex Notes is a project by **[DevLune Studios](https://devlune.in)** — a software studio crafting open-source tools, Android apps, and full-stack platforms.

- **Website:** [devlune.in](https://devlune.in)
- **Email:** [sidharth@devlune.in](mailto:sidharth@devlune.in)
- **GitHub:** [github.com/Dev-Lune](https://github.com/Dev-Lune)

---

<p align="center">
  <b>⚡ Voltex Notes</b> — voltage + vortex — where sparks spiral<br/>
  <sub>Crafted with care by <a href="https://devlune.in">DevLune Studios</a></sub>
</p>
