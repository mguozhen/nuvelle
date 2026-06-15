# Frontend Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Nuvelle's four frontend surfaces as TypeScript React apps, with the website on Next.js and the three product apps on Vite, while preserving the current user-facing workflows and directory rename requirements.

**Architecture:** Use a root `pnpm` workspace with four independent app packages and no shared package. Each app owns its static assets, Tailwind/shadcn-style UI primitives, data, state helpers, tests, and framework config. `nuvelle_admin` remains the only frontend that talks to `nuvelle_kit`, through a typed backend client and a configurable backend URL.

**Tech Stack:** pnpm 10.33.4, TypeScript, React, Next.js, Vite, Tailwind CSS, shadcn/ui component pattern, lucide-react, Vitest, Testing Library, hls.js.

---

## File Structure

### Root

- Create: `package.json` — root workspace scripts only.
- Create: `pnpm-workspace.yaml` — workspace package list.
- Create: `tsconfig.base.json` — shared TypeScript compiler defaults used by each app.
- Modify: `.gitignore` — add `.superpowers/`, `node_modules/`, `.next/`, `dist/`, `coverage/`, and Vite/Next build outputs.
- Modify: `README.md` — update renamed directories, setup, dev/build commands, and backend notes.
- Modify: `deploy/README-gcp.md` — update service names and directory names.
- Modify: `deploy/deploy-gcp.sh` — update old frontend directory names and build output paths.
- Modify: `nuvelle_kit/promo_server.py` — change served admin static directory from `nuvelle_dash` to `nuvelle_admin/dist`.

### `nuvelle_website`

- Rename from: `site/`
- Create/replace: `nuvelle_website/package.json`
- Create/replace: `nuvelle_website/next.config.mjs`
- Create/replace: `nuvelle_website/tsconfig.json`
- Create/replace: `nuvelle_website/postcss.config.mjs`
- Create/replace: `nuvelle_website/tailwind.config.ts`
- Create/replace: `nuvelle_website/components.json`
- Create/replace: `nuvelle_website/vitest.config.ts`
- Create/replace: `nuvelle_website/test/setup.ts`
- Create/replace: `nuvelle_website/app/layout.tsx`
- Create/replace: `nuvelle_website/app/page.tsx`
- Create/replace: `nuvelle_website/app/globals.css`
- Create: `nuvelle_website/src/data/dramas.ts`
- Create: `nuvelle_website/src/lib/utils.ts`
- Create: `nuvelle_website/src/components/brand-mark.tsx`
- Create: `nuvelle_website/src/components/drama-card.tsx`
- Create: `nuvelle_website/src/components/drama-modal.tsx`
- Create: `nuvelle_website/src/components/hero-carousel.tsx`
- Create: `nuvelle_website/src/components/app-band.tsx`
- Create: `nuvelle_website/src/components/ui/button.tsx`
- Create: `nuvelle_website/src/components/ui/badge.tsx`
- Create: `nuvelle_website/src/components/ui/dialog.tsx`
- Create: `nuvelle_website/src/__tests__/data.test.ts`
- Create: `nuvelle_website/src/__tests__/page.test.tsx`
- Move assets into: `nuvelle_website/public/posters/`, `nuvelle_website/public/videos/`

### `nuvelle_mobile`

- Rename from: `nuvelle_app/`
- Create/replace: `nuvelle_mobile/package.json`
- Create/replace: `nuvelle_mobile/index.html`
- Create/replace: `nuvelle_mobile/tsconfig.json`
- Create/replace: `nuvelle_mobile/tsconfig.node.json`
- Create/replace: `nuvelle_mobile/vite.config.ts`
- Create/replace: `nuvelle_mobile/postcss.config.js`
- Create/replace: `nuvelle_mobile/tailwind.config.ts`
- Create/replace: `nuvelle_mobile/components.json`
- Create/replace: `nuvelle_mobile/src/main.tsx`
- Create/replace: `nuvelle_mobile/src/App.tsx`
- Create/replace: `nuvelle_mobile/src/styles.css`
- Create: `nuvelle_mobile/src/data/dramas.ts`
- Create: `nuvelle_mobile/src/lib/my-list.ts`
- Create: `nuvelle_mobile/src/lib/pwa.ts`
- Create: `nuvelle_mobile/src/lib/utils.ts`
- Create: `nuvelle_mobile/src/components/mobile-shell.tsx`
- Create: `nuvelle_mobile/src/components/home-view.tsx`
- Create: `nuvelle_mobile/src/components/search-view.tsx`
- Create: `nuvelle_mobile/src/components/my-list-view.tsx`
- Create: `nuvelle_mobile/src/components/profile-view.tsx`
- Create: `nuvelle_mobile/src/components/drama-sheet.tsx`
- Create: `nuvelle_mobile/src/components/ui/button.tsx`
- Create: `nuvelle_mobile/src/components/ui/badge.tsx`
- Create: `nuvelle_mobile/src/components/ui/sheet.tsx`
- Create: `nuvelle_mobile/src/components/ui/tabs.tsx`
- Create: `nuvelle_mobile/src/__tests__/my-list.test.ts`
- Create: `nuvelle_mobile/src/__tests__/app.test.tsx`
- Move assets into: `nuvelle_mobile/public/posters/`, `nuvelle_mobile/public/icons/`, `nuvelle_mobile/public/manifest.webmanifest`, `nuvelle_mobile/public/sw.js`, `nuvelle_mobile/public/ceo_secret_wife.mp4`

### `nuvelle_web`

- Rename from: `nuvelle_cps/`
- Create/replace: `nuvelle_web/package.json`
- Create/replace: `nuvelle_web/index.html`
- Create/replace: `nuvelle_web/tsconfig.json`
- Create/replace: `nuvelle_web/tsconfig.node.json`
- Create/replace: `nuvelle_web/vite.config.ts`
- Create/replace: `nuvelle_web/postcss.config.js`
- Create/replace: `nuvelle_web/tailwind.config.ts`
- Create/replace: `nuvelle_web/components.json`
- Create/replace: `nuvelle_web/src/main.tsx`
- Create/replace: `nuvelle_web/src/App.tsx`
- Create/replace: `nuvelle_web/src/styles.css`
- Create: `nuvelle_web/src/data/catalog.ts`
- Create: `nuvelle_web/src/lib/distributor.ts`
- Create: `nuvelle_web/src/lib/storage.ts`
- Create: `nuvelle_web/src/lib/utils.ts`
- Create: `nuvelle_web/src/components/join-gate.tsx`
- Create: `nuvelle_web/src/components/portal-shell.tsx`
- Create: `nuvelle_web/src/components/material-square.tsx`
- Create: `nuvelle_web/src/components/links-view.tsx`
- Create: `nuvelle_web/src/components/earnings-view.tsx`
- Create: `nuvelle_web/src/components/ui/button.tsx`
- Create: `nuvelle_web/src/components/ui/badge.tsx`
- Create: `nuvelle_web/src/components/ui/tabs.tsx`
- Create: `nuvelle_web/src/__tests__/distributor.test.ts`
- Create: `nuvelle_web/src/__tests__/portal.test.tsx`
- Move assets into: `nuvelle_web/public/posters/`, `nuvelle_web/public/icons/`, `nuvelle_web/public/packs/`

### `nuvelle_admin`

- Rename from: `nuvelle_dash/`
- Create/replace: `nuvelle_admin/package.json`
- Create/replace: `nuvelle_admin/index.html`
- Create/replace: `nuvelle_admin/tsconfig.json`
- Create/replace: `nuvelle_admin/tsconfig.node.json`
- Create/replace: `nuvelle_admin/vite.config.ts`
- Create/replace: `nuvelle_admin/postcss.config.js`
- Create/replace: `nuvelle_admin/tailwind.config.ts`
- Create/replace: `nuvelle_admin/components.json`
- Create/replace: `nuvelle_admin/src/main.tsx`
- Create/replace: `nuvelle_admin/src/App.tsx`
- Create/replace: `nuvelle_admin/src/styles.css`
- Create: `nuvelle_admin/src/types/drama.ts`
- Create: `nuvelle_admin/src/lib/backend.ts`
- Create: `nuvelle_admin/src/lib/scoring.ts`
- Create: `nuvelle_admin/src/lib/storage.ts`
- Create: `nuvelle_admin/src/lib/utils.ts`
- Create: `nuvelle_admin/src/components/login-gate.tsx`
- Create: `nuvelle_admin/src/components/admin-shell.tsx`
- Create: `nuvelle_admin/src/components/swipe-view.tsx`
- Create: `nuvelle_admin/src/components/video-preview.tsx`
- Create: `nuvelle_admin/src/components/board-view.tsx`
- Create: `nuvelle_admin/src/components/drama-modal.tsx`
- Create: `nuvelle_admin/src/components/generated-library.tsx`
- Create: `nuvelle_admin/src/components/batch-panel.tsx`
- Create: `nuvelle_admin/src/components/backend-settings.tsx`
- Create: `nuvelle_admin/src/components/ui/button.tsx`
- Create: `nuvelle_admin/src/components/ui/badge.tsx`
- Create: `nuvelle_admin/src/components/ui/dialog.tsx`
- Create: `nuvelle_admin/src/components/ui/input.tsx`
- Create: `nuvelle_admin/src/components/ui/select.tsx`
- Create: `nuvelle_admin/src/components/ui/tabs.tsx`
- Create: `nuvelle_admin/src/__tests__/backend.test.ts`
- Create: `nuvelle_admin/src/__tests__/scoring.test.ts`
- Create: `nuvelle_admin/src/__tests__/admin.test.tsx`
- Move assets into: `nuvelle_admin/public/icons/`, `nuvelle_admin/public/seed_dramas.json`

## Implementation Tasks

### Task 1: Workspace Safety And Directory Rename

**Files:**
- Modify: `.gitignore`
- Rename: `site/` to `nuvelle_website/`
- Rename: `nuvelle_app/` to `nuvelle_mobile/`
- Rename: `nuvelle_cps/` to `nuvelle_web/`
- Rename: `nuvelle_dash/` to `nuvelle_admin/`

- [ ] **Step 1: Verify the worktree before moving files**

Run:

```bash
git status --short --branch
```

Expected: `main` is ahead of `origin/main`, and only `.superpowers/` plus `AGENTS.md` are untracked before implementation files are added.

- [ ] **Step 2: Rename the four frontend directories with git**

Run:

```bash
git mv site nuvelle_website
git mv nuvelle_app nuvelle_mobile
git mv nuvelle_cps nuvelle_web
git mv nuvelle_dash nuvelle_admin
```

Expected: `git status --short` shows four directory renames instead of delete/add churn for tracked files.

- [ ] **Step 3: Add local and build outputs to `.gitignore`**

Patch `.gitignore` so these lines exist exactly once:

```gitignore
.superpowers/
node_modules/
.next/
dist/
coverage/
*.tsbuildinfo
```

- [ ] **Step 4: Move assets into framework public folders**

Run:

```bash
mkdir -p nuvelle_website/public nuvelle_mobile/public nuvelle_web/public nuvelle_admin/public
git mv nuvelle_website/posters nuvelle_website/public/posters
git mv nuvelle_website/videos nuvelle_website/public/videos
git mv nuvelle_mobile/posters nuvelle_mobile/public/posters
git mv nuvelle_mobile/icons nuvelle_mobile/public/icons
git mv nuvelle_mobile/manifest.webmanifest nuvelle_mobile/public/manifest.webmanifest
git mv nuvelle_mobile/sw.js nuvelle_mobile/public/sw.js
git mv nuvelle_mobile/ceo_secret_wife.mp4 nuvelle_mobile/public/ceo_secret_wife.mp4
git mv nuvelle_web/posters nuvelle_web/public/posters
git mv nuvelle_web/icons nuvelle_web/public/icons
git mv nuvelle_web/packs nuvelle_web/public/packs
git mv nuvelle_admin/icons nuvelle_admin/public/icons
git mv nuvelle_admin/seed_dramas.json nuvelle_admin/public/seed_dramas.json
```

Expected: every referenced asset folder exists under the correct `public/` directory.

- [ ] **Step 5: Commit the mechanical rename**

Run:

```bash
git add .gitignore nuvelle_website nuvelle_mobile nuvelle_web nuvelle_admin
git commit -m "chore: 重命名前端目录并迁移静态资源"
```

Expected: commit succeeds and does not include `.superpowers/` or `AGENTS.md`.

### Task 2: Root Workspace And Shared Tooling Contracts

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`

- [ ] **Step 1: Create root `package.json`**

Use this exact content:

```json
{
  "name": "nuvelle",
  "private": true,
  "packageManager": "pnpm@10.33.4",
  "scripts": {
    "dev:website": "pnpm --filter nuvelle_website dev",
    "dev:mobile": "pnpm --filter nuvelle_mobile dev",
    "dev:web": "pnpm --filter nuvelle_web dev",
    "dev:admin": "pnpm --filter nuvelle_admin dev",
    "build": "pnpm -r build",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test -- --run"
  }
}
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

Use this exact content:

```yaml
packages:
  - "nuvelle_website"
  - "nuvelle_mobile"
  - "nuvelle_web"
  - "nuvelle_admin"
```

- [ ] **Step 3: Create `tsconfig.base.json`**

Use this exact content:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  }
}
```

- [ ] **Step 4: Commit root workspace files**

Run:

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .gitignore
git commit -m "chore: 添加前端工作区配置"
```

Expected: commit succeeds.

### Task 3: App Package Config And shadcn-Compatible UI Primitives

**Files:**
- Create/replace framework config files listed in the File Structure section for all four apps.
- Create each app's `src/lib/utils.ts`.
- Create each app's `src/components/ui/*.tsx`.

- [ ] **Step 1: Create app `package.json` files before installing dependencies**

For `nuvelle_website/package.json`, use:

```json
{
  "name": "nuvelle_website",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "typecheck": "tsc --noEmit",
    "test": "vitest"
  },
  "dependencies": {},
  "devDependencies": {}
}
```

For `nuvelle_mobile/package.json`, use:

```json
{
  "name": "nuvelle_mobile",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "typecheck": "tsc -b --noEmit",
    "test": "vitest"
  },
  "dependencies": {},
  "devDependencies": {}
}
```

For `nuvelle_web/package.json`, use:

```json
{
  "name": "nuvelle_web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "typecheck": "tsc -b --noEmit",
    "test": "vitest"
  },
  "dependencies": {},
  "devDependencies": {}
}
```

For `nuvelle_admin/package.json`, use:

```json
{
  "name": "nuvelle_admin",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "typecheck": "tsc -b --noEmit",
    "test": "vitest"
  },
  "dependencies": {},
  "devDependencies": {}
}
```

- [ ] **Step 2: Install workspace dependencies**

Run:

```bash
pnpm add -w -D typescript @types/node
pnpm --filter nuvelle_website add next react react-dom lucide-react clsx tailwind-merge class-variance-authority @radix-ui/react-dialog @radix-ui/react-slot
pnpm --filter nuvelle_website add -D tailwindcss postcss autoprefixer vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitejs/plugin-react
pnpm --filter nuvelle_mobile add @vitejs/plugin-react vite react react-dom lucide-react clsx tailwind-merge class-variance-authority @radix-ui/react-dialog @radix-ui/react-slot
pnpm --filter nuvelle_mobile add -D tailwindcss postcss autoprefixer vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
pnpm --filter nuvelle_web add @vitejs/plugin-react vite react react-dom lucide-react clsx tailwind-merge class-variance-authority @radix-ui/react-dialog @radix-ui/react-slot
pnpm --filter nuvelle_web add -D tailwindcss postcss autoprefixer vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
pnpm --filter nuvelle_admin add @vitejs/plugin-react vite react react-dom lucide-react clsx tailwind-merge class-variance-authority @radix-ui/react-dialog @radix-ui/react-slot hls.js
pnpm --filter nuvelle_admin add -D tailwindcss postcss autoprefixer vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected: `pnpm-lock.yaml` is created and all four app `package.json` files contain their direct dependencies.

- [ ] **Step 3: Create framework config files**

Create each app's TypeScript, Tailwind, PostCSS, Vitest, and framework config files. `nuvelle_website/next.config.mjs` must use static export so the existing static deploy flow can serve the website:

```js
/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true
  }
};

export default nextConfig;
```

Vite apps must use `@vitejs/plugin-react`, `resolve.alias` for `@` to `src`, and Vitest `environment: "jsdom"`.

- [ ] **Step 4: Create shared local utility signature in every app**

Each app gets a local `src/lib/utils.ts` with this content:

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 5: Create shadcn-compatible Button primitive in every app**

Each app gets a local `src/components/ui/button.tsx` with this content:

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-white text-zinc-950 hover:bg-white/90",
        gradient: "bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] text-white shadow-lg shadow-fuchsia-950/30",
        ghost: "bg-white/8 text-white hover:bg-white/14",
        outline: "border border-white/18 bg-white/5 text-white hover:bg-white/10"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-5 text-base",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);

Button.displayName = "Button";
```

- [ ] **Step 6: Create Badge primitive in every app**

Each app gets a local `src/components/ui/badge.tsx` with this content:

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/85",
        className
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 7: Add app-specific dialog, sheet, tabs, input, and select primitives**

Create only the primitives listed in the File Structure section for each app. Keep them local to each app. Use Radix Dialog for dialog and sheet primitives, native `input`, `select`, and button elements wrapped with Tailwind classes for compact Admin controls.

- [ ] **Step 8: Verify empty app shells compile**

Run:

```bash
pnpm typecheck
```

Expected: typecheck passes after every app has a minimal `App.tsx` or `app/page.tsx` that renders the app name.

- [ ] **Step 9: Commit app configuration**

Run:

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json nuvelle_website nuvelle_mobile nuvelle_web nuvelle_admin
git commit -m "chore: 初始化 React 前端工程配置"
```

Expected: commit succeeds.

### Task 4: Website Data, Tests, And Next.js UI

**Files:**
- Create: `nuvelle_website/src/data/dramas.ts`
- Create: `nuvelle_website/src/__tests__/data.test.ts`
- Create: `nuvelle_website/src/__tests__/page.test.tsx`
- Create/modify: website components listed in File Structure.
- Create/modify: `nuvelle_website/app/layout.tsx`
- Create/modify: `nuvelle_website/app/page.tsx`
- Create/modify: `nuvelle_website/app/globals.css`

- [ ] **Step 1: Write website data tests**

Create `nuvelle_website/src/__tests__/data.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { bannerItems, getDramaBySlug, rows, searchDramas, statForDrama, top10 } from "../data/dramas";

describe("website drama data", () => {
  it("keeps the current hero and ranking data", () => {
    expect(getDramaBySlug("ceo_secret_wife")?.title).toBe("The CEO's Secret Wife");
    expect(top10[0]).toBe("ceo_secret_wife");
    expect(bannerItems.map((item) => item.slug)).toContain("ceo_secret_wife");
  });

  it("searches title, genre, and synopsis", () => {
    expect(searchDramas("mafia").map((drama) => drama.slug)).toContain("mafia_wife");
    expect(searchDramas("werewolf").length).toBeGreaterThan(0);
    expect(searchDramas("billionaire").length).toBeGreaterThan(0);
  });

  it("keeps the current row groups", () => {
    expect(Object.keys(rows)).toEqual([
      "New Releases",
      "Hidden Identity",
      "Magic & Mates",
      "Love at First Sight",
      "Revenge & Reversal",
      "Second Chance"
    ]);
  });

  it("generates stable display stats", () => {
    expect(statForDrama("ceo_secret_wife").views).toMatch(/M$/);
    expect(Number(statForDrama("ceo_secret_wife").rating)).toBeGreaterThanOrEqual(4.5);
  });
});
```

- [ ] **Step 2: Run website data tests and see the expected failure**

Run:

```bash
pnpm --filter nuvelle_website test -- --run src/__tests__/data.test.ts
```

Expected: FAIL because `src/data/dramas.ts` does not exist.

- [ ] **Step 3: Implement `src/data/dramas.ts`**

Move the `C`, `AFF`, `ROWS`, `TOP10`, and `BANNER` data from the old website HTML into typed exports with these exact signatures:

```ts
export type Drama = {
  slug: string;
  title: string;
  genre: string;
  episodes: string;
  synopsis: string;
  affiliateUrl?: string;
};

export type BannerItem = {
  slug: string;
  badge: string;
};

export const dramas: Drama[] = [];
export const top10: string[] = [];
export const rows: Record<string, string[]> = {};
export const bannerItems: BannerItem[] = [];

export function getDramaBySlug(slug: string): Drama | undefined {
  return dramas.find((drama) => drama.slug === slug);
}

export function searchDramas(query: string): Drama[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return dramas.filter((drama) =>
    `${drama.title} ${drama.genre} ${drama.synopsis}`.toLowerCase().includes(normalized)
  );
}

export function statForDrama(slug: string) {
  let hash = 0;
  for (let index = 0; index < slug.length; index += 1) hash = (hash * 31 + slug.charCodeAt(index)) >>> 0;
  return {
    views: `${(0.4 + (hash % 900) / 100).toFixed(1)}M`,
    rating: (4.5 + (hash % 5) / 10).toFixed(1)
  };
}
```

Replace the empty arrays and objects with the migrated data before running tests.

- [ ] **Step 4: Verify website data tests pass**

Run:

```bash
pnpm --filter nuvelle_website test -- --run src/__tests__/data.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write website page smoke test**

Create `nuvelle_website/src/__tests__/page.test.tsx`:

```tsx
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import WebsiteHome from "../../app/page";

describe("website home page", () => {
  it("renders catalog sections and opens a drama modal", async () => {
    const user = userEvent.setup();
    render(<WebsiteHome />);
    expect(screen.getByText("Nuvelle")).toBeInTheDocument();
    expect(screen.getByText("Top 10 This Week")).toBeInTheDocument();
    await user.click(screen.getAllByText("The CEO's Secret Wife")[0]);
    expect(screen.getByRole("dialog")).toHaveTextContent("Watch Episode 1");
  });

  it("filters search results", async () => {
    const user = userEvent.setup();
    render(<WebsiteHome />);
    await user.type(screen.getByPlaceholderText("Search dramas"), "mafia");
    expect(screen.getByText("Results")).toBeInTheDocument();
    expect(screen.getByText("Mafia Wife")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run website page smoke test and see the expected failure**

Run:

```bash
pnpm --filter nuvelle_website test -- --run src/__tests__/page.test.tsx
```

Expected: FAIL until `app/page.tsx` and components render the required UI.

- [ ] **Step 7: Implement Next.js website UI**

Implement these components using the existing website layout, assets, and text:

- `BrandMark` renders the ribbon-N SVG and "Nuvelle".
- `HeroCarousel` renders `bannerItems`, poster art, previous/next buttons, dots, and CTA buttons.
- `DramaCard` renders poster, genre badge, episode count, title, and synopsis.
- `DramaModal` renders a Radix dialog with poster, rating, views, episode list, Watch Episode 1, and Get the App.
- `AppBand` renders the app download section and the current store-style buttons.
- `app/page.tsx` is a client component with search state, active modal slug, banner index state, and row rendering.
- `app/globals.css` defines the current dark Nuvelle look, responsive grids, poster aspect ratios, carousel layout, modal layout, and footer.

- [ ] **Step 8: Verify website tests, typecheck, and build**

Run:

```bash
pnpm --filter nuvelle_website test -- --run
pnpm --filter nuvelle_website typecheck
pnpm --filter nuvelle_website build
```

Expected: all commands pass.

- [ ] **Step 9: Commit website rewrite**

Run:

```bash
git add nuvelle_website
git commit -m "feat: 用 Next.js 重写官网"
```

Expected: commit succeeds.

### Task 5: Mobile PWA Data, Tests, And Vite UI

**Files:**
- Create: `nuvelle_mobile/src/data/dramas.ts`
- Create: `nuvelle_mobile/src/lib/my-list.ts`
- Create: `nuvelle_mobile/src/lib/pwa.ts`
- Create: `nuvelle_mobile/src/__tests__/my-list.test.ts`
- Create: `nuvelle_mobile/src/__tests__/app.test.tsx`
- Create/modify: mobile components listed in File Structure.

- [ ] **Step 1: Write My List tests**

Create `nuvelle_mobile/src/__tests__/my-list.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { getSavedDramas, isSavedDrama, toggleSavedDrama } from "../lib/my-list";

