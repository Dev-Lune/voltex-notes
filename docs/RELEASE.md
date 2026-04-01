# Building & Releasing Voltex Notes (Electron)

## Prerequisites

- Node.js 22+
- npm
- A [GitHub Personal Access Token (classic)](https://github.com/settings/tokens/new) with `repo` scope

## Development

```bash
npm install
npm run electron:dev
```

This starts the Next.js dev server on port 3001 and launches Electron pointing at it.

## Build (Local Only)

```bash
npm run electron:build
```

**Output:** `release/Voltex Notes Setup 1.0.0.exe` (installer) and `release/win-unpacked/` (portable).

This does **not** upload anything — just builds the installer locally.

## Publish a Release to GitHub

### 1. Bump the version

Edit `package.json`:

```json
"version": "1.1.0"
```

### 2. Set your GitHub token

```powershell
$env:GH_TOKEN = "ghp_your_token_here"
```

### 3. Run the publish command

```powershell
npm run electron:publish
```

This runs the full pipeline:
1. `next build` — builds the Next.js app
2. `node scripts/electron-build.mjs` — compiles Electron TypeScript via esbuild
3. `electron-builder --publish always` — packages the app and uploads to GitHub Releases

**Uploaded artifacts:**
| File | Purpose |
|------|---------|
| `Voltex-Notes-Setup-X.X.X.exe` | Windows installer |
| `Voltex-Notes-Setup-X.X.X.exe.blockmap` | Delta update data |
| `latest.yml` | Auto-updater manifest |

The release is created at `https://github.com/Dev-Lune/voltex-notes/releases/tag/vX.X.X`.

## Manual Upload (Without Token)

If you prefer uploading manually:

1. Build locally:
   ```bash
   npm run electron:build
   ```
2. Go to https://github.com/Dev-Lune/voltex-notes/releases/new
3. Tag: `v1.0.0` (must match `package.json` version with `v` prefix)
4. Upload these files from `release/`:
   - `Voltex Notes Setup 1.0.0.exe`
   - `Voltex Notes Setup 1.0.0.exe.blockmap`
   - `latest.yml`
5. Publish the release

> **Important:** You must upload `latest.yml` — the auto-updater reads this file to detect new versions.

## Auto-Update Flow

The app checks for updates automatically:
- On startup
- Every 4 hours

When an update is found:
1. `updater:update-available` event sent to renderer (shows notification)
2. Download happens in background with `updater:download-progress` events
3. Once ready, `updater:update-ready` fires
4. User triggers install via `updater:install` IPC — app restarts with new version

## Config Reference

**`electron-builder.yml`** controls the build:

```yaml
publish:
  provider: github
  owner: Dev-Lune
  repo: voltex-notes
  releaseType: release
```

Change `owner`/`repo` if the repository moves.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Cannot find package 'esbuild'` | Run `npm install --save-dev esbuild` |
| `duplicated mapping key` in YAML | Check `electron-builder.yml` for duplicate keys |
| `middleware.ts` + `proxy.ts` conflict | Delete `middleware.ts` — Next.js 16 uses `proxy.ts` only |
| Code signing skipped | Expected for local builds. Set up a certificate for signed releases |
| Token expired / 401 | Generate a new token at https://github.com/settings/tokens |
