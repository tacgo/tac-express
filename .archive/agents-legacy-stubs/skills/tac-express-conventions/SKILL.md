---
name: tac-express-conventions
description: Code conventions and patterns for the tac-express monorepo. Use when writing new files, refactoring, setting up imports, or making structural decisions. Covers TypeScript conventions, file naming, import aliases, module structure, and Next.js App Router patterns.
---

# tac-express — Code Conventions

## File & Folder Naming

| Type | Convention | Example |
|------|-----------|---------|
| Component files | kebab-case.tsx | `user-card.tsx`, `dashboard-header.tsx` |
| Component exports | PascalCase | `export function UserCard` |
| Pages/Layouts | lowercase | `page.tsx`, `layout.tsx`, `loading.tsx` |
| Hook files | `use-` kebab-case | `use-session.ts`, `use-shipments.ts` |
| Service files | kebab-case.service.ts | `shipment.service.ts` |
| Type files | kebab-case.types.ts | `shipment.types.ts` |
| Utilities | kebab-case | `format-date.ts`, `api-client.ts` |
| Test files | same name + .test | `user-card.test.tsx` |
| TypeScript types | PascalCase | `UserProfile`, `ApiResponse` |
| Constants | SCREAMING_SNAKE | `MAX_RETRY_COUNT` |
| Directories | kebab-case | `user-profile/`, `composed/` |

## TypeScript Conventions

```ts
// ✅ Named exports preferred over default exports
export function MyComponent() {}
export const myUtil = () => {}

// ✅ Explicit return types for public functions
export function getUser(id: string): Promise<User> {}

// ✅ Interface for object shapes, type for unions/aliases
interface UserProfile {
  id: string
  name: string
}
type Status = "pending" | "active" | "inactive"

// ✅ Use 'as const' for static data
const ROUTES = {
  home: "/",
  dashboard: "/dashboard",
} as const

// ❌ Avoid 'any' — use 'unknown' if type is truly unknown
// ❌ Avoid enums — use 'as const' objects instead
```

## Import Order Convention

```ts
// 1. React core
import React, { useState, useEffect } from "react"

// 2. Third-party packages (alphabetical)
import { cva } from "class-variance-authority"

// 3. Workspace packages
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

// 4. App-local (absolute from app root or relative)
import { getUserById } from "@/lib/users"
import type { UserCardProps } from "./types"
```

## Import Aliases

```ts
// apps/web uses '@' alias for the app root
import { Component } from "@/components/component"
import { action } from "@/app/actions"
import { db } from "@/lib/db"

// cross-package workspace imports
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
```

## Next.js App Router Patterns

### File Conventions

```
apps/web/app/
├── layout.tsx          ← Root layout + ThemeProvider + fonts
├── page.tsx            ← Landing page
├── loading.tsx         ← Loading UI
├── error.tsx           ← Error boundary
├── not-found.tsx       ← 404 page
├── sign-in/
│   └── [[...sign-in]]/
│       └── page.tsx    ← Sign-in page (Supabase Auth)
├── track/
│   └── [id]/page.tsx ← Public shipment tracking
└── api/
    └── route-name/
        └── route.ts    ← API route handlers

apps/dashboard/app/
├── layout.tsx          ← Dashboard root layout + fonts (separate from web)
├── (public)/           ← Unauthenticated routes
│   ├── sign-in/page.tsx
│   └── sign-up/page.tsx
└── (protected)/        ← Authenticated routes (proxy.ts guards all)
    ├── home/page.tsx
    ├── shipments/page.tsx
    └── ...etc
```

### Server Components (default in App Router)

```tsx
// No directive needed — RSC by default
// Can use async/await directly
export default async function Page() {
  const data = await fetchData()
  return <div>{data.name}</div>
}
```

### Client Components

```tsx
"use client"  // Must be first line

import { useState } from "react"

export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

### API Routes

```ts
// apps/web/app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  return NextResponse.json({ users: [] })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return NextResponse.json({ created: true }, { status: 201 })
}
```

## Package Boundaries

| What | Where | Import as |
|------|-------|-----------|
| Shared UI components | `packages/ui/src/components/` | `@workspace/ui/components/x` |
| Shared hooks | `packages/ui/src/hooks/` | `@workspace/ui/hooks/x` |
| Shared utilities | `packages/ui/src/lib/` | `@workspace/ui/lib/x` |
| Global styles | `packages/ui/src/styles/` | `@workspace/ui/globals.css` |
| Auth service | `packages/auth/src/` | `@workspace/auth` |
| Database client | `packages/database/src/` | `@workspace/database` |
| Business logic | `packages/services/src/` | `@workspace/services` |
| Shared types | `packages/types/src/` | `@workspace/types` |
| App-specific logic | `apps/web/lib/` or `apps/dashboard/lib/` | `@/lib/x` |
| App page shells | `apps/*/components/` | `@/components/x` (page-local only) |

## Adding a New Package Dependency

```bash
# Add to a specific workspace
pnpm --filter web add <package>
pnpm --filter @workspace/ui add <package>
pnpm --filter @workspace/ui add -D <dev-package>

# Add to root (build tooling only)
pnpm add -D -w <package>
```

## ESLint & Formatting

- ESLint config extends `@workspace/eslint-config`
- Prettier for formatting (`.prettierrc` at root)
- Run `pnpm format` to format all files
- Run `pnpm lint` to lint all packages

## Zod for Validation

Use `zod` (from `@workspace/ui` or install in consuming package) for:
- API request/response validation
- Form schema definitions
- Environment variable validation

```ts
import { z } from "zod"

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
})

type User = z.infer<typeof UserSchema>
```
