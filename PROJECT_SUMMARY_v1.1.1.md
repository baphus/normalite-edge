# Normalite EDGE — Project Summary

**Version:** 1.1.1
**Date:** 2026-07-07
**Prepared by:** Joseph Sarsonas (independent developer)

## Changelog
- v1.1.1 (2026-07-07): Noted that self-service password reset does not exist yet (no reset endpoint found in the codebase) and ties it to the same email-delivery gap.
- v1.1.0 (2026-07-07): Added "Known Limitations" section documenting the absence of email notifications and its cause.
- v1.0.0 (2026-07-07): Initial project summary compiled from current codebase.

---

## 1. What it is

Normalite EDGE is a full-stack review and licensure-exam preparation platform (LET review) built for a state university. It lets reviewers/instructors build timed practice exams and study materials, and lets student reviewees take exams, track their performance, and study using flashcard-style decks — with admin tooling for managing campuses, programs, and user accounts across multiple campuses.

## 2. Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS 4, Vite |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Database | PostgreSQL (Supabase) |
| Auth | JWT (access + refresh token), Google OAuth |
| File/image storage | Cloudinary |
| Hosting | Vercel (frontend), Render (backend) |

**Scale:** ~29,000 lines of frontend code, ~8,300 lines of backend code, 32 distinct application pages, 16 backend route/controller/service modules, 15+ database models.

## 3. User roles

- **Admin** — full system access, user/campus/program management, system settings, audit logs.
- **Reviewer** — creates and manages exams and study materials, views student performance.
- **Reviewee** — takes exams, studies materials, tracks own results.

## 4. Feature list

### Authentication & access
- Email/password login with JWT access + refresh tokens
- Google OAuth sign-in
- Email verification link generation with resend flow (see Known Limitations — not yet delivered by email)
- Role-based access control (Admin / Reviewer / Reviewee)
- Guided onboarding flow for new users, with per-user progress tracking

### Exam engine — building
- Multi-section exams with per-section time limits
- Multiple-choice questions with images, rationalized answers, and point weighting
- Exam scheduling (start/end windows), max-attempt limits, cooldown periods
- Draft / Live / Archived / Closed exam status lifecycle
- Visibility control by academic track/program
- Configurable feedback mode (immediate vs. after-submission)

### Exam engine — taking
- Live countdown timer synced to server-calculated end time
- Autosave every 15 seconds with resume-in-progress support
- Tab-switch / focus-loss detection with configurable grace period (anti-cheating)
- Automatic submission on deadline or time expiry
- Per-question elapsed-time tracking

### Results & analytics
- Detailed per-attempt results and answer review
- Exam-level performance analytics (averages, highs/lows, attempt counts)
- Role-specific dashboards (Admin, Reviewer, Reviewee)

### Study Hub
- Flashcard-style study decks with view / flashcard / quiz modes
- Custom decks and per-user session tracking with resume support
- Deck visibility by academic track

### Admin & management
- Student and user account management (create, edit, disable, role/status changes, account approval)
- Campus and academic-track/program management
- System-wide settings (multiple-attempt policy, tab-switch enforcement, grace period)
- System audit log with actor, action, and entity tracking

### Reporting & export
- Excel export of student scores and submissions, with filters (campus, program, date range)
- PDF report generation for exam results and performance summaries

### Notifications & communication
- Real-time **in-app** notifications (account approval/rejection, exam-related alerts)
- Calendar view and video-conference session scheduling (with recording links)

### Other
- Profile management with profile picture upload (Cloudinary)
- Responsive UI across devices

## 5. Known limitations

- **No email notifications yet.** The system generates email-verification links and account-status notifications, but does not currently send them by email — verification links are only written to server logs, and approval/rejection notices appear as in-app notifications only. This is why, in the current release, new accounts are verified manually by an Admin instead of through an automated "click the link in your email" flow (see the Getting Started Guide).
- **Why this hasn't been enabled:** sending real email requires integrating a transactional email provider (e.g., SendGrid, Resend, Postmark, AWS SES) — this is a separate paid service, not something Render/Supabase provide out of the box. In addition, Render restricts outbound SMTP traffic on its free/starter tiers as a spam-prevention measure, so reliable delivery would need either a paid Render tier with fewer network restrictions or, more practically, an API-based email provider (most offer a free tier for low volume, with paid plans as usage grows). Until that budget line is approved, manual admin verification is the working substitute.
- **No self-service password reset yet.** There is currently no "forgot password" flow in the codebase at all. This is the same underlying gap as above — a reset flow would also need email delivery to send reset links securely. Until then, an Admin must reset a user's password manually.

## 6. Documents that can be produced from this project

The items below can be generated directly from the current codebase/config with no additional judgment calls required:

- This feature summary (regenerate as code changes)
- API endpoint list (from `server/src/routes/v1/`)
- Database schema/ER documentation (from `server/prisma/schema.prisma`)
- Environment variable reference (from `.env.example` files, already partially captured in [DEPLOYMENT.md](DEPLOYMENT.md))

The items below require human review/decision before they can be finalized — they involve judgment, institutional policy, or legal exposure that the code alone doesn't determine:

- Data privacy / data protection impact assessment (what student PII is collected, retention period, who can access it)
- Formal access-control and incident-response policy
- Service-level agreement / support terms for the university
- Any pricing, invoice, or contract document

## 7. Standards-readiness notes (informational — not a certification artifact)

If this system is ever expected to support an ISO 27001 or SOC 2-style review (common when a state university's IT security office audits vendor systems handling student records), the following would need attention — flagging now so it isn't a surprise at audit time:

- **No rate limiting on authentication endpoints** (`express-rate-limit` or equivalent is not currently present in `server/src` dependencies) — brute-force protection gap.
- **No `helmet`-equivalent security headers middleware** currently configured.
- **No documented data retention/deletion policy** for student exam data, attempts, or audit logs.
- **No automated email delivery** for account verification — currently a manual admin process (see Known Limitations above), which is itself an access-control control worth documenting formally rather than leaving informal.
- **Audit logging exists** (`AuditLog` model, tracks actor/action/entity) — this is a good foundation for SOC 2/ISO 27001 access-monitoring controls.
- **Password hashing uses `bcryptjs`** — acceptable, industry-standard approach.
- **No automated backup/retention policy documented** beyond Supabase's platform-level backups (7-day on Pro plan).

These are engineering/policy gaps, not blockers to running the system today — but closing them is far cheaper now than retrofitting them under audit pressure later.
