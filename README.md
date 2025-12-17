# Mini Event Platform (MERN)

Full-stack app where users can create events, upload images, and RSVP with strict capacity enforcement and race-condition-safe joins.

## Tech
- MongoDB + Mongoose
- Express + Node
- React (Vite) + Axios
- JWT auth, Multer uploads

## Setup
1) Backend
```
cd server
cp env.example .env  # or create manually
# env values:
# MONGO_URI=<your uri>
# JWT_SECRET=<strong secret>
# CLIENT_URL=http://localhost:5173
npm install
npm run dev
```

2) Frontend
```
cd client
echo "VITE_API_URL=http://localhost:4000" > .env.local
npm install
npm run dev
```

Open the client URL from Vite output (usually http://localhost:5173).

## RSVP Capacity & Concurrency Strategy
- RSVP endpoint uses a single atomic `findOneAndUpdate` filter:
  - Requires `attendees` **not** already containing the user.
  - Requires `attendees` array size `< capacity` via `$expr`.
  - Update pushes the user in the same DB round-trip, so simultaneous last-slot attempts cannot overbook.
- If the update returns `null`, we check whether the event is full or already joined and respond with 409.
- Mongo handles the atomic predicate+update ensuring race-safe capacity enforcement without app-level locks.

## API (key routes)
- `POST /api/auth/signup|login`
- `GET /api/events` (upcoming)
- `POST /api/events` (auth, multipart, creator-only)
- `PUT /api/events/:id` / `DELETE /api/events/:id` (creator-only)
- `POST /api/events/:id/rsvp` join (capacity-checked)
- `POST /api/events/:id/unrsvp` leave
- `GET /api/events/mine/created|attending` (dashboard helpers)

## Deployment Notes
- Backend: Render/Railway with `PORT` and env vars above; enable persistent disk for `/uploads` or swap to S3.
- Frontend: Vercel/Netlify with `VITE_API_URL` set to your backend URL.
- DB: MongoDB Atlas (URI already provided in prompt can be placed in backend env).

## Features
- JWT auth (signup/login)
- Create/read/update/delete events with image upload
- Capacity-aware, duplicate-safe RSVP with concurrency protection
- Responsive grid UI, search/filter, dashboard filters for created/attending

