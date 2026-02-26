# requirements.md

## Normalite EDGE – Everyday Digital Guide to Excellence

---

# 1. System Overview

Normalite EDGE is a web-based Learning and Review Management System for LET review centers.

The system SHALL allow instructors to manage study content, create mock exams with multiple sections, schedule conferences, track student performance, generate reports, maintain audit logs, and send notifications.

Technology Stack:

* Frontend: React
* Backend: Node.js + Express
* Database: PostgreSQL
* ORM: Prisma

Roles:

* ADMIN
* REVIEWER
* REVIEWEE

---

# 2. Main Goals

The system SHALL:

* Provide organized LET review resources (question decks and mock exams)
* Provide timed mock exams with rationalizations
* Support study modes (view, flashcards, quiz)
* Save progress even after disconnect
* Allow instructors to monitor student performance
* Provide admin reports and audit logs
* Notify users of important events
* Enforce secure controlled registration

---

# 3. Security and Registration

REQ-AUTH-001 Self-registration SHALL accept only emails ending with `@cnu.edu.ph`.
REQ-AUTH-002 ADMIN-created accounts MAY use any email domain.
REQ-AUTH-003 Emails SHALL be normalized (trim + lowercase) and unique.
REQ-AUTH-004 Passwords SHALL be bcrypt-hashed.
REQ-AUTH-005 Users with status `PENDING` SHALL NOT log in.
REQ-AUTH-006 JWT authentication SHALL be used.

---

# 4. Program Track

The system SHALL store one field `program_track` to represent program + major and use it for filtering content and analytics.

Examples:

* Bachelor of Secondary Education – Mathematics
* Bachelor of Technology and Livelihood Education – Home Economics
* Diploma in Professional Education

REQ-PROG-001 Materials, exams, conferences, analytics, reports, and notifications targeting SHALL support filtering by `program_track`.

---

# 5. Roles and Permissions

## 5.1 ADMIN

Admins SHALL:

* approve registrations and manage users
* CRUD all study decks, deck questions, mock exams, exam sections, exam questions, conferences
* view all analytics
* generate reports (CSV/PDF)
* view full audit logs
* configure system settings (optional)

## 5.2 REVIEWER

Reviewers SHALL:

* CRUD their own study decks and mock exams
* create multi-section mock exams and add questions
* view student profiles and performance
* view other reviewers’ profiles
* view other reviewers’ decks and mock exams (READ-ONLY)
* view activity feed of newly created/updated content (decks/exams/conferences)

Reviewers SHALL NOT:

* edit/delete other reviewers’ decks or mock exams
* manage users

**Ownership Rules**
REQ-OWN-001 A reviewer SHALL CRUD resources they created.
REQ-OWN-002 A reviewer SHALL have READ-ONLY access to resources created by other reviewers.
REQ-OWN-003 Only ADMIN may edit/delete resources owned by another reviewer.

## 5.3 REVIEWEE

Reviewees SHALL:

* access study decks on the Study page
* use decks in view mode, flashcard mode, and quiz mode
* take mock exams with autosave/resume
* join conferences
* view their own profile and performance

Reviewees SHALL NOT:

* create/edit/delete content
* view other users’ performance

---

# 6. Core Data Models (PostgreSQL)

All IDs SHALL be UUID.

---

## 6.1 Users

```sql
users(
 id PK,
 first_name TEXT NOT NULL,
 last_name TEXT NOT NULL,
 middle_initial CHAR(1) NULL,
 suffix TEXT NULL,
 email TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 role ENUM('ADMIN','REVIEWER','REVIEWEE') NOT NULL,
 status ENUM('PENDING','ACTIVE','DISABLED') NOT NULL,
 program_track TEXT NULL,
 created_by_admin BOOLEAN DEFAULT FALSE,
 is_external_email BOOLEAN DEFAULT FALSE,
 created_at TIMESTAMP NOT NULL,
 updated_at TIMESTAMP NOT NULL
)
```

---

## 6.2 Study Materials = Study Decks (UPDATED)

Study materials are decks/sets of questions with correct answers and rationalizations.

### 6.2.1 study_decks

