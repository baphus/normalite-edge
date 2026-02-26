# Normalite EDGE - Agent Instructions

This document provides context and guidelines for AI coding agents working on the Normalite EDGE codebase.

## 🏗 Big Picture & Architecture

Normalite EDGE is a full-stack web application for LET review management.

### Structure
- **client/**: React 19 + Vite frontend.
- **server/**: Node.js + Express backend.
- **prototype/**: Static HTML/JS prototypes (reference only).

### Technology Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Radix UI / Shadcn UI components.
- **Backend**: Node.js, Express, Prisma ORM, PostgreSQL.
- **State Management**: React Context (`AuthContext`), React Hook Form + Zod.
- **API**: RESTful API at `/api/v1`. Authentication uses Access (header) and Refresh (cookie) tokens.

## 🚀 Critical Developer Workflows

### Running the Project
The project requires running frontend and backend in separate terminals:
1. **Backend**: `cd server && npm run dev` (Runs on port 5000 via `tsx watch`, see `server/package.json`).
2. **Frontend**: `cd client && npm run dev` (Runs on default Vite port, see `client/package.json`).

### Database Management
- **Schema Changes**: Modify `server/prisma/schema.prisma`.
- **Apply Changes**: Run `npx prisma migrate dev` in the `server` directory.
- **Seed Data**: Run `npm run db:seed` in the `server` directory.

### API Communication
- All API requests should use the configured `api` instance from `client/src/lib/axios.ts`.
- **Base URL**: Defaults to `http://localhost:5000/api/v1`.
- **Auth**: Automatically handles Access Token (Header) and Refresh Token (Cookie) rotation.

## 🧩 Project Conventions & Patterns

### Frontend
- **Components**: Use Shadcn UI components from `client/src/components/ui` whenever possible.
- **Forms**: Use `react-hook-form` + `zod` resolvers.
- **Styling**: Tailwind CSS utility classes. Avoid custom CSS files unless necessary.
- **Routing**: React Router 7. `ProtectedRoute` and `RoleRoute` wrap authenticated pages.
- **State**: Use React Context for global state (e.g., `client/src/contexts/AuthContext.tsx`).
- **Imports**: Use path aliases defined in `client/tsconfig.app.json` (e.g., `@/components`, `@/lib`).

### Backend
- **Structure**: Follow `Routes` -> `Controllers` -> `Services` pattern (implied, though services layer might be thin).
- **Validation**: Validate all request bodies using `zod` schemas/validators before processing in controllers.
- **Error Handling**: Use the global error handler (`server/src/middleware/errorHandler`). Pass errors to `next(error)` in async controllers.
- **Prisma**: Use `prisma` client instance for all DB operations.

### Authentication & Authorization
- **Login**: `/auth/login` returns `{ accessToken, user }`. Store token in `localStorage`, user in Context.
- **Refresh**: Handled automatically by axios interceptor on 401 response (see `client/src/lib/axios.ts`).
- **RBAC**: Middleware checks `user.role` (ADMIN, REVIEWER, REVIEWEE). Refer to `REQUIREMENTS.md` for role-specific permissions.

## 📄 Reference Files
- **Requirements**: `REQUIREMENTS.md` (Business logic source of truth, especially Section 4 Roles & Permissions).
- **API Client**: `client/src/lib/axios.ts`.
- **DB Schema**: `server/prisma/schema.prisma`.
- **Routes**: `client/src/routes/*.tsx` and `server/src/routes/v1/`.

## ⚠️ Common Pitfalls
- **Token Auth**: Do not manually handle token refresh in components; rely on the axios interceptor.
- **Tailwind**: Ensure Tailwind 4 syntax is used.
- **Prisma**: Always await database calls. Remember to handle relational data with `include` or `select`.