describe("mobile My List storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("uses the existing localStorage key", () => {
    toggleSavedDrama("ceo_secret_wife");
    expect(JSON.parse(localStorage.getItem("nuvelle_list") || "[]")).toEqual(["ceo_secret_wife"]);
  });

  it("toggles saved dramas", () => {
    expect(isSavedDrama("mafia_wife")).toBe(false);
    expect(toggleSavedDrama("mafia_wife")).toEqual(["mafia_wife"]);
    expect(isSavedDrama("mafia_wife")).toBe(true);
    expect(toggleSavedDrama("mafia_wife")).toEqual([]);
    expect(getSavedDramas()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run My List tests and see the expected failure**

Run:

```bash
pnpm --filter nuvelle_mobile test -- --run src/__tests__/my-list.test.ts
```

Expected: FAIL because `src/lib/my-list.ts` does not exist.

- [ ] **Step 3: Implement `src/lib/my-list.ts`**

Use this exact logic:

```ts
const STORAGE_KEY = "nuvelle_list";

export function getSavedDramas(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function setSavedDramas(slugs: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(new Set(slugs))));
}

export function isSavedDrama(slug: string) {
  return getSavedDramas().includes(slug);
}

export function toggleSavedDrama(slug: string) {
  const current = getSavedDramas();
  const next = current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];
  setSavedDramas(next);
  return next;
}
```

- [ ] **Step 4: Verify My List tests pass**

Run:

```bash
pnpm --filter nuvelle_mobile test -- --run src/__tests__/my-list.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write mobile app smoke test**

Create `nuvelle_mobile/src/__tests__/app.test.tsx`:

```tsx
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../App";

describe("mobile app", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("switches tabs and searches dramas", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText("The CEO's Secret Wife")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /search/i }));
    await user.type(screen.getByPlaceholderText("Search dramas, genres..."), "mafia");
    expect(screen.getByText("Mafia Wife")).toBeInTheDocument();
  });

  it("saves a drama to My List from the details sheet", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByText("The CEO's Secret Wife")[0]);
    await user.click(screen.getByRole("button", { name: /add to my list/i }));
    await user.click(screen.getByRole("button", { name: /my list/i }));
    expect(screen.getByText("The CEO's Secret Wife")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Implement mobile app UI and PWA registration**

Implement:

- `src/data/dramas.ts` with the same drama slugs and row groups as the existing mobile HTML.
- `src/lib/pwa.ts` with `registerServiceWorker()` and `listenForInstallPrompt()` helpers.
- `App.tsx` with selected tab state, selected drama sheet state, and install prompt state.
- `MobileShell`, `HomeView`, `SearchView`, `MyListView`, `ProfileView`, and `DramaSheet` using the old PWA copy and visual hierarchy.
- `src/styles.css` with the phone-first dark layout, stable bottom tab dimensions, sheet overlay, poster grid, and install row.

- [ ] **Step 7: Verify mobile tests, typecheck, and build**

Run:

```bash
pnpm --filter nuvelle_mobile test -- --run
pnpm --filter nuvelle_mobile typecheck
pnpm --filter nuvelle_mobile build
```

Expected: all commands pass and `nuvelle_mobile/dist` contains `manifest.webmanifest`, `sw.js`, icons, posters, and the mp4 asset.

- [ ] **Step 8: Commit mobile rewrite**

Run:

```bash
git add nuvelle_mobile
git commit -m "feat: 用 Vite React 重写移动端 PWA"
```

Expected: commit succeeds.

### Task 6: CPS Portal Data, Tests, And Vite UI

**Files:**
- Create: `nuvelle_web/src/data/catalog.ts`
- Create: `nuvelle_web/src/lib/distributor.ts`
- Create: `nuvelle_web/src/lib/storage.ts`
- Create: `nuvelle_web/src/__tests__/distributor.test.ts`
- Create: `nuvelle_web/src/__tests__/portal.test.tsx`
- Create/modify: CPS components listed in File Structure.

- [ ] **Step 1: Write distributor helper tests**

Create `nuvelle_web/src/__tests__/distributor.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { distributorCode, promoLink } from "../lib/distributor";

describe("distributor helpers", () => {
  it("keeps deterministic Nuvelle Boost codes", () => {
    expect(distributorCode("creator@example.com")).toMatch(/^NB[A-Z0-9]+$/);
    expect(distributorCode("creator@example.com")).toBe(distributorCode("creator@example.com"));
  });

  it("builds existing promo links", () => {
    expect(promoLink("ceo_secret_wife", "NB123")).toBe("https://nuvelle.ai/d/ceo_secret_wife?ref=NB123");
  });
});
```

- [ ] **Step 2: Run distributor tests and see the expected failure**

Run:

```bash
pnpm --filter nuvelle_web test -- --run src/__tests__/distributor.test.ts
```

Expected: FAIL because `src/lib/distributor.ts` does not exist.

- [ ] **Step 3: Implement `src/lib/distributor.ts`**

Use this exact logic:

```ts
export function distributorCode(email: string) {
  let hash = 5381;
  for (let index = 0; index < email.length; index += 1) {
    hash = ((hash * 33) ^ email.charCodeAt(index)) >>> 0;
  }
  return `NB${hash.toString(36).toUpperCase().slice(0, 8)}`;
}

export function promoLink(slug: string, code: string) {
  return `https://nuvelle.ai/d/${slug}?ref=${code}`;
}
```

- [ ] **Step 4: Verify distributor tests pass**

Run:

```bash
pnpm --filter nuvelle_web test -- --run src/__tests__/distributor.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write CPS portal smoke test**

