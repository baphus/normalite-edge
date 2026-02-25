## **Normalite EDGE – Everyday Digital Guide to Excellence**

**Capstone Project – Team Datababes**
Cebu Technological University – Main

---

# 1. Project Overview

Normalite EDGE is a web-based review management system designed for LET review centers.
The platform helps instructors manage study materials, create mock exams, host live sessions, and track student performance in one organized system.

The system will be built using the **MERN Stack**:

* MongoDB – Database
* Express.js – Backend framework
* React – Frontend interface
* Node.js – Server environment

The system supports three user roles:

* **Admin**
* **Reviewer**
* **Reviewee**

Each role has different permissions to keep the system secure and organized.

---

# 2. Project Goals

The system aims to:

* Help LET students study more effectively
* Provide timed mock exams with explanations
* Allow instructors to monitor student progress
* Organize study materials in one place
* Control user registration for security

---

# 3. Target Users

The system is intended for:

* LET Review Centers
* Review Instructors
* LET Review Students
* Non-education graduates taking the LET

---

# 4. User Roles

## 4.1 Admin

Admins manage the entire system.

They can:

* Approve or reject registrations
* Add, edit, or remove users
* Assign roles
* View all dashboards and reports
* Manage all study materials and exams
* Monitor student performance
* Manage live session schedules

---

## 4.2 Reviewer

Reviewers are instructors.

They can:

* Create, edit, and delete study materials
* Create, edit, schedule, and manage mock exams
* Add explanations (rationalizations) to questions
* View student scores and analytics
* Schedule and host live sessions

They cannot manage system users.

---

## 4.3 Reviewee

Reviewees are student users.

They can:

* Access study materials
* Take timed mock exams
* Receive real-time feedback
* View explanations after answering
* Join live sessions
* View their own scores and progress

They cannot create content or view other students’ results.

---

# 5. Programs and Majors

The system supports LET-related education programs so materials and exams can be filtered correctly.

## Bachelor Programs

* Bachelor of Physical Education
* Bachelor of Culture & Arts Education
* Bachelor of Technology and Livelihood Education

  * Major: Home Economics
* Bachelor of Elementary Education
* Bachelor of Early Childhood Education
* Bachelor of Special Needs Education

### Bachelor of Secondary Education Majors

* Mathematics
* Science
* English
* Filipino
* Social Studies
* Values Education

## Other Program

* Diploma in Professional Education

These programs will be used to:

* Filter study materials
* Filter mock exams
* Track performance by major
* Personalize dashboards

---

# 6. Functional Requirements

## 6.1 User Registration and Login

* Users can register as Reviewer or Reviewee.
* Admin approval is required before account activation.
* Users log in using email and password.
* Password reset is available.
* Role-based access is enforced on every page.

---

## 6.2 Study Materials

Reviewers and Admins can:

* Upload notes, PDFs, or links
* Edit or delete materials
* Categorize materials by subject or program

Reviewees can:

* View and download available materials
* Search by subject or topic

---

## 6.3 Mock Exams

Reviewers and Admins can:

* Create mock exams
* Add multiple-choice questions
* Add explanations for answers
* Set exam timer
* Schedule exam availability

Each exam includes:

* Title
* Subject
* Time limit
* Questions and choices
* Correct answer
* Explanation

---

## 6.4 Exam Experience

Students can:

* Take exams with a countdown timer
* Submit answers
* See feedback after answering
* Read explanations

The system will:

* Auto-submit when time ends
* Save exam attempts
* Calculate scores automatically

---

## 6.5 Performance Monitoring

Reviewees can see:

* Recent scores
* Average performance
* Progress over time

Reviewers and Admins can:

* View student results
* Compare performance by subject or program
* Identify students needing help

---

## 6.6 Live Sessions

Reviewers and Admins can:

* Schedule live review sessions
* Add meeting links (Google Meet or Zoom)

Students can:

* View upcoming sessions
* Join sessions from the dashboard

---

## 6.7 Dashboard

Each role has a different dashboard.

Admin dashboard shows:

* Total users
* Pending registrations
* System activity
* Performance summary

Reviewer dashboard shows:

* Exams created
* Student progress overview
* Upcoming sessions

Reviewee dashboard shows:

* Available materials
* Upcoming exams
* Upcoming live sessions
* Personal progress

---

# 7. Non-Functional Requirements

The system must be:

* Easy to use
* Mobile-friendly
* Secure
* Fast to load
* Reliable
* Able to store data safely

Security includes password hashing, secure login, and role-based access control.

---

# 8. Technical Requirements (MERN)

Frontend:

* React with responsive design
* Protected routes based on role

Backend:

* Node.js and Express API
* Authentication middleware
* File upload support

Database:

* MongoDB collections for users, materials, exams, attempts, and live sessions

Example user fields:

program
major
role
status

---

# 9. Acceptance Criteria

The system is complete when:

* Admin can manage users
* Reviewer can manage materials and exams
* Reviewee can take exams
* Timer works correctly
* Feedback and explanations appear
* Live sessions are accessible
* Program filtering works

---

# 10. Assumptions

* The system is used by one review center.
* Video meetings are link-based.
* Exams are mainly multiple-choice.

---

# 11. Future Improvements

Possible future features include:

* Leaderboards
* Flashcards
* AI study recommendations
* Mobile app version

---

# 12. Glossary

RBAC – Role-Based Access Control
CRUD – Create, Read, Update, Delete
LET – Licensure Examination for Teachers

---