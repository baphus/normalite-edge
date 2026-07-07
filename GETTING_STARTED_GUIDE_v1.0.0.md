# Normalite EDGE — Getting Started Guide

**Version:** 1.0.0
**Date:** 2026-07-07
**Prepared by:** Joseph Sarsonas (independent developer)

## Changelog
- v1.0.0 (2026-07-07): Initial getting started guide.

---

## Who this is for

New students (Reviewees) signing up for the first time, and Admins responsible for approving new accounts. See [PROJECT_SUMMARY_v1.1.0.md](PROJECT_SUMMARY_v1.1.0.md) for the full feature list, including why account verification is currently a manual step.

---

## For students (Reviewees)

### Step 1 — Register your details

1. Go to the Normalite EDGE registration page.
2. Fill in your details: full name, **official school email address**, password, campus, program/track, year level, and section.
3. Submit the form.

> **Important:** Registration only accepts your official school email address. Personal email addresses (Gmail, Yahoo, etc.) will be rejected — this is how the system confirms you're affiliated with the university.

After submitting, your account is created with a **Pending** status. You cannot log in yet.

### Step 2 — Wait for admin verification

Because automated email confirmation isn't available yet (see Known Limitations in the project summary), your account isn't activated automatically. Instead:

1. An Admin reviews your registration in the User Management panel.
2. The Admin confirms your details are legitimate (correct school email, matching program/campus info).
3. The Admin approves your account, changing its status from **Pending** to **Active**.

There is currently no automatic email telling you when this happens — if you need to know your status urgently, contact your school's Normalite EDGE administrator directly (e.g., your reviewer/instructor or IT coordinator).

### Step 3 — Log in

Once your account is Active, log in with the email and password you registered with. If you registered with Google OAuth using your school Google account, use "Sign in with Google" instead.

### Step 4 — Start using the platform

Once logged in, you'll land on your dashboard, where you can:
- Browse and take assigned exams (**Exams**)
- Review your past results and performance (**Exam Results / Performance**)
- Study using flashcard decks (**Study Hub**)
- Check upcoming review sessions (**Calendar**)
- Update your profile and settings

---

## For Admins — approving new accounts

1. Log in with an Admin account.
2. Go to **User Management**.
3. Filter or search for accounts with **Pending** status.
4. Open each pending account and verify:
   - The email is a legitimate official school address.
   - Name, campus, program/track, and year level look correct.
5. Click **Approve** to activate the account, or **Reject/Disable** if the registration looks invalid.
6. The student will see an in-app notification the next time they log in — but since there's no email alert yet, consider announcing approval batches through your existing communication channel (e.g., class group chat) until email notifications are implemented.

---

## Troubleshooting

**"I registered but can't log in."**
Your account is likely still Pending. This is expected — an Admin needs to manually approve it first since email verification isn't wired up yet. Contact your Normalite EDGE administrator.

**"I used the wrong email domain."**
You'll need to register again with your official school email address; the system will reject non-school domains at registration.

**"I forgot my password."**
There is currently no self-service password reset feature in the system. Contact your Admin to have your password reset manually. This is another feature that would typically rely on email delivery once that's implemented.