Create `nuvelle_web/src/__tests__/portal.test.tsx`:

```tsx
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";

describe("CPS portal", () => {
  beforeEach(() => {
    localStorage.clear();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });
  });

  it("joins and displays the material square", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByPlaceholderText("your@email.com"), "creator@example.com");
    await user.click(screen.getByRole("button", { name: /join free/i }));
    expect(screen.getByText("Material Square")).toBeInTheDocument();
    expect(screen.getByText(/NB/)).toBeInTheDocument();
  });

  it("adds grabbed links to My Links", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByPlaceholderText("your@email.com"), "creator@example.com");
    await user.click(screen.getByRole("button", { name: /join free/i }));
    await user.click(screen.getAllByRole("button", { name: /grab link/i })[0]);
    await user.click(screen.getByRole("button", { name: /my links/i }));
    expect(screen.getByText(/nuvelle.ai\/d\//)).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Implement CPS portal UI**

Implement:

- `src/data/catalog.ts` with the existing `PACKS` and `CAT` data.
- `src/lib/storage.ts` with `loadBoostState()`, `saveBoostState()`, `clearBoostState()`, and the existing `nuvelle_boost` key.
- `App.tsx` with gate state and active portal tab.
- `JoinGate`, `PortalShell`, `MaterialSquare`, `LinksView`, and `EarningsView`.
- `src/styles.css` with the current dark portal layout, dense pack cards, tables, KPI cards, and toast positioning.

- [ ] **Step 7: Verify CPS tests, typecheck, and build**

Run:

```bash
pnpm --filter nuvelle_web test -- --run
pnpm --filter nuvelle_web typecheck
pnpm --filter nuvelle_web build
```

Expected: all commands pass and `nuvelle_web/dist` contains `packs`, `posters`, and `icons`.

- [ ] **Step 8: Commit CPS rewrite**

Run:

```bash
git add nuvelle_web
git commit -m "feat: 用 Vite React 重写 CPS 门户"
```

Expected: commit succeeds.

### Task 7: Admin Core Types, Backend Client, And Scoring Tests

**Files:**
- Create: `nuvelle_admin/src/types/drama.ts`
- Create: `nuvelle_admin/src/lib/backend.ts`
- Create: `nuvelle_admin/src/lib/scoring.ts`
- Create: `nuvelle_admin/src/lib/storage.ts`
- Create: `nuvelle_admin/src/__tests__/backend.test.ts`
- Create: `nuvelle_admin/src/__tests__/scoring.test.ts`

- [ ] **Step 1: Write backend client tests**

Create `nuvelle_admin/src/__tests__/backend.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_BACKEND_URL, PromoBackendClient, normalizeBackendUrl } from "../lib/backend";

describe("admin backend client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes backend URLs", () => {
    expect(DEFAULT_BACKEND_URL).toBe("http://localhost:8799");
    expect(normalizeBackendUrl("https://example.com/")).toBe("https://example.com");
    expect(normalizeBackendUrl("  http://localhost:8799/// ")).toBe("http://localhost:8799");
  });

  it("posts votes to the configured backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    const client = new PromoBackendClient("http://localhost:8799", fetchMock);
    await client.postVote({ dramaId: 7, verdict: "fire", score: 82 });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8799/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drama_id: 7, verdict: "fire", score: 82 })
    });
  });

  it("creates promo generation requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, id: "job-1" })));
    const client = new PromoBackendClient("http://localhost:8799", fetchMock);
    const result = await client.generatePromo({
      url: "https://cdn.example/video.m3u8",
      title: "Demo",
      ep: 1,
      dur: 30,
      beats: [1.2, 3.4],
      prompt: "angrier hook",
      cover_image: "https://cdn.example/cover.jpg"
    });
    expect(result).toEqual({ ok: true, id: "job-1" });
  });
});
```

- [ ] **Step 2: Write scoring tests**

Create `nuvelle_admin/src/__tests__/scoring.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { nuvelleScore, tasteScore } from "../lib/scoring";
import type { DramaRecord } from "../types/drama";

const drama: DramaRecord = {
  id: 1,
  title: "Demo",
  platform: "ReelShort",
  genre: "Hidden Identity",
  cover_image_url: "",
  video_url: "https://cdn.example/video.m3u8",
  episode_count: 12,
  signal: "revenue $1,000,000 | 12,000 promoters",
  synopsis_or_hook: "A secret billionaire revenge story"
};

describe("admin scoring", () => {
  it("scores high-signal dramas above low-signal dramas", () => {
    expect(nuvelleScore(drama)).toBeGreaterThan(70);
    expect(nuvelleScore({ ...drama, signal: "revenue $2,000 | 1,000 promoters" })).toBeLessThan(nuvelleScore(drama));
  });

  it("detects taste tags from text", () => {
    expect(tasteScore(drama).tags).toContain("revenue");
    expect(tasteScore(drama).tags).toContain("hidden identity");
  });
});
```

- [ ] **Step 3: Run admin core tests and see expected failures**

Run:

```bash
pnpm --filter nuvelle_admin test -- --run src/__tests__/backend.test.ts src/__tests__/scoring.test.ts
```

Expected: FAIL because the core modules do not exist.

- [ ] **Step 4: Implement Admin types and backend client**

Create `types/drama.ts` with these exact exported types:

```ts
export type VoteVerdict = "fire" | "ok" | "pass";

