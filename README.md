#Campus 360 — Admin Web App

> Web-based admin dashboard for managing the Campus 360 ecosystem at NSBM Green University.

---

## Overview

The Campus 360 Admin Web App is the management interface that works alongside the [Campus 360 Mobile App](https://github.com/DewmithR/campus360-mobile.git). It gives university administrators the tools to manage study room availability, respond to student feedback, and oversee campus events — all in real time via a shared Firebase backend.

---

## Planned Features

| Module | Description | Status |
|---|---|---|
| **Admin Auth** | Secure admin-only login (separate from student accounts) | Planned |
| **Study Room Management** | Add, edit, remove rooms; view live occupancy | Planned |
| **Feedback Management** | View student feedback, post official replies | Planned |
| **Events Management** | Create and manage university events | Planned |
| **Dashboard Overview** | Stats on usage, active check-ins, pending feedback | Planned |

---

## Tech Stack

> Final stack to be confirmed by the team.

- **Framework**: React / Next.js *(or Flutter Web — TBD)*
- **Backend**: Firebase (shared Firestore database with the mobile app)
- **Auth**: Firebase Auth (admin role enforcement via Firestore rules or custom claims)

---

## Firebase Integration

Both this web app and the Campus 360 mobile app connect to the **same Firebase project**, meaning:

- Changes made here (e.g., updating a study room) reflect instantly in the mobile app
- Feedback replies posted here appear in real time on the student's mobile device
- Firestore Security Rules control which users (admin vs student) can read/write what

---

## Getting Started

> Setup instructions will be added once development begins.

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/campus360-admin.git
cd campus360-admin

# Install dependencies (once framework is set up)
npm install   # or flutter pub get

# Configure Firebase
# Add your firebase config credentials locally (do not commit)

# Run the dev server
npm run dev   # or flutter run -d chrome
```

---

## 🔗 Related Repositories

- [Campus 360 Mobile App](https://github.com/DewmithR/campus360-mobile.git) — Flutter app for NSBM students

---

## License

This project is developed as part of a university module at NSBM Green University. All rights reserved by the development team.
