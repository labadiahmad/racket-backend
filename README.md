# Racket Backend API

Backend REST API for the **Racket Padel Booking System**.  
Built with **Node.js**, **Express**, **PostgreSQL**, and **Multer** for image uploads.

This API handles clubs, courts, reservations, reviews, facilities, and file uploads with role-based access control.

---

## Features

- Header-based user authentication
- Clubs & courts management
- Court time slots
- Reservations with relation validation
- Reviews with image support
- Club facilities management
- Image uploads (avatars, clubs, courts, reviews)
- Role-based access (user / owner / admin)

---

## Tech Stack

- Node.js
- Express
- PostgreSQL
- Multer (file uploads)
- Nodemon
- Morgan
- CORS

---

## Project Structure

```txt
racket-backend/
│
├── src/
│   ├── server.js
│   ├── db.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── clubs.js
│   │   ├── club-images.js
│   │   ├── club-facilities.js
│   │   ├── courts.js
│   │   ├── court-images.js
│   │   ├── slots.js
│   │   ├── reservations.js
│   │   ├── reviews.js
│   │   ├── review-images.js
│   │   └── upload.js
│   │
│   └── middleware/
│       ├── userAuth.js
│       └── ownerAuth.js
│
├── uploads/
│   ├── avatars/
│   ├── clubs/
│   ├── courts/
│   └── reviews/
│
├── schema.sql
├── package.json
└── README.md
```

---

## 🔐 Authentication

This project uses **simple header-based authentication** (for learning purposes).

### Required Headers

x-user-id: <USER_ID>
x-role: user | owner | admin

---

### Middleware
- `userAuth` → normal users
- `ownerAuth` → club owners

---

## 🌍 Environment Variables

Create a `.env` file in the root directory:
PORT=5050
DATABASE_URL=postgresql://racket_admin:123@localhost:5432/racketdb

---

## 🗄️ Database Setup

Create the database and load the schema:
createdb racketdb
psql -d racketdb -f schema.sql

---

## ▶️ Install & Run

- npm install
- npm run dev

Expected output:
- ✅ Database connected
- ✅ Server running on http://localhost:5050

---

---

## 📂 Static Uploads

Uploaded files are served publicly from: http://localhost:5050/uploads/*

---
### Folders Used

- `/uploads/avatars` → user profile images  
- `/uploads/clubs` → club cover images  
- `/uploads/courts` → court cover images  
- `/uploads/reviews` → review images  

---

## 📤 Upload API

Generic image upload endpoint used by clubs, courts, reviews, and users.

### Upload Image
POST /api/upload?folder=clubs|courts|reviews|avatars

### Request Type
`multipart/form-data`

### Form Data
file:

### Allowed File Types
- JPG
- PNG
- WEBP

### Max File Size
- 5 MB

### Example Response

```json
{
  "url": "/uploads/clubs/1700000000.jpg"
}

