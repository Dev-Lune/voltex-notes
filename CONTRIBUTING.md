# Contributing to Voltex Notes

Thank you for your interest in contributing to Voltex Notes! This document provides guidelines for contributing.

## How to Contribute

### Reporting Bugs

- Use [GitHub Issues](../../issues) to report bugs
- Include steps to reproduce, expected behavior, and screenshots if applicable
- Specify your browser, OS, and screen size

### Suggesting Features

- Open an issue with the `enhancement` label
- Describe the use case and expected behavior
- Reference similar features in other tools if applicable

### Submitting Code

1. **Fork** the repository
2. **Create a branch** from `main` — name it `feature/your-feature` or `fix/your-fix`
3. **Make your changes** — follow the code style guidelines below
4. **Test** on both desktop and mobile
5. **Submit a PR** with a clear description of what changed and why

## Code Style

- **TypeScript** for all source files
- **Functional components** with hooks
- **State** lives in `ObsidianApp.tsx` — pass down via props
- **No external state libraries** (Redux, Zustand, etc.) — keep it simple
- **Tailwind CSS** for styling, inline `style` for CSS variables
- **Lucide React** for all icons
- **No `any` types** — use proper types from `data.ts`

## File Organization

| Directory | Purpose |
|-----------|---------|
| `components/obsidian/` | Core app components |
| `components/ui/` | Reusable UI primitives (shadcn) |
| `lib/firebase/` | Firebase integration |
| `lib/marketplace/` | Marketplace data |
| `app/` | Next.js routes |
| `public/` | Static assets |
| `scripts/` | Build & generation scripts |

## Commit Messages

Use clear, concise commit messages:

```
feat: add table insertion tool to toolbar
fix: editor title now editable inline
refactor: unify plugin systems into single source of truth
docs: add contributing guidelines
```

## Development Setup

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

## Questions?

Open an issue or reach out to [sidharth@devlune.in](mailto:sidharth@devlune.in). We're happy to help!

---

Voltex Notes is maintained by [DevLune Studios](https://devlune.in).