```sql
study_decks(
 id PK,
 title TEXT NOT NULL,
 description TEXT NULL,
 subject TEXT NULL,
 program_track TEXT NULL,
 visibility ENUM('DRAFT','PUBLISHED') NOT NULL,
 created_by UUID REFERENCES users(id) NOT NULL,
 created_at TIMESTAMP NOT NULL,
 updated_at TIMESTAMP NOT NULL
)
```

### 6.2.2 study_deck_questions

```sql
study_deck_questions(
 id PK,
 deck_id UUID REFERENCES study_decks(id) ON DELETE CASCADE,
 order_no INT NOT NULL,
 question_text TEXT NOT NULL,
 choice_a TEXT NULL,
 choice_b TEXT NULL,
 choice_c TEXT NULL,
 choice_d TEXT NULL,
 correct_choice CHAR(1) NULL,          -- required for quiz mode; optional for pure Q/A decks
 answer_text TEXT NULL,                -- optional if not multiple-choice
 rationalization TEXT NULL,
 points INT DEFAULT 1,
 UNIQUE(deck_id, order_no)
)
```

Notes:

* A deck MAY be multiple-choice (quiz-friendly) or Q/A-only (flashcards/view).
* For Kahoot-style quiz mode, choices and correct_choice are required.

---

## 6.3 Deck Study Sessions (NEW: Progress + Summary)

To support “end session” and “finish deck” summaries and to persist progress, store deck sessions.

### 6.3.1 deck_sessions

```sql
deck_sessions(
 id PK,
 deck_id UUID REFERENCES study_decks(id) ON DELETE CASCADE,
 user_id UUID REFERENCES users(id) ON DELETE CASCADE,
 mode ENUM('VIEW','FLASHCARDS','QUIZ') NOT NULL,
 status ENUM('IN_PROGRESS','COMPLETED','ENDED') NOT NULL,
 started_at TIMESTAMP NOT NULL,
 ended_at TIMESTAMP NULL,
 last_saved_at TIMESTAMP NULL,
 current_index INT DEFAULT 0,          -- for resume (flashcards/view)
 score INT DEFAULT 0,                  -- for quiz
 total_items INT DEFAULT 0
)
```

### 6.3.2 deck_session_items (optional but recommended)

Stores per-question interaction (viewed/answered) for accurate summaries.

```sql
deck_session_items(
 id PK,
 session_id UUID REFERENCES deck_sessions(id) ON DELETE CASCADE,
 deck_question_id UUID REFERENCES study_deck_questions(id) ON DELETE CASCADE,
 was_viewed BOOLEAN DEFAULT FALSE,
 selected_choice CHAR(1) NULL,
 is_correct BOOLEAN NULL,
 interacted_at TIMESTAMP NOT NULL,
 UNIQUE(session_id, deck_question_id)
)
```

---

## 6.4 Mock Exams

### 6.4.1 exams

```sql
exams(
 id PK,
 title TEXT NOT NULL,
 description TEXT NULL,
 subject TEXT NULL,
 program_track TEXT NULL,
 time_limit_minutes INT NOT NULL,
 max_attempts INT NULL,                    -- NULL = unlimited
 cooldown_minutes INT DEFAULT 0,
 feedback_mode ENUM('IMMEDIATE','AFTER_SUBMIT') DEFAULT 'AFTER_SUBMIT',
 status ENUM('DRAFT','PUBLISHED','CLOSED') NOT NULL,
 schedule_start TIMESTAMP NULL,
 schedule_end TIMESTAMP NULL,
 created_by UUID REFERENCES users(id) NOT NULL,
 created_at TIMESTAMP NOT NULL,
 updated_at TIMESTAMP NOT NULL
)
```

### 6.4.2 exam_sections

```sql
exam_sections(
 id PK,
 exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
 title TEXT NOT NULL,
 instructions TEXT NULL,
 order_no INT NOT NULL,
 section_time_minutes INT NULL,
 created_at TIMESTAMP NOT NULL,
 updated_at TIMESTAMP NOT NULL,
 UNIQUE(exam_id, order_no)
)
```

### 6.4.3 exam_questions