export type DramaRecord = {
  id: number | string;
  title?: string;
  platform?: string;
  genre?: string;
  cover_image_url?: string;
  video_url?: string;
  source_url?: string;
  episode_count?: number | string;
  synopsis_or_hook?: string;
  signal?: string;
  rs_book_id?: string | number;
  episodes?: Record<string, string>;
};

export type VoteRecord = {
  dramaId: number | string;
  verdict: VoteVerdict;
  score: number;
};

export type PromoRequest = {
  url: string;
  title: string;
  ep: number;
  dur: number;
  beats?: number[];
  prompt?: string;
  cover_image?: string;
};
```

Create `lib/backend.ts` with `DEFAULT_BACKEND_URL`, `normalizeBackendUrl()`, and `PromoBackendClient` methods for `/health`, `/votes`, `/vote`, `/gen`, `/job`, `/gen-batch`, `/batch`, `/batch-download`, and `/rs-video`.

- [ ] **Step 5: Implement Admin scoring and storage**

Create `lib/scoring.ts` with `nuvelleScore(drama: DramaRecord): number` and `tasteScore(drama: DramaRecord): { score: number; tags: string[] }`. Parse `signal` for revenue and promoters, add weight for `video_url`, and tag text that includes hidden identity, revenge, billionaire, mafia, werewolf, reborn, or second chance.

Create `lib/storage.ts` with `loadAdminState()`, `saveAdminState()`, `clearAdminState()`, `loadBackendUrl()`, and `saveBackendUrl()` using the existing `nuvelle_promo_backend` key plus a namespaced admin state key.

- [ ] **Step 6: Verify Admin core tests pass**

Run:

```bash
pnpm --filter nuvelle_admin test -- --run src/__tests__/backend.test.ts src/__tests__/scoring.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Admin core**

Run:

```bash
git add nuvelle_admin
git commit -m "feat: 拆分 Admin 后端客户端和评分逻辑"
```

Expected: commit succeeds.

### Task 8: Admin UI, Promo Workflows, And Vite Build

**Files:**
- Create: `nuvelle_admin/src/__tests__/admin.test.tsx`
- Create/modify: Admin components listed in File Structure.
- Create/modify: `nuvelle_admin/src/App.tsx`
- Create/modify: `nuvelle_admin/src/styles.css`

- [ ] **Step 1: Write Admin smoke test**

Create `nuvelle_admin/src/__tests__/admin.test.tsx`:

```tsx
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";

describe("admin app", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/seed_dramas.json")) {
          return Promise.resolve(
            new Response(
              JSON.stringify([
                {
                  id: 1,
                  title: "Demo Drama",
                  platform: "ReelShort",
                  genre: "Hidden Identity",
                  video_url: "https://cdn.example/video.m3u8",
                  signal: "revenue $1,000,000 | 12,000 promoters"
                }
              ])
            )
          );
        }
        return Promise.resolve(new Response(JSON.stringify({ rated: [] })));
      })
    );
  });

  it("logs in with the existing local credentials and loads data", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByPlaceholderText("username"), "admin");
    await user.type(screen.getByPlaceholderText("password"), "admin");
    await user.click(screen.getByRole("button", { name: /login/i }));
    await waitFor(() => expect(screen.getByText("Demo Drama")).toBeInTheDocument());
    expect(screen.getByText(/Nuvelle Score/i)).toBeInTheDocument();
  });

  it("opens backend URL settings", async () => {
    const user = userEvent.setup();
    localStorage.setItem("nuvelle_admin_state", JSON.stringify({ loggedIn: true, votes: {}, generated: [] }));
    render(<App />);
    await user.click(screen.getByRole("button", { name: /backend/i }));
    expect(screen.getByDisplayValue("http://localhost:8799")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run Admin smoke test and see the expected failure**

Run:

```bash
pnpm --filter nuvelle_admin test -- --run src/__tests__/admin.test.tsx
```

Expected: FAIL until the Admin UI is implemented.

- [ ] **Step 3: Implement Admin app shell and login**

Implement:

- `App.tsx` loads `seed_dramas.json`, loads local admin state, fetches remote rated IDs from `/votes`, and renders either `LoginGate` or `AdminShell`.
- `LoginGate` accepts only `admin/admin`, then stores logged-in state.
- `AdminShell` renders top metrics, backend settings button, and tabs for Swipe, Board, and Generated.

- [ ] **Step 4: Implement Swipe workflow**

Implement:

- `SwipeView` displays current drama, cover, metadata, Nuvelle Score, taste tags, buttons for fire/ok/pass, highlight markers, duration selector, and one-click promo button.
- `VideoPreview` uses native video for mp4 and `hls.js` for `.m3u8`, with cleanup when the URL changes.
- Vote buttons update local state immediately and call `PromoBackendClient.postVote()` in the background. Failed remote sync shows a small non-blocking status.
- One-click promo calls `generatePromo()`, polls `getJob()`, and stores generated teaser, cover, caption, duration, and title in local generated history.

- [ ] **Step 5: Implement Board and detail workflow**

Implement:

- `BoardView` renders the ranked catalog, filter buttons, per-card score, platform, vote verdict, material-pack action, and "generate promo" action when `video_url` exists.
- `DramaModal` renders metadata, synopsis, episode list, URL input for missing episodes, direct episode preview, per-episode generation, custom episode generation, and "generate all available episodes".
- Batch generation calls `generateBatch()`, polls `getBatch()`, renders `BatchPanel`, and links to `/batch-download?id=...` when done.

- [ ] **Step 6: Implement Generated library**

Implement `GeneratedLibrary` with generated cards, teaser and cover download links, caption text, and regenerate input that reuses the stored source URL/title/episode/duration.

- [ ] **Step 7: Verify Admin tests, typecheck, and build**

Run:

```bash
pnpm --filter nuvelle_admin test -- --run
pnpm --filter nuvelle_admin typecheck
pnpm --filter nuvelle_admin build
```

Expected: all commands pass and `nuvelle_admin/dist` contains `seed_dramas.json` and icons.

- [ ] **Step 8: Commit Admin UI rewrite**

Run:

```bash
git add nuvelle_admin
git commit -m "feat: 用 Vite React 重写 Admin 控制台"
```

Expected: commit succeeds.

### Task 9: Backend Static Path And Deployment Docs

**Files:**
- Modify: `nuvelle_kit/promo_server.py`
- Modify: `deploy/deploy-gcp.sh`
- Modify: `deploy/README-gcp.md`
- Modify: `README.md`

- [ ] **Step 1: Update promo server admin static path**

Modify the dashboard-serving code in `nuvelle_kit/promo_server.py` so it serves `../nuvelle_admin/dist` first and falls back to a clear 404 JSON response if the build directory is absent.

- [ ] **Step 2: Update GCP deployment script**

Modify `deploy/deploy-gcp.sh` so it builds and deploys:

- `nuvelle_website`
- `nuvelle_mobile`
- `nuvelle_web`
- `nuvelle_admin`
- `nuvelle_kit`

For static frontends, the script must run the app build and deploy the generated output directory:

- `nuvelle_website/out`
- `nuvelle_mobile/dist`
- `nuvelle_web/dist`
- `nuvelle_admin/dist`

Keep the existing backend URL injection behavior for Admin, but change its marker from old inline HTML to a Vite environment or generated config file consumed by `nuvelle_admin`.

- [ ] **Step 3: Update README files**

Update `README.md` and `deploy/README-gcp.md` with the new directory table, `pnpm install`, per-app dev commands, build commands, Admin backend URL note, and the fact that deployment remains blocked until GCP billing is enabled.

- [ ] **Step 4: Run full validation**

Run:

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
python3 -m py_compile nuvelle_kit/promo_server.py
```

