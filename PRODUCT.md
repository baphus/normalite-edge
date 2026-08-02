# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary:** Reviewee (student) — a college student at Cebu Normal University preparing for the Licensure Examination for Teachers (LET). They log in to take timed mock exams, study flashcard decks, track their scores over time, and view upcoming conferences. The design must serve their core loop: study → practice exam → review results → study again.
- **Secondary:** Reviewer (instructor) — creates and manages exams and study materials, monitors student performance. Needs efficient content creation flows and clear analytics views.
- **Tertiary:** Admin — manages users, campuses, programs, and system settings. Needs oversight tools and audit visibility.

## Product Purpose

Normalite EDGE gives Cebu Normal University full ownership of its LET review and exam preparation workflow — replacing reliance on generic LMS platforms with a purpose-built tool that the university controls, customizes, and scales on its own terms. Success means students are better prepared for the LET, instructors have clear visibility into performance, and the university retains complete data sovereignty.

## Positioning

CNU owns the platform — no vendor lock-in, no third-party data exposure, no feature bloat from a generic LMS. The system is tailored to the university's exact LET review workflow: multi-section timed exams with anti-cheating, flashcard-style study decks with quiz modes, campus-and-program-scoped content, and role-based access that matches the university's review center structure. A competing product cannot truthfully claim both purpose-built LET focus and full university data ownership.

## Operating Context

- Students access the platform from desktop browsers (campus computer labs) and mobile devices (personal phones/tablets) — responsive design is essential.
- Exam sessions are time-critical: countdown timers, autosave every 15 seconds, tab-switch detection, and automatic submission on deadline.
- The platform serves multiple campuses and academic programs — content is scoped by program_track.
- Deployment: Vercel (frontend), Render (backend), Supabase (PostgreSQL). Email delivery is not yet integrated — account verification is currently manual by Admin.
- The developer (Joseph Sarsonas) is an independent contractor; payment is structured through the university's disbursement process.

## Capabilities and Constraints

**Confirmed functionality:**
- Auth with JWT (access + refresh tokens) + Google OAuth, email verification (link generated but not sent by email yet)
- Role-based access: Admin / Reviewer / Reviewee with granular permissions
- Exam engine: multi-section exams with per-section time limits, scheduling, max-attempt limits, cooldown periods, draft/live/archived/closed lifecycle
- Exam taking: live countdown, autosave, tab-switch detection, auto-submit on deadline, per-question time tracking
- Study Hub: flashcard decks with view/flashcard/quiz modes, session persistence and resume
- Results & analytics: per-attempt results, exam-level performance analytics, role-specific dashboards
- Admin tools: user/campus/program management, system settings, audit logs
- Reports: Excel and PDF export of student scores with filters
- Notifications: real-time in-app notifications (email delivery not yet integrated)
- Calendar and video-conference scheduling
- Profile management with Cloudinary image upload

**Technical constraints:**
- React 19 + TypeScript + Tailwind CSS 4 + Vite (frontend)
- Express + Prisma + PostgreSQL (backend)
- ~29K lines frontend, ~8.3K lines backend, 32 pages, 15+ database models
- No email delivery service integrated yet (links go to server logs)
- No self-service password reset yet
- No rate limiting or security headers middleware yet

**Undecided product facts:**
- Email provider choice (SendGrid, Resend, Postmark, AWS SES) — blocked on budget approval
- Password reset flow — depends on email delivery
- Rate limiting and security headers — engineering gap, not yet scoped

## Brand Commitments

- **Product name:** Normalite EDGE
- **CNU brand elements:** Logo and color palette exist and must be preserved. Specific logo file and color values to be provided by the user.
- **Voice:** Professional academic tone — clear, direct, no marketing fluff. The interface should feel like a tool built for serious exam preparation, not a consumer app.

## Evidence on Hand

- Full deployed application (Vercel frontend + Render backend + Supabase database)
- Comprehensive prototype pages in `prototype/` directory (admin, reviewer, reviewee flows)
- Project documentation: README.md, PROJECT_SUMMARY_v1.1.1.md, requirements.md, DEPLOYMENT.md
- Pricing proposal (PRICING_PROPOSAL_v1.0.0.md)
- Prisma schema with 15+ database models
- 32 distinct application pages across all three roles

**Absences future work must not fabricate:**
- Testimonials, customer success stories, or usage statistics
- Pricing claims beyond the developer's proposal
- Email delivery or notification claims beyond in-app notifications
- Data retention or compliance certifications

## Product Principles

1. **Student-first design.** Every surface is evaluated through the Reviewee's study loop: study → practice → review → improve. If it doesn't help a student prepare for the LET, it doesn't ship.
2. **University sovereignty.** CNU owns the data, controls access, and customizes the workflow. No vendor lock-in, no external data exposure, no features that compromise institutional control.
3. **Exam integrity.** Timed exams must be reliable, fair, and tamper-resistant. Autosave, tab-switch detection, and auto-submission are non-negotiable — data loss during an exam is unacceptable.
4. **Focused feature set.** Build only what LET review requires. Resist the urge to become a general-purpose LMS. Every feature must earn its place against the core workflow.
5. **Reliable at scale.** The platform must work during peak exam periods when many students are taking timed exams simultaneously. Performance and reliability are not optional.

## Accessibility & Inclusion

- Responsive design across desktop and mobile devices (REQ-NF-001)
- No specific accessibility standard (WCAG, Section 508) was formally required, but the student-facing interface should be usable and readable across device sizes
- The primary users are college students in the Philippines — mobile-first responsive behavior is important for personal device access
