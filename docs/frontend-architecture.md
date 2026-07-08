# Frontend Architecture

The UI is built with **React 18**, **TypeScript**, and **Vite**.  
State management and data fetching are handled by **React Query** (`@tanstack/react-query`).

## Project layout
frontend/
├─ src/
│ ├─ components/ # Re‑usable UI primitives (Button, Badge, Input, etc.)
│ ├─ hooks/ # Custom React hooks (e.g., useAuth)
│ ├─ pages/ # Route‑level components (Dashboard, BorrowingPage, etc.)
│ ├─ services/ # API wrappers (auth.ts, assets.ts, borrowing.ts)
│ ├─ types/ # TypeScript interfaces for API payloads
│ ├─ utils/ # Small helpers (classNames, etc.)
│ └─ main.tsx # Application entry point
├─ public/
│ └─ favicon.ico # Browser tab icon
├─ vite.config.ts # Vite configuration
└─ index.html # HTML shell (links favicon)