```sql
exam_questions(
 id PK,
 exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
 section_id UUID REFERENCES exam_sections(id) ON DELETE CASCADE,
 order_no INT NOT NULL,
 question_text TEXT NOT NULL,
 choice_a TEXT NOT NULL,
 choice_b TEXT NOT NULL,
 choice_c TEXT NOT NULL,
 choice_d TEXT NOT NULL,
 correct_choice CHAR(1) NOT NULL,
 rationalization TEXT NULL,
 points INT DEFAULT 1,
 UNIQUE(section_id, order_no)
)
```

### 6.4.4 exam_attempts (Autosave + Resume)

```sql
exam_attempts(
 id PK,
 exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
 user_id UUID REFERENCES users(id) ON DELETE CASCADE,
 attempt_no INT NOT NULL,
 status ENUM('IN_PROGRESS','SUBMITTED') NOT NULL DEFAULT 'IN_PROGRESS',
 started_at TIMESTAMP NOT NULL,
 submitted_at TIMESTAMP NULL,
 last_saved_at TIMESTAMP NULL,
 remaining_seconds INT NULL,
 submission_type ENUM('MANUAL','AUTO') NOT NULL,
 time_spent_seconds INT NOT NULL DEFAULT 0,
 score INT NOT NULL DEFAULT 0,
 percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
 UNIQUE(exam_id,user_id,attempt_no)
)
```

### 6.4.5 attempt_answers

```sql
attempt_answers(
 id PK,
 attempt_id UUID REFERENCES exam_attempts(id) ON DELETE CASCADE,
 question_id UUID REFERENCES exam_questions(id) ON DELETE CASCADE,
 selected_choice CHAR(1) NOT NULL,
 is_correct BOOLEAN NOT NULL,
 answered_at TIMESTAMP NULL,
 UNIQUE(attempt_id,question_id)
)
```

---

## 6.5 Conferences

```sql
conferences(
 id PK,
 title TEXT NOT NULL,
 description TEXT NULL,
 start_at TIMESTAMP NOT NULL,
 end_at TIMESTAMP NOT NULL,
 meeting_link TEXT NOT NULL,
 host_id UUID REFERENCES users(id) NOT NULL,
 program_track TEXT NULL,
 created_at TIMESTAMP NOT NULL,
 updated_at TIMESTAMP NOT NULL
)
```

---

## 6.6 Audit Logs

Admin-only audit logs; reviewers receive a limited “content activity feed”.

```sql
audit_logs(
 id PK,
 actor_id UUID REFERENCES users(id) NOT NULL,
 actor_role ENUM('ADMIN','REVIEWER','REVIEWEE') NOT NULL,
 action ENUM('CREATE','UPDATE','DELETE','APPROVE','REJECT','ROLE_CHANGE','LOGIN') NOT NULL,
 entity_type TEXT NOT NULL,     -- e.g., "study_deck", "exam", "conference"
 entity_id UUID NULL,
 summary TEXT NULL,
 metadata JSONB NULL,
 created_at TIMESTAMP NOT NULL
)
```

---

## 6.7 Notifications

```sql
notifications(
 id PK,
 recipient_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
 type TEXT NOT NULL,                 -- e.g., "EXAM_PUBLISHED"
 title TEXT NOT NULL,
 message TEXT NOT NULL,
 link TEXT NULL,                     -- e.g., "/exams/{id}"
 entity_type TEXT NULL,
 entity_id UUID NULL,
 severity TEXT DEFAULT 'INFO',
 is_read BOOLEAN DEFAULT FALSE,
 read_at TIMESTAMP NULL,
 created_at TIMESTAMP NOT NULL DEFAULT NOW()
)
```

Recommended indexes:

* (recipient_user_id, created_at DESC)
* (recipient_user_id, is_read)

---

# 7. Functional Requirements

## 7.1 Study Page and Deck Modes (UPDATED)

REQ-DECK-001
The Study page SHALL list published study decks accessible to the user (filtered by program_track when applicable).

REQ-DECK-002 (View Mode)
Users SHALL be able to open a deck and view all questions with their answers and rationalizations.

REQ-DECK-003 (Flashcard Mode)
Users SHALL be able to start a flashcard session where:

* the question appears on the front
* the answer appears on the back with rationalization

REQ-DECK-004 (Flashcard Completion)
Users SHALL be able to:

* end the flashcard session anytime OR
* finish the entire deck

