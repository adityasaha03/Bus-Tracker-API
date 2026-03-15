# Bus Tracker API

Real-time bus location tracking API built with Bun, PostgreSQL (PostGIS), and Redis.

## Stack

- Runtime: Bun
- Language: TypeScript
- Database: PostgreSQL + PostGIS (Neon)
- Cache: Redis (Upstash)
- Auth: JWT

## Setup

### Prerequisites
- Bun installed
- Neon account (PostgreSQL)
- Upstash account (Redis)

### Installation

1. Clone the repo
   git clone <repo-url>
   cd bus-tracker-server

2. Install dependencies
   bun install

3. Create .env file in project root
   Copy all variables from .env.example and fill in your values

4. Run database migration
   bunx prisma migrate dev

5. Start the server
   bun src/server.ts

## Environment Variables

| Variable | Description |
|---|---|
| PORT | HTTP port, default 3000 |
| DATABASE_URL | Neon PostgreSQL connection string |
| REDIS_URL | Upstash Redis connection string |
| NODE_ENV | development, test, or production |
| CORS_ORIGIN | Frontend origin e.g. http://localhost:5173 |
| JWT_SECRET | Long random string for signing tokens |
| JWT_EXPIRES_IN | Token expiry e.g. 7d or 24h |
| API_KEY_PREFIX | Prefix for device API keys e.g. wbx_sk |
| BUS_ID_PREFIX | Prefix for bus IDs e.g. wbx_bus |
| USER_ID_PREFIX | Prefix for user IDs e.g. wbx_user |
| REGISTRATION_LIMIT_WINDOW_MS | Rate limit window for registration in ms |
| REGISTRATION_LIMIT_MAX | Max registration attempts per window |
| INGEST_LIMIT_WINDOW_MS | Rate limit window for GPS ingestion in ms |
| INGEST_LIMIT_MAX | Max ingestion attempts per window |
| REDIS_LATEST_TTL_SECONDS | TTL for Redis position keys |

## API Routes

### Public routes (no auth required)
- GET /api/health
- POST /api/users/register
- POST /api/users/login

### JWT protected routes (any role)
- GET /api/buses/map
- GET /api/buses/:id/position
- GET /api/buses/:id
- GET /api/buses/:id/readings

### Super admin only
- POST /api/buses/register
- POST /api/coordinators/assign

### Device auth (x-device-id + x-api-key headers)
- POST /api/readings

## Example Requests

### Register a user
POST /api/users/register
Content-Type: application/json

{
  "name": "Test Admin",
  "austId": "21-12345-1",
  "email": "admin@test.com",
  "password": "password123",
  "phone": "01712345678",
  "role": "SUPER_ADMIN"
}

### Login
POST /api/users/login
Content-Type: application/json

{
  "email": "admin@test.com",
  "password": "password123"
}

### Register a bus (super admin only)
POST /api/buses/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "busName": "Bus 01",
  "licensePlate": "DHAKA-1234",
  "routeLabel": "Route 1 - Campus to Motijheel"
}

### Assign coordinator to bus (super admin only)
POST /api/coordinators/assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "coordinatorUserId": "wbx_user_...",
  "busId": "wbx_bus_..."
}

### Submit GPS reading (bus device only)
POST /api/readings
x-device-id: wbx_bus_...
x-api-key: wbx_sk_...
Content-Type: application/json

{
  "longitude": 90.4066,
  "latitude": 23.7639,
  "recordedAt": "2026-03-15T08:30:00.000Z"
}

## Device Credentials

When a bus is registered via POST /api/buses/register the response includes a plain
API key. This key is shown exactly once and never again — store it immediately and
flash it onto the physical bus device firmware using the x-device-id and x-api-key
headers on every GPS reading submission.

## Notes

- Never expose passwordHash or apiKeyHash in any response
- Redis write failures are logged but do not fail GPS ingestion
- MongoDB history queries use the compound index on busId + recordedAt
- All buses are company owned — no per user ownership