Expected: all commands pass.

- [ ] **Step 5: Commit docs and deployment compatibility**

Run:

```bash
git add README.md deploy nuvelle_kit/promo_server.py nuvelle_admin
git commit -m "chore: 更新重构后的部署和后端路径"
```

Expected: commit succeeds.

### Task 10: Browser Smoke Verification And Final Cleanup

**Files:**
- Modify only files needed to fix smoke-test issues found in this task.

- [ ] **Step 1: Start all app dev servers**

Run each command in its own terminal session:

```bash
pnpm dev:website -- --port 3000
pnpm dev:mobile -- --host 127.0.0.1 --port 5173
pnpm dev:web -- --host 127.0.0.1 --port 5174
pnpm dev:admin -- --host 127.0.0.1 --port 5175
```

Expected:

- Website is available at `http://localhost:3000`.
- Mobile app is available at `http://127.0.0.1:5173`.
- CPS portal is available at `http://127.0.0.1:5174`.
- Admin is available at `http://127.0.0.1:5175`.

- [ ] **Step 2: Verify website in the browser**

Use the in-app browser to open `http://localhost:3000`. Verify:

- Nuvelle header and hero render.
- Poster images render.
- Search for `mafia` shows `Mafia Wife`.
- Opening `The CEO's Secret Wife` shows the detail dialog.
- `Get the App` scrolls to the app band.

- [ ] **Step 3: Verify mobile PWA in the browser**

Use the in-app browser to open `http://127.0.0.1:5173`. Verify:

- Bottom tabs do not overlap content.
- Search for `revenge` returns dramas.
- Opening a drama shows the sheet.
- Adding to My List persists after switching tabs.
- Manifest and service worker requests return 200 in the dev server logs.

- [ ] **Step 4: Verify CPS portal in the browser**

Use the in-app browser to open `http://127.0.0.1:5174`. Verify:

- Joining with `creator@example.com` shows a `NB` distributor code.
- Material Square renders pack cards.
- Grab Link copies a `https://nuvelle.ai/d/...` link and adds it to My Links.
- Earnings tab shows demo KPIs.

- [ ] **Step 5: Verify Admin in the browser**

Use the in-app browser to open `http://127.0.0.1:5175`. Verify:

- Login with `admin/admin` succeeds.
- `seed_dramas.json` loads.
- Board view renders scored dramas.
- Backend settings show `http://localhost:8799`.
- Triggering promo generation with no backend shows a clear unreachable-generator error state instead of crashing.

- [ ] **Step 6: Run final git and validation check**

Run:

```bash
git status --short --branch
pnpm typecheck
pnpm test
pnpm build
```

Expected: all validation commands pass. `git status` may show only intentional implementation changes since the last commit plus untracked `AGENTS.md`.

- [ ] **Step 7: Commit smoke-test fixes**

If Step 2 through Step 6 required fixes, commit them:

```bash
git add nuvelle_website nuvelle_mobile nuvelle_web nuvelle_admin README.md deploy nuvelle_kit/promo_server.py package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json .gitignore
git commit -m "fix: 修复前端重构验收问题"
```

Expected: commit succeeds when there are fixes. If there are no fixes, skip this commit and report that the previous commits already pass validation.

## Self-Review Checklist

- Spec coverage: directory renames, Next website, Vite mobile/CPS/Admin, shadcn-style local components, Tailwind, TypeScript, root scripts, assets, Admin backend client, docs, deploy script, promo server path, and browser smoke tests are covered.
- Placeholder scan: this plan contains no placeholder tasks and no unresolved requirement markers.
- Type consistency: tests define stable names for `searchDramas`, `statForDrama`, `toggleSavedDrama`, `distributorCode`, `promoLink`, `PromoBackendClient`, `nuvelleScore`, and `tasteScore`; implementation tasks use those names.
- Scope check: this is one large coordinated rewrite. It is kept as one plan because the app renames, package workspace, lockfile, docs, and final validation cross all four apps.