REQ-DECK-005 (Flashcard Summary)
When a flashcard session ends or completes, the system SHALL display a summary of the questions and answers with rationalizations that were viewed during the session.

REQ-DECK-006 (Quiz Mode)
Users SHALL be able to start a quiz session from a deck where:

* one question is shown at a time
* answers are displayed as selectable cards (Kahoot-style)
* the system records correct/incorrect responses

REQ-DECK-007 (Quiz Results + Summary)
At the end of quiz mode, the system SHALL display:

* the final score
* a summary list of questions, correct answers, and rationalizations
* which items the user got correct and wrong

REQ-DECK-008 (Deck Session Persistence)
Deck sessions SHALL be saved so progress is not lost if the user exits or disconnects.

REQ-DECK-009 (Deck Resume)
If a session is IN_PROGRESS, the system SHALL allow the user to resume where they left off.

---

## 7.2 Mock Exams (Sections + Attempts + Autosave)

REQ-EXAM-001 Exams SHALL support 1..N sections.
REQ-EXAM-002 Each section SHALL support 1..N questions.
REQ-EXAM-003 Exams SHALL allow multiple attempts per reviewee.
REQ-EXAM-004 Exams SHALL enforce max_attempts and cooldown_minutes when configured.
REQ-EXAM-005 Exams SHALL display a countdown timer.
REQ-EXAM-006 Exam progress SHALL autosave and resume after disconnect/exit.
REQ-EXAM-007 Exams SHALL auto-submit when time expires.
REQ-EXAM-008 System SHALL compute score/percentage and store attempt answers.
REQ-EXAM-009 System SHALL display rationalizations based on feedback_mode.

---

## 7.3 Conferences

REQ-CONF-001 REVIEWER/ADMIN SHALL schedule conferences.
REQ-CONF-002 REVIEWEE SHALL join conferences via meeting link.
REQ-CONF-003 Dashboard SHALL display upcoming conferences.

---

## 7.4 Profiles and Visibility

REQ-PROF-001 REVIEWER/ADMIN SHALL view student profiles and performance history.
REQ-PROF-002 REVIEWER SHALL view other reviewers’ profiles (read-only).
REQ-PROF-003 REVIEWEE SHALL view only their own profile.

---

## 7.5 Reports (Admin)

REQ-REPORT-001 ADMIN SHALL generate reports by exam and program_track.
REQ-REPORT-002 Reports SHALL include attempt counts, average score, highest/lowest score, and pass rate.
REQ-REPORT-003 Reports SHALL export to CSV and PDF.

---

## 7.6 Audit Logs and Activity Feed

REQ-AUDIT-001 The system SHALL log create/update/delete actions for content and key admin actions.
REQ-AUDIT-002 Only ADMIN SHALL view full audit logs.
REQ-AUDIT-003 REVIEWER SHALL view a filtered content activity feed (new/updated decks, exams, conferences + creator).

---

## 7.7 Notifications

REQ-NOTIF-001 The system SHALL generate notifications for key events:

* registration approved/rejected
* deck published
* exam published
* conference scheduled/updated/cancelled
* exam auto-submitted

REQ-NOTIF-002 Users SHALL view notifications, see unread count, and mark notifications as read.
REQ-NOTIF-003 Only the notification recipient SHALL access their notifications.

---

# 8. Non-Functional Requirements

REQ-NF-001 The UI SHALL be mobile responsive.
REQ-NF-002 RBAC and ownership rules SHALL be enforced on all API endpoints.
REQ-NF-003 Exam and deck progress SHALL autosave to prevent data loss.
REQ-NF-004 Common dashboard actions SHOULD load within 3 seconds under normal conditions.

---

# 9. Acceptance Criteria

System is complete when:

* [non-@cnu.edu.ph](mailto:non-@cnu.edu.ph) emails cannot self-register
* ADMIN can create external-email accounts
* REVIEWER can CRUD only their own decks/exams and view others read-only
* mock exams support sections, attempts, autosave, and resume
* study decks support view mode, flashcards, and quiz mode with summaries
* conferences are schedulable and joinable
* admin can generate reports (CSV/PDF)
* audit logs are recorded and admin-viewable
* notifications are delivered and readable

---