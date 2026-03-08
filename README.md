# Normalite EDGE

Full-stack LET review management application.

## 🚀 Quick Start

### Development

```bash
# Backend
cd server && npm run dev

# Frontend (separate terminal)
cd client && npm run dev
```

For detailed local setup, see [LOCAL_SETUP.md](./LOCAL_SETUP.md)

### Production Deployment

Normalite EDGE is deployed to:
- **Frontend**: Vercel
- **Backend**: Render
- **Database**: Supabase (PostgreSQL)

**Getting started with deployment?**

1. **Read first**: [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
2. **Follow checklist**: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Step-by-step verification
3. **Generate secrets**: `node setup-deployment-vars.js` - Create JWT secrets for production

## 📚 Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment guide for Vercel + Render + Supabase
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Pre-deployment checklist and troubleshooting
- [LOCAL_SETUP.md](./LOCAL_SETUP.md) - Setting up local development environment
- [REQUIREMENTS.md](./REQUIREMENTS.md) - Business requirements and role permissions

## 🏗 Architecture

### Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS 4 + Vite
- **Backend**: Node.js + Express + Prisma + PostgreSQL
- **State Management**: React Context + React Hook Form
- **API**: RESTful API at `/api/v1` with JWT authentication

### Project Structure

```
normalite-edge/
├── client/              # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── contexts/    # AuthContext, NotificationContext
│   │   ├── lib/         # axios, utilities
│   │   └── hooks/
│   └── vite.config.ts
├── server/              # Express backend
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/  # errorHandler, auth
│   │   ├── config/      # env, cors, db
│   │   ├── services/
│   │   └── validators/  # Zod schemas
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   └── tsconfig.json
└── DEPLOYMENT.md        # Deployment guide
```

## 🔐 Environment Setup

### Backend (.env)

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/normalite_db
JWT_ACCESS_SECRET=dev-secret
JWT_REFRESH_SECRET=dev-secret
CLIENT_URL=http://localhost:5173
```

See [server/.env.example](./server/.env.example) for all options.

### Frontend (.env.local)

```env
VITE_API_URL=http://localhost:5000/api/v1
```

See [client/.env.example](./client/.env.example) for all options.

## 🗄 Database

### Local PostgreSQL

```bash
cd server
npx prisma migrate dev
npm run db:seed
npm run db:studio
```

### Supabase (Production)

Connection details in [DEPLOYMENT.md](./DEPLOYMENT.md#part-1-database-setup-supabase)

## 🚢 Deployment

### Automatic Deployment

Both Vercel and Render watch your GitHub repository:
- Push to `main` → automatic production deployment
- Create PR → Vercel creates preview deployments

### Manual Deployment

See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for step-by-step instructions.

## 📱 API Endpoints

Base URL: `http://localhost:5000/api/v1`

### Authentication
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - User logout

### Users
- `GET /users` - List users (admin only)
- `GET /users/:id` - Get user details
- `PUT /users/:id` - Update user

### Exams
- `GET /exams` - List exams
- `POST /exams` - Create exam (reviewer only)
- `GET /exams/:id` - Get exam details
- `PUT /exams/:id` - Update exam
- `DELETE /exams/:id` - Delete exam

For all endpoints, see server routes in `server/src/routes/v1/`

## 🔑 Authentication

Uses JWT with dual tokens:
- **Access Token**: Short-lived (15m), sent in Authorization header
- **Refresh Token**: Long-lived (7d), sent as HTTP-only cookie

Automatic refresh handled by axios interceptor in `client/src/lib/axios.ts`

## 👥 Roles & Permissions

- **ADMIN**: Full access, user management
- **REVIEWER**: Create/review exams, manage materials
- **REVIEWEE**: Take exams, view results, manage own data

See [REQUIREMENTS.md](./REQUIREMENTS.md#section-4-roles--permissions) for detailed permissions.

## 🛠 Development Workflow

### Create a feature branch

```bash
git checkout -b feature/your-feature
```

### Make changes

```bash
# Backend changes
cd server && npm run dev

# Frontend changes
cd client && npm run dev
```

### Type checking & linting

```bash
# Frontend
cd client && npm run tsc:check && npm run lint

# Backend
cd server && npm run tsc:check
```

### Commit & push

```bash
git add .
git commit -m "Add your feature"
git push origin feature/your-feature
```

### Create pull request

Open a PR on GitHub for code review.

## 🐛 Troubleshooting

### Can't connect to backend

- Ensure backend is running: `cd server && npm run dev`
- Check `VITE_API_URL` in frontend `.env.local`
- Verify port 5000 is not blocked

### Database migration failed

```bash
cd server
npx prisma migrate resolve --rolled-back your_migration_name
npx prisma migrate dev --name migration_name
```

### TypeScript errors

```bash
# Clear cache and rebuild
rm -rf dist
npm run build
```

See [LOCAL_SETUP.md#8-troubleshooting](./LOCAL_SETUP.md#8-troubleshooting) for more.

## 📞 Support

For issues, questions, or suggestions, please create a GitHub issue.

## 📄 License

[Your License Here]

