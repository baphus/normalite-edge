# Local Development Setup - Normalite EDGE

This guide helps you set up the Normalite EDGE project locally for development.

## Prerequisites

- **Node.js**: v18+ (check with `node --version`)
- **npm**: v9+ (check with `npm --version`)
- **PostgreSQL**: v12+ (local or use Supabase/Docker)
- **Git**: For version control

---

## 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/your-org/normalite-edge.git
cd normalite-edge

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install

cd ..
```

---

## 2. Database Setup

### Option A: PostgreSQL Locally

```bash
# Create database
createdb normalite_db

# Set up schema with Prisma
cd server
npx prisma migrate dev --name init

# Seed with sample data (optional)
npm run db:seed
```

### Option B: Supabase (Cloud PostgreSQL)

1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Copy the connection string from Settings → Database → Connection Pooling
4. No migration needed - Supabase has PostgreSQL ready

---

## 3. Environment Configuration

### Backend Setup

```bash
# Copy template
cp server/.env.example server/.env

# Edit server/.env and set:
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/normalite_db
JWT_ACCESS_SECRET=dev-access-secret-key-here
JWT_REFRESH_SECRET=dev-refresh-secret-key-here
CLIENT_URL=http://localhost:5173
```

### Frontend Setup

```bash
# Copy template
cp client/.env.example client/.env.local

# Edit client/.env.local and set:
VITE_API_URL=http://localhost:5000/api/v1
```

---

## 4. Start Development Servers

### Terminal 1: Backend Server

```bash
cd server
npm run dev
```

Expected output:
```
Connected to PostgreSQL database
Server running on http://localhost:5000
API available at http://localhost:5000/api/v1
```

### Terminal 2: Frontend Server

```bash
cd client
npm run dev
```

Expected output:
```
VITE v... ready in ... ms

➜  Local:   http://localhost:5173/
➜  press h + enter to show help
```

---

## 5. Verify Setup

### Backend Health Check

```bash
curl http://localhost:5000/api/v1/health
```

Should return:
```json
{"status":"ok","timestamp":"2026-03-09T10:00:00.000Z"}
```

### Frontend Access

Open browser to `http://localhost:5173` - you should see the Normalite EDGE app.

---

## 6. Common Development Tasks

### Database Migrations

```bash
# Create a new migration
cd server
npx prisma migrate dev --name your_migration_name

# Apply migrations
npx prisma migrate dev

# View data with Prisma Studio
npm run db:studio
```

### Run TypeScript Compiler

```bash
# Backend
cd server
npm run tsc:check

# Frontend
cd client
npm run tsc:check
```

### Run Linter

```bash
# Frontend (if eslint configured)
cd client
npm run lint
```

### Build for Production

```bash
# Backend
cd server
npm run build

# Frontend
cd client
npm run build
```

---

## 7. Prisma Studio

Explore and edit your database graphically:

```bash
cd server
npm run db:studio
```

Opens at: `http://localhost:5555`

---

## 8. Troubleshooting

### Database Connection Failed

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**: 
- Ensure PostgreSQL is running
- Check DATABASE_URL in `.env` is correct
- Try: `psql -U postgres` to verify connection

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solution**:
```bash
# Kill process on port 5000 (macOS/Linux)
lsof -ti:5000 | xargs kill -9

# Or kill on Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Dependencies Not Installing

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Frontend can't reach backend

Check:
- Backend is running on port 5000
- `VITE_API_URL` in `client/.env.local` is `http://localhost:5000/api/v1`
- No CORS errors in browser console

---

## 9. Quick Reference

| Task | Command |
|------|---------|
| Start backend | `cd server && npm run dev` |
| Start frontend | `cd client && npm run dev` |
| Database migrations | `cd server && npx prisma migrate dev` |
| Open Prisma Studio | `cd server && npm run db:studio` |
| Build backend | `cd server && npm run build` |
| Build frontend | `cd client && npm run build` |
| Run tests (backend) | `cd server && npm test` |

---

## 10. VS Code Extensions (Optional)

Recommended for better development experience:

- **Prisma**: `prisma.prisma` - Prisma syntax highlighting
- **Thunder Client**: REST API testing
- **Tailwind CSS IntelliSense**: CSS class suggestions
- **ES7+ React/Redux/React-Native snippets**: React shortcuts

---

## Next Steps

1. Create a branch for your work: `git checkout -b feature/your-feature`
2. Make changes to backend/frontend
3. Test locally
4. Commit: `git commit -m "Add your feature"`
5. Push: `git push origin feature/your-feature`
6. Create a Pull Request

For deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

