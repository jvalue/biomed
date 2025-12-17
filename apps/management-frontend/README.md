# management-frontend

A React + TypeScript frontend using Vite and Tailwind, organized for modular development and reusable UI.

## Project Structure

- `'src/app/components/design-components/'`: All reusable design components (atoms/molecules), e.g. `'button.tsx'`, `'table.tsx'`. These are generic and should not include domain logic.
- `'src/app/components/workflows/'`: Non-reusable domain-specific components for workflows. Create a dedicated folder per domain (e.g. `'workflows'`, `'users'`, `'reports'`), and place components there when they are not reusable across domains.
- `'src/app/routes/'`: Page-level route components (e.g. `'index.tsx'`, `'workflow-list.tsx'`). These represent pages and integrate domain components and services.
- `'src/app/api/dto/'`: Data Transfer Objects (DTOs) describing API payloads and responses. Subfolders per domain (e.g. `'workflow/'`, `'pagination/'`).
- `'src/app/api/services/'`: Service layer that orchestrates API calls and business logic (e.g. `'workflow-service.ts'`).
- `'src/app/api/management-backend-client.ts'`: HTTP client configuration and helpers to talk to the backend.
- `'src/app/hooks/'`: Reusable hooks for data fetching and state (e.g. `'useWorkflowRuns.ts'`).
- `'src/app/'`: App shell, router, layout and navigation (e.g. `'app.tsx'`, `'app-nav.tsx'`, `'router.tsx'`).
- `'src/assets/'`: Static assets.
- `'public/config.js'`: Runtime configuration injected at load time (see Environment section below).
- `'tailwind.config.js'`: Tailwind setup, including design tokens and base colors.
- `'vite.config.mts'`, `'tsconfig*.json'`: Build and TypeScript configuration.

## Tailwind Design Tokens

Base brand colors and design tokens are defined in `'tailwind.config.js'`. Keep global colors, spacing, typography scales there. Reference them via Tailwind classes in components. Update only through the config to ensure consistency.

## Components Guidelines

- Reusable design components: place in `'src/app/components/design-components/'`. Keep them domain-agnostic, well-typed, and documented. Examples: Button, Input, Table, Tooltip, Skeleton, Spinner, Sidebar, Sheet, Avatar, Separator.
- Domain-specific, non-reusable components: create a folder per domain under `'src/app/components/'` (e.g. `'workflows/'`). These may compose design-components and implement domain logic.
- Pages (routes): implement in `'src/app/routes/'`.

## DTOs and Services

- DTOs: place in `'src/app/api/dto/'` with subfolders per domain (e.g. `'workflow/workflow-run.dto.ts'`, `'pagination/cursor-based-pagination-response.dto.ts'`). Keep them simple TypeScript types/interfaces.
- Services: place in `'src/app/api/services/'`. Services encapsulate backend communication, compose the client, and expose typed functions for the UI (e.g. `'workflow-service.ts'`).

## ShadCN Components

We use ShadCN-style components under `'src/app/components/design-components/'`.

### How to generate ShadCN components

Generate a new component:
```bash 
npx shadcn@latest add button 
```
## Environment Configuration

### Purpose of `'public/config.js'`

- `'public/config.js'` (exposed as `'public/config.js'` in the built app) provides runtime configuration (`window.__CONFIG__`) loaded before the app bootstraps.
- This enables reading environment variables at runtime instead of compile-time, useful for different deployments without rebuilding.

Example shape:
```js
window.__CONFIG__ = {
  API_BASE_URL: "https://example/api",
  // other public runtime vars
};