# browser-game-backend

Node.js + TypeScript backend for the location-based resource gathering game.

## Stack
- Express.js (REST API)
- ws (WebSocket server)
- Prisma ORM
- PostgreSQL + PostGIS (geospatial queries)

## Setup

```bash
npm install
npx prisma generate
npx prisma migrate dev
```

## Run
```bash
npm run dev
```

## Endpoints
- `GET /resources?lat=&lng=&radius=` — resources near a coordinate
- WebSocket on `ws://localhost:4000` — real-time game events

## Environment
Copy `.env.example` to `.env` and fill in your Postgres connection string.
