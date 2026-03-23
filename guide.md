# Bus Tracker API — Backend Developer Guide

> **Version:** 2.0 (Planning Edition)  
> **Stack:** Bun · TypeScript · Prisma · PostgreSQL · Redis  
> **Base URL:** `http://localhost:3000/api`  
> **Last updated:** 2026-03-23

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication](#authentication)
3. [Email & ID Rules](#email--id-rules)
4. [Role System](#role-system)
5. [Data Models (Planned Schema)](#data-models-planned-schema)
6. [Route Reference](#route-reference)
   - [Public / Health](#public--health)
   - [Auth Routes](#auth-routes)
   - [User Routes (Self)](#user-routes-self)
   - [Admin Routes](#admin-routes)
   - [Coordinator Routes](#coordinator-routes)
   - [Route & Stop Management](#route--stop-management)
   - [Trip / Session Management](#trip--session-management)
   - [Bus Routes (General)](#bus-routes-general)
   - [GPS Reading Routes (Device)](#gps-reading-routes-device)
   - [Notification Routes](#notification-routes)
   - [Stoppage Requisition Routes](#stoppage-requisition-routes)
   - [Lost & Found Routes](#lost--found-routes)
7. [Standard Response Shape](#standard-response-shape)
8. [Error Codes](#error-codes)
9. [Headers Reference](#headers-reference)

---

## Architecture Overview

```
Client / Mobile App
        │
        ▼
  Bun HTTP Server  (src/server.ts)
        │
  Request Router   (src/app.ts)
        │
   Handlers        (src/handlers/)
        │
   ─────┬──────────┬──────────
        │          │
     Prisma     Redis Cache
  (PostgreSQL)   (optional)
```

- **No external map/geocoding API calls** — latitude/longitude are stored raw; address strings are **not** derived.
- Authentication is **JWT-based** (Bearer token in `Authorization` header).
- Device GPS trackers authenticate via **`x-api-key`** header.
- Rate limiting is applied on auth endpoints per IP.

---

## Authentication

### JWT Token

All protected routes require the header:

```
Authorization: Bearer <jwt_token>
```

The JWT payload contains:

```json
{
  "userId": "wbx_usr_xxxx",
  "role": "GENERAL | COORDINATOR | SUPER_ADMIN",
  "iat": 1700000000,
  "exp": 1700086400
}
```

### Device API Key

GPS tracker devices send their own credential:

```
x-api-key: <bus_api_key>
```

---

## Email & ID Rules

Every AUST student/staff email follows the pattern:

```
<name>.<department>.<studentId>@aust.edu
```

**Example:** `ahad.cse.00724205101038@aust.edu`

| Field        | Extracted Value      |
|--------------|----------------------|
| `department` | `cse`                |
| `studentId`  | `00724205101038`     |

### Parsing Logic

```typescript
// Validation regex
const AUST_EMAIL_REGEX = /^[a-z]+\.([a-z]+)\.(\d+)@aust\.edu$/i;

function parseAustEmail(email: string) {
  const match = email.toLowerCase().match(AUST_EMAIL_REGEX);
  if (!match) throw new Error('Invalid AUST email format');
  return {
    department: match[1],   // e.g. "cse"
    studentId: match[2],    // e.g. "00724205101038"
  };
}
```

- Registration must reject any email that does **not** end with `@aust.edu`.
- `department` and `studentId` are auto-extracted; the client must **not** send them manually.
- `austId` field in the DB stores the extracted `studentId`.

---

## Role System

| Role          | Constant in DB  | Access Level                            |
|---------------|-----------------|-----------------------------------------|
| Basic User    | `GENERAL`       | Own profile, routes, requisitions       |
| Coordinator   | `COORDINATOR`   | Their assigned buses + basic user mgmt  |
| Admin         | `SUPER_ADMIN`   | Full system access                      |

Middleware guard pseudo-code:

```typescript
requireRole('SUPER_ADMIN')   // only super admin
requireRole('COORDINATOR')   // coordinator OR super admin
requireRole('GENERAL')       // any authenticated user
```

---

## Data Models (Planned Schema)

> These are the **new/expanded** models to be added to `schema.prisma`. Existing models (User, Bus, CoordinatorBus, Reading) remain as base.

### User (extended fields)
```prisma
model User {
  // ...existing fields...
  department      String          // extracted from email
  // primary route preference
  primaryRoute    Route?          @relation("UserPrimaryRoute", fields: [primaryRouteId], references: [id])
  primaryRouteId  String?
  secondaryRoutes UserSecondaryRoute[]
  primaryStoppage BusStop?        @relation("UserPrimaryStop", fields: [primaryStoppageId], references: [id])
  primaryStoppageId String?
  requisitions    StoppageRequisition[]
}
```

### Route
```prisma
model Route {
  id          String    @id @default(cuid())
  routeId     String    @unique
  name        String
  description String?
  stops       BusStop[]
  trips       Trip[]
  primaryUsers User[]   @relation("UserPrimaryRoute")
  secondaryUsers UserSecondaryRoute[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

### BusStop
```prisma
model BusStop {
  id          String   @id @default(cuid())
  routeId     String
  route       Route    @relation(fields: [routeId], references: [id])
  name        String
  latitude    Float
  longitude   Float
  order       Int      // sequence on the route
  primaryUsers User[]  @relation("UserPrimaryStop")
  requisitions StoppageRequisition[]
  createdAt   DateTime @default(now())
}
```

### UserSecondaryRoute
```prisma
model UserSecondaryRoute {
  id       String @id @default(cuid())
  userId   String
  routeId  String
  user     User   @relation(fields: [userId], references: [id])
  route    Route  @relation(fields: [routeId], references: [id])
  @@unique([userId, routeId])
}
```

### Trip
```prisma
model Trip {
  id          String     @id @default(cuid())
  tripId      String     @unique
  routeId     String
  busId       String
  route       Route      @relation(fields: [routeId], references: [id])
  bus         Bus        @relation(fields: [busId], references: [id])
  scheduledAt DateTime
  startedAt   DateTime?
  endedAt     DateTime?
  status      TripStatus @default(SCHEDULED)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

enum TripStatus {
  SCHEDULED
  ACTIVE
  COMPLETED
  CANCELLED
}
```

### Announcement
```prisma
model Announcement {
  id        String   @id @default(cuid())
  routeId   String
  route     Route    @relation(fields: [routeId], references: [id])
  sentById  String
  sentBy    User     @relation(fields: [sentById], references: [id])
  message   String
  createdAt DateTime @default(now())
}
```

### StoppageRequisition
```prisma
model StoppageRequisition {
  id          String             @id @default(cuid())
  userId      String
  routeId     String
  stopId      String
  user        User               @relation(fields: [userId], references: [id])
  stop        BusStop            @relation(fields: [stopId], references: [id])
  message     String?
  date        DateTime           // which day
  status      RequisitionStatus  @default(PENDING)
  createdAt   DateTime           @default(now())
}

enum RequisitionStatus {
  PENDING
  APPROVED
  REJECTED
}
```

### LostItem
```prisma
model LostItem {
  id          String         @id @default(cuid())
  busId       String
  bus         Bus            @relation(fields: [busId], references: [id])
  reportedById String
  reportedBy  User           @relation(fields: [reportedById], references: [id])
  description String
  imageUrl    String?
  status      LostItemStatus @default(UNCLAIMED)
  claims      LostItemClaim[]
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
}

enum LostItemStatus {
  UNCLAIMED
  CLAIMED
  RETURNED
}
```

### LostItemClaim
```prisma
model LostItemClaim {
  id         String   @id @default(cuid())
  itemId     String
  item       LostItem @relation(fields: [itemId], references: [id])
  claimedById String
  claimedBy  User     @relation(fields: [claimedById], references: [id])
  message    String?
  createdAt  DateTime @default(now())
}
```

---

## Route Reference

### Legend

| Symbol | Meaning                      |
|--------|------------------------------|
| 🔓     | Public (no auth required)    |
| 🔑     | JWT required (any role)      |
| 🟡     | JWT + COORDINATOR or SUPER_ADMIN |
| 🔴     | JWT + SUPER_ADMIN only       |
| 📡     | Device API key (`x-api-key`) |

---

### Public / Health

#### `GET /api/health` 🔓
**Handler:** `health.ts`  
Returns server status.

**Response:**
```json
{
  "success": true,
  "message": "OK",
  "data": { "uptime": 1234.5 }
}
```

---

### Auth Routes

#### `POST /api/users/register` 🔓
**Handler:** `registerUser.ts`  
Registers a new user. Email **must** end with `@aust.edu`. `department` and `studentId` are auto-extracted from the email; the client does **not** send them.

> **📧 Email OTP Verification Required**  
> Upon successful registration the account is created with `emailVerified: false`. A **6-digit OTP** is immediately sent to the provided AUST email. **No JWT is issued** at this step. The client must redirect the user to an OTP entry screen and call `POST /api/auth/verify-email` to complete verification and receive a token.

**Request Body:**
```json
{
  "name": "Ahad",
  "email": "ahad.cse.00724205101038@aust.edu",
  "password": "Secret@123",
  "phone": "01712345678"
}
```
> ⚠️ `role` is no longer accepted from the client — all self-registered users receive `GENERAL`. Coordinators are assigned by the admin.

**Validation Rules:**
- `email` must match `/^[a-z]+\.[a-z]+\.\d+@aust\.edu$/i`
- `password` min 8 chars
- `phone` must be a valid BD number

**Response `201`:**
```json
{
  "success": true,
  "message": "Registration successful. Please check your AUST email for the OTP.",
  "data": {
    "userId": "wbx_usr_xxxx",
    "email": "ahad.cse.00724205101038@aust.edu",
    "emailVerified": false
  }
}
```

---

#### `POST /api/users/login` 🔓
**Handler:** `authUser.ts`  
Authenticates a user and returns a JWT. **Blocks login** if the account's email has not been verified yet — returns `403` with `"emailVerified": false` so the client can redirect to OTP entry.

**Request Body:**
```json
{
  "email": "ahad.cse.00724205101038@aust.edu",
  "password": "Secret@123"
}
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "userId": "wbx_usr_xxxx",
    "name": "Ahad",
    "role": "GENERAL",
    "token": "<jwt>"
  }
}
```

**Response `403` (unverified email):**
```json
{
  "success": false,
  "message": "Email not verified. Please verify your email before logging in.",
  "data": { "emailVerified": false, "userId": "wbx_usr_xxxx" }
}
```

---

#### `POST /api/auth/verify-email` 🔓
**Handler:** `verifyEmail.ts`  
Verifies the user's AUST email by checking the 6-digit OTP that was sent on registration (or via resend). On success, marks the account as verified and returns a JWT (same as a successful login).

**OTP rules:**
- 6 digits, numeric
- Expires after **10 minutes**
- Max **5 incorrect attempts** per OTP, then it is invalidated
- Stored as a hash in Redis keyed by `otp:<userId>`

**Request Body:**
```json
{
  "userId": "wbx_usr_xxxx",
  "otp": "482910"
}
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Email verified successfully.",
  "data": {
    "userId": "wbx_usr_xxxx",
    "name": "Ahad",
    "role": "GENERAL",
    "token": "<jwt>"
  }
}
```

**Error cases:**
- `400` — OTP missing or not 6 digits
- `401` — OTP incorrect (remaining attempts included in response)
- `410` — OTP expired or invalidated (prompt user to resend)
- `404` — userId not found

---

#### `POST /api/auth/resend-otp` 🔓
**Handler:** `resendOtp.ts`  
Resends a fresh OTP to the user's AUST email. Invalidates any existing OTP and starts a new 10-minute window. Rate-limited to **3 resends per 15 minutes** per user.

**Request Body:**
```json
{
  "userId": "wbx_usr_xxxx"
}
```

**Response `200`:**
```json
{
  "success": true,
  "message": "A new OTP has been sent to your email."
}
```

**Error cases:**
- `429` — resend rate limit exceeded
- `409` — account is already verified
- `404` — userId not found

---

#### `POST /api/auth/forgot-password` 🔓
**Handler:** `forgotPassword.ts`  
Sends a password-reset OTP to the user's AUST email. Same 10-minute TTL and 3-resend-per-15-min rate limit as the email verification OTP, but stored under a separate Redis key `pwd-otp:<userId>`.

**Request Body:**
```json
{
  "email": "ahad.cse.00724205101038@aust.edu"
}
```

**Response `200`** (always, to prevent email enumeration):
```json
{
  "success": true,
  "message": "If this email exists, a reset OTP has been sent."
}
```

---

#### `POST /api/auth/reset-password` 🔓
**Handler:** `resetPassword.ts`  
Verifies the password-reset OTP and sets a new password.

**Request Body:**
```json
{
  "userId": "wbx_usr_xxxx",
  "otp": "391042",
  "newPassword": "NewSecret@456"
}
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Password reset successful. You can now log in."
}
```

**Error cases:**
- `401` — OTP incorrect
- `410` — OTP expired
- `400` — `newPassword` too weak (min 8 chars)

---

### User Routes (Self)

#### `GET /api/users/me` 🔑
**Handler:** `getUserProfile.ts`  
Returns the authenticated user's profile.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "userId": "wbx_usr_xxxx",
    "name": "Ahad",
    "email": "ahad.cse.00724205101038@aust.edu",
    "department": "cse",
    "studentId": "00724205101038",
    "phone": "01712345678",
    "role": "GENERAL",
    "status": "ACTIVE",
    "primaryRoute": { "routeId": "...", "name": "..." },
    "primaryStoppage": { "id": "...", "name": "..." },
    "secondaryRoutes": []
  }
}
```

---

#### `PATCH /api/users/me` 🔑
**Handler:** `updateUserProfile.ts`  
Updates the authenticated user's own info (name, phone only).

**Request Body (all optional):**
```json
{
  "name": "Ahad Hossain",
  "phone": "01812345678"
}
```

**Response `200`:**
```json
{ "success": true, "message": "Profile updated", "data": { ...updatedUser } }
```

---

#### `PUT /api/users/me/primary-route` 🔑
**Handler:** `setUserPrimaryRoute.ts`  
Sets or changes the user's primary route. A user can have only **one** primary route.

**Request Body:**
```json
{ "routeId": "wbx_route_xxxx" }
```

**Response `200`:**
```json
{ "success": true, "message": "Primary route updated" }
```

---

#### `PUT /api/users/me/secondary-routes` 🔑
**Handler:** `setUserSecondaryRoutes.ts`  
Sets the user's secondary routes (max 2). Overwrites the existing list.

**Request Body:**
```json
{ "routeIds": ["wbx_route_yyyy", "wbx_route_zzzz"] }
```

**Validation:** max 2 items, must not include primary route.

**Response `200`:**
```json
{ "success": true, "message": "Secondary routes updated" }
```

---

#### `PUT /api/users/me/primary-stoppage` 🔑
**Handler:** `setUserPrimaryStoppage.ts`  
Sets or changes the user's saved primary stoppage on their primary route.

**Request Body:**
```json
{ "stopId": "wbx_stop_xxxx" }
```

**Response `200`:**
```json
{ "success": true, "message": "Primary stoppage updated" }
```

---

#### `GET /api/users/me/requisitions` 🔑
**Handler:** `getUserRequisitions.ts`  
Returns the authenticated user's stoppage requisition history.

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "stop": { "name": "Gate 2" },
      "date": "2026-03-24",
      "message": "Going home early",
      "status": "PENDING"
    }
  ]
}
```

---

### Admin Routes

#### `POST /api/admin/coordinators/assign` 🔴
**Handler:** `assignCoordinator.ts` *(exists)*  
Promote a `GENERAL` user to `COORDINATOR` and optionally assign them to a bus.

**Request Body:**
```json
{
  "userId": "wbx_usr_xxxx",
  "busId": "wbx_bus_xxxx"
}
```

**Response `200`:**
```json
{ "success": true, "message": "Coordinator assigned" }
```

---

#### `DELETE /api/admin/coordinators/:userId` 🔴
**Handler:** `removeCoordinator.ts`  
Demotes a coordinator back to `GENERAL` and removes their bus assignment.

**Response `200`:**
```json
{ "success": true, "message": "Coordinator removed" }
```

---

#### `GET /api/admin/users` 🔴
**Handler:** `listAllUsers.ts`  
Returns a paginated list of all users.

**Query Params:** `?page=1&limit=20&role=GENERAL&status=ACTIVE`

**Response `200`:**
```json
{
  "success": true,
  "data": { "users": [...], "total": 200, "page": 1, "limit": 20 }
}
```

---

#### `GET /api/admin/users/:userId` 🔴
**Handler:** `getAdminUserById.ts`  
Returns detailed info for any user.

**Response `200`:**
```json
{ "success": true, "data": { ...fullUserObject } }
```

---

#### `PATCH /api/admin/users/:userId` 🔴
**Handler:** `adminUpdateUser.ts`  
Admin edits any user's name, phone, or status.

**Request Body (all optional):**
```json
{
  "name": "Updated Name",
  "phone": "01900000000",
  "status": "BLOCKED"
}
```

**Response `200`:**
```json
{ "success": true, "message": "User updated", "data": { ...user } }
```

---

#### `POST /api/admin/buses/register` 🔴
**Handler:** `registerBus.ts` *(exists)*  
Registers a new bus and generates its API key.

> **⚠️ API Key Security Policy**  
> The raw API key is returned **only once** in this response and is **never stored in plaintext**. It is immediately hashed (bcrypt) and only the hash is persisted in the `Bus.apiKeyHash` column. If the key is lost, it must be regenerated via `POST /api/admin/buses/:busId/regenerate-api-key`. Super-admins can view/copy a bus's **current raw key exclusively through** `GET /api/admin/buses/:busId/api-key` — which keeps the plaintext key in a separate encrypted store (e.g. Redis with TTL or a dedicated secrets column) rather than re-deriving it from the hash.

**Request Body:**
```json
{
  "busName": "Bus 01",
  "licensePlate": "DHA-12-1234",
  "routeLabel": "Route A"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "busId": "wbx_bus_xxxx",
    "busName": "Bus 01",
    "apiKey": "wbx_key_xxxxxxxxxxxxxxxxxxxxxxxx",
    "note": "Store this key securely. It will not be shown again unless retrieved by a super-admin."
  }
}
```

---

#### `GET /api/admin/buses` 🔴
**Handler:** `adminListBuses.ts`  
Returns all registered buses with their current status.

**Response `200`:**
```json
{
  "success": true,
  "data": [{ "busId": "...", "busName": "...", "status": "ACTIVE", "lastSeenAt": "..." }]
}
```

---

#### `PATCH /api/admin/buses/:busId` 🔴
**Handler:** `adminUpdateBus.ts`  
Edit a bus's name, license plate, or status.

**Request Body (all optional):**
```json
{
  "busName": "Bus 01 Renamed",
  "licensePlate": "DHA-99-9999",
  "status": "BLOCKED"
}
```

**Response `200`:**
```json
{ "success": true, "message": "Bus updated" }
```

---

#### `DELETE /api/admin/buses/:busId` 🔴
**Handler:** `adminDeleteBus.ts`  
Soft or hard delete a bus record.

**Response `200`:**
```json
{ "success": true, "message": "Bus removed" }
```

---

#### `GET /api/admin/buses/:busId/api-key` 🔴
**Handler:** `getBusApiKey.ts`  
Returns the **current plaintext API key** for a specific bus. Accessible to `SUPER_ADMIN` only.

> The plaintext key is stored in an encrypted side-channel (e.g. a dedicated `apiKeyPlain` column encrypted at rest, or a Redis entry seeded at registration time). It is **never** derived from the bcrypt hash.

**Path Param:** `busId` — e.g. `wbx_bus_xxxx`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "busId": "wbx_bus_xxxx",
    "busName": "Bus 01",
    "apiKey": "wbx_key_xxxxxxxxxxxxxxxxxxxxxxxx"
  }
}
```

**Error cases:**
- `403` — caller is not `SUPER_ADMIN`
- `404` — bus not found

---

#### `POST /api/admin/buses/:busId/regenerate-api-key` 🔴
**Handler:** `regenerateBusApiKey.ts`  
Invalidates the current API key, generates a fresh one, updates `apiKeyHash`, refreshes the encrypted store, and returns the new raw key **once**. Use this when a key is lost or compromised.

**Response `200`:**
```json
{
  "success": true,
  "message": "API key regenerated",
  "data": {
    "busId": "wbx_bus_xxxx",
    "apiKey": "wbx_key_yyyyyyyyyyyyyyyyyyyyyyyy",
    "note": "Update the physical tracker device with this new key immediately."
  }
}
```

**Error cases:**
- `403` — caller is not `SUPER_ADMIN`
- `404` — bus not found

---

### Coordinator Routes

#### `GET /api/coordinator/users` 🟡
**Handler:** `coordinatorListUsers.ts`  
Returns the list of `GENERAL` users who have selected the coordinator's bus route as their **primary route**.

**Response `200`:**
```json
{
  "success": true,
  "data": [
    { "userId": "...", "name": "...", "studentId": "...", "primaryStoppage": "Gate 2" }
  ]
}
```

---

#### `DELETE /api/coordinator/users/:userId` 🟡
**Handler:** `coordinatorRemoveUser.ts`  
Removes a user from the primary user list of the coordinator's route (clears their primary route assignment for this route).

**Response `200`:**
```json
{ "success": true, "message": "User removed from primary list" }
```

---

#### `GET /api/coordinator/requisitions` 🟡
**Handler:** `coordinatorGetRequisitions.ts`  
Returns pending stoppage change requisitions for the coordinator's route.

**Query Params:** `?status=PENDING&date=2026-03-24`

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "user": { "name": "Ahad", "studentId": "..." },
      "currentStop": "Gate 1",
      "requestedStop": "Gate 2",
      "date": "2026-03-24",
      "message": "Need to leave early",
      "status": "PENDING"
    }
  ]
}
```

---

#### `PATCH /api/coordinator/requisitions/:id` 🟡
**Handler:** `coordinatorUpdateRequisition.ts`  
Approve or reject a stoppage requisition.

**Request Body:**
```json
{ "status": "APPROVED" }
```

**Response `200`:**
```json
{ "success": true, "message": "Requisition updated" }
```

---

#### `POST /api/coordinator/announcements` 🟡
**Handler:** `sendAnnouncement.ts`  
Sends a push notification + stores an announcement record for all primary users of the coordinator's route.

**Request Body:**
```json
{
  "routeId": "wbx_route_xxxx",
  "message": "Bus will be 15 minutes late today."
}
```

**Response `201`:**
```json
{ "success": true, "message": "Announcement sent", "data": { "id": "...", "sentAt": "..." } }
```

---

#### `GET /api/coordinator/announcements` 🟡
**Handler:** `getAnnouncements.ts`  
Returns past announcements for the coordinator's route.

**Query Params:** `?limit=20&page=1`

**Response `200`:**
```json
{
  "success": true,
  "data": [{ "id": "...", "message": "...", "createdAt": "..." }]
}
```

---

### Route & Stop Management

#### `POST /api/routes` 🟡
**Handler:** `createRoute.ts`  
Coordinator or admin creates a new named route.

**Request Body:**
```json
{
  "name": "Dhanmondi – AUST",
  "description": "Morning route via Panthapath"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": { "routeId": "wbx_route_xxxx", "name": "Dhanmondi – AUST" }
}
```

---

#### `GET /api/routes` 🔑
**Handler:** `listRoutes.ts`  
Returns all routes with their assigned buses and stop count.

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "routeId": "wbx_route_xxxx",
      "name": "Dhanmondi – AUST",
      "stopCount": 8,
      "assignedBus": { "busId": "...", "busName": "Bus 01" }
    }
  ]
}
```

---

#### `GET /api/routes/:routeId` 🔑
**Handler:** `getRouteById.ts`  
Returns full route details including ordered stops and the assigned bus.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "routeId": "...",
    "name": "...",
    "stops": [
      { "id": "...", "name": "Gate 1", "latitude": 23.76, "longitude": 90.38, "order": 1 }
    ],
    "assignedBus": { "busId": "...", "busName": "Bus 01" }
  }
}
```

---

#### `PATCH /api/routes/:routeId` 🟡
**Handler:** `updateRoute.ts`  
Edit route name or description.

**Request Body:**
```json
{ "name": "New Route Name", "description": "Updated description" }
```

**Response `200`:**
```json
{ "success": true, "message": "Route updated" }
```

---

#### `POST /api/routes/:routeId/stops` 🟡
**Handler:** `addStop.ts`  
Adds a bus stop to a route (plots a point on the map). The frontend sends lat/lng from the map interaction.

**Request Body:**
```json
{
  "name": "Panthapath Signal",
  "latitude": 23.7515,
  "longitude": 90.3775,
  "order": 3
}
```

**Response `201`:**
```json
{ "success": true, "data": { "id": "...", "name": "Panthapath Signal", "order": 3 } }
```

---

#### `PATCH /api/routes/:routeId/stops/:stopId` 🟡
**Handler:** `updateStop.ts`  
Edit a stop's name, coordinates, or order.

**Request Body (all optional):**
```json
{ "name": "Updated Stop Name", "latitude": 23.75, "longitude": 90.38, "order": 2 }
```

**Response `200`:**
```json
{ "success": true, "message": "Stop updated" }
```

---

#### `DELETE /api/routes/:routeId/stops/:stopId` 🟡
**Handler:** `deleteStop.ts`  
Removes a stop from a route.

**Response `200`:**
```json
{ "success": true, "message": "Stop removed" }
```

---

### Trip / Session Management

> A **Trip** (session) = **Route + Bus + Scheduled Time**. It tracks a single journey.

#### `POST /api/trips` 🟡
**Handler:** `createTrip.ts`  
Coordinator creates a new trip (links route, bus, and schedule time).

**Request Body:**
```json
{
  "routeId": "wbx_route_xxxx",
  "busId": "wbx_bus_xxxx",
  "scheduledAt": "2026-03-24T07:30:00.000Z"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": { "tripId": "wbx_trip_xxxx", "status": "SCHEDULED" }
}
```

---

#### `GET /api/trips` 🟡
**Handler:** `listTrips.ts`  
Returns trips for the coordinator's routes.

**Query Params:** `?routeId=...&status=SCHEDULED&date=2026-03-24`

**Response `200`:**
```json
{
  "success": true,
  "data": [
    { "tripId": "...", "route": "...", "bus": "...", "scheduledAt": "...", "status": "SCHEDULED" }
  ]
}
```

---

#### `PATCH /api/trips/:tripId` 🟡
**Handler:** `updateTrip.ts`  
Edit trip details (re-link bus, route, or time) or change status to `ACTIVE` / `COMPLETED` / `CANCELLED`.

**Request Body (all optional):**
```json
{
  "busId": "wbx_bus_yyyy",
  "scheduledAt": "2026-03-24T08:00:00.000Z",
  "status": "ACTIVE"
}
```

**Response `200`:**
```json
{ "success": true, "message": "Trip updated" }
```

---

#### `GET /api/trips/:tripId` 🔑
**Handler:** `getTripById.ts`  
Returns full trip details.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "tripId": "...",
    "route": { "routeId": "...", "name": "..." },
    "bus": { "busId": "...", "busName": "..." },
    "scheduledAt": "...",
    "startedAt": null,
    "endedAt": null,
    "status": "SCHEDULED"
  }
}
```

---

### Bus Routes (General)

#### `GET /api/buses/map` 🔑
**Handler:** `getMapLocation.ts` *(exists)*  
Returns the latest GPS position of all active buses for live map display.

**Response `200`:**
```json
{
  "success": true,
  "data": [
    { "busId": "wbx_bus_xxxx", "busName": "Bus 01", "latitude": 23.76, "longitude": 90.38, "recordedAt": "..." }
  ]
}
```

---

#### `GET /api/buses/:busId` 🔑
**Handler:** `getBusById.ts` *(exists)*  
Returns static info about a specific bus.

**Response `200`:**
```json
{
  "success": true,
  "data": { "busId": "...", "busName": "...", "licensePlate": "...", "status": "ACTIVE", "lastSeenAt": "..." }
}
```

---

#### `GET /api/buses/:busId/position` 🔑
**Handler:** `getLatestPosition.ts` *(exists)*  
Returns the most recent GPS reading for a specific bus.

**Response `200`:**
```json
{
  "success": true,
  "data": { "busId": "...", "latitude": 23.76, "longitude": 90.38, "recordedAt": "..." }
}
```

---

#### `GET /api/buses/:busId/readings` 🔑
**Handler:** `getReadings.ts` *(exists)*  
Returns paginated GPS history for a specific bus.

**Query Params:** `?limit=50&page=1`

**Response `200`:**
```json
{
  "success": true,
  "data": [{ "latitude": 23.76, "longitude": 90.38, "recordedAt": "..." }]
}
```

---

### GPS Reading Routes (Device)

#### `POST /api/readings` 📡
**Handler:** `createReading.ts` *(exists)*  
GPS tracker device sends its current position. Authenticated with `x-api-key`. **No address lookup is performed.**

**Headers:**
```
x-api-key: <bus_api_key>
```

**Request Body:**
```json
{
  "latitude": 23.7632,
  "longitude": 90.3889,
  "recordedAt": "2026-03-23T12:00:00.000Z"
}
```

**Response `201`:**
```json
{ "success": true, "message": "Reading recorded" }
```

---

### Notification Routes

#### `POST /api/users/me/fcm-token` 🔑
**Handler:** `saveFcmToken.ts`  
Saves the user's FCM (Firebase Cloud Messaging) push token on the server so the coordinator can target them for notifications.

**Request Body:**
```json
{ "fcmToken": "eXaMpLeToKeN..." }
```

**Response `200`:**
```json
{ "success": true, "message": "FCM token saved" }
```

---

#### `GET /api/users/me/notifications` 🔑
**Handler:** `getUserNotifications.ts`  
Returns the user's received announcements/notifications.

**Query Params:** `?limit=20&page=1&read=false`

**Response `200`:**
```json
{
  "success": true,
  "data": [
    { "id": "...", "message": "Bus will be late", "routeId": "...", "read": false, "createdAt": "..." }
  ]
}
```

---

#### `PATCH /api/users/me/notifications/:notificationId/read` 🔑
**Handler:** `markNotificationRead.ts`  
Marks a notification as read.

**Response `200`:**
```json
{ "success": true, "message": "Marked as read" }
```

---

### Stoppage Requisition Routes

#### `POST /api/requisitions` 🔑
**Handler:** `createRequisition.ts`  
User submits a request to temporarily change their bus stoppage for a specific date. Maximum **3 requisitions per route per day**.

**Request Body:**
```json
{
  "routeId": "wbx_route_xxxx",
  "stopId": "wbx_stop_xxxx",
  "date": "2026-03-24",
  "message": "Attending a medical appointment, need to board from Gate 3."
}
```

**Validation:**
- Count existing PENDING/APPROVED requisitions for `(userId, routeId, date)` — reject if ≥ 3.

**Response `201`:**
```json
{
  "success": true,
  "message": "Requisition submitted",
  "data": { "id": "...", "status": "PENDING" }
}
```

---

#### `DELETE /api/requisitions/:id` 🔑
**Handler:** `cancelRequisition.ts`  
User cancels their own PENDING requisition.

**Response `200`:**
```json
{ "success": true, "message": "Requisition cancelled" }
```

---

### Lost & Found Routes

#### `POST /api/lost-and-found` 🟡
**Handler:** `createLostItem.ts`  
Coordinator reports a lost item found on the bus and uploads its image.

**Content-Type:** `multipart/form-data`

**Fields:**
| Field         | Type   | Required |
|---------------|--------|----------|
| `busId`       | string | ✅       |
| `description` | string | ✅       |
| `image`       | file   | optional |

**Response `201`:**
```json
{
  "success": true,
  "data": { "id": "...", "description": "Blue water bottle", "imageUrl": "/uploads/...", "status": "UNCLAIMED" }
}
```

---

#### `GET /api/lost-and-found` 🔑
**Handler:** `listLostItems.ts`  
Returns the list of active lost items visible to all authenticated users.

**Query Params:** `?busId=...&status=UNCLAIMED`

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "bus": { "busId": "...", "busName": "Bus 01" },
      "description": "Blue water bottle",
      "imageUrl": "/uploads/...",
      "status": "UNCLAIMED",
      "createdAt": "..."
    }
  ]
}
```

---

#### `GET /api/lost-and-found/:id` 🔑
**Handler:** `getLostItemById.ts`  
Returns a single lost item's full details.

**Response `200`:**
```json
{
  "success": true,
  "data": { "id": "...", "description": "...", "imageUrl": "...", "status": "...", "claims": [] }
}
```

---

#### `POST /api/lost-and-found/:id/claim` 🔑
**Handler:** `claimLostItem.ts`  
User sends a claim request for a lost item to the coordinator.

**Request Body:**
```json
{ "message": "The blue bottle is mine, I have a matching receipt." }
```

**Response `201`:**
```json
{ "success": true, "message": "Claim submitted to coordinator" }
```

---

#### `PATCH /api/lost-and-found/:id` 🟡
**Handler:** `updateLostItem.ts`  
Coordinator updates item description or marks it as `CLAIMED` / `RETURNED`.

**Request Body (all optional):**
```json
{ "description": "Updated desc", "status": "RETURNED" }
```

**Response `200`:**
```json
{ "success": true, "message": "Item updated" }
```

---

#### `DELETE /api/lost-and-found/:id` 🟡
**Handler:** `deleteLostItem.ts`  
Coordinator removes the item from the list.

**Response `200`:**
```json
{ "success": true, "message": "Item removed" }
```

---

## Standard Response Shape

All responses follow:

```json
{
  "success": true | false,
  "message": "Human-readable message",
  "data": { } | [ ]
}
```

Error responses add no `data` field (or `null`).

---

## Error Codes

| HTTP Code | Meaning                                 |
|-----------|-----------------------------------------|
| 200       | OK                                      |
| 201       | Created                                 |
| 204       | No content (CORS preflight)             |
| 400       | Bad request / validation failed         |
| 401       | Unauthenticated                         |
| 403       | Forbidden (wrong role / blocked)        |
| 404       | Resource not found                      |
| 409       | Conflict (duplicate email/id)           |
| 413       | Request body too large                  |
| 429       | Too many requests (rate limited)        |
| 500       | Internal server error                   |

---

## Headers Reference

| Header              | Direction | Description                                  |
|---------------------|-----------|----------------------------------------------|
| `Authorization`     | Request   | `Bearer <jwt>` — required on 🔑🟡🔴 routes  |
| `x-api-key`         | Request   | Bus device API key — required on 📡 routes   |
| `Content-Type`      | Request   | `application/json` or `multipart/form-data`  |
| `x-forwarded-for`   | Request   | Real client IP (rate limiting)               |
| `Access-Control-Allow-Origin` | Response | CORS origin header               |

---

## Existing Handlers vs. Planned Handlers

| Handler File               | Status   | Route(s)                                  |
|----------------------------|----------|-------------------------------------------|
| `health.ts`                | ✅ Exists | `GET /api/health`                         |
| `registerUser.ts`          | ✅ Exists | `POST /api/users/register`                |
| `authUser.ts`              | ✅ Exists | `POST /api/users/login`                   |
| `verifyEmail.ts`           | 🔲 Planned | `POST /api/auth/verify-email`            |
| `resendOtp.ts`             | 🔲 Planned | `POST /api/auth/resend-otp`              |
| `forgotPassword.ts`        | 🔲 Planned | `POST /api/auth/forgot-password`         |
| `resetPassword.ts`         | 🔲 Planned | `POST /api/auth/reset-password`          |
| `assignCoordinator.ts`     | ✅ Exists | `POST /api/admin/coordinators/assign`     |
| `registerBus.ts`           | ✅ Exists | `POST /api/admin/buses/register`          |
| `createReading.ts`         | ✅ Exists | `POST /api/readings`                      |
| `getLatestPosition.ts`     | ✅ Exists | `GET /api/buses/:busId/position`          |
| `getMapLocation.ts`        | ✅ Exists | `GET /api/buses/map`                      |
| `getBusById.ts`            | ✅ Exists | `GET /api/buses/:busId`                   |
| `getReadings.ts`           | ✅ Exists | `GET /api/buses/:busId/readings`          |
| `getUserProfile.ts`        | 🔲 Planned | `GET /api/users/me`                     |
| `updateUserProfile.ts`     | 🔲 Planned | `PATCH /api/users/me`                   |
| `setUserPrimaryRoute.ts`   | 🔲 Planned | `PUT /api/users/me/primary-route`       |
| `setUserSecondaryRoutes.ts`| 🔲 Planned | `PUT /api/users/me/secondary-routes`    |
| `setUserPrimaryStoppage.ts`| 🔲 Planned | `PUT /api/users/me/primary-stoppage`    |
| `getUserRequisitions.ts`   | 🔲 Planned | `GET /api/users/me/requisitions`        |
| `removeCoordinator.ts`     | 🔲 Planned | `DELETE /api/admin/coordinators/:userId`|
| `listAllUsers.ts`          | 🔲 Planned | `GET /api/admin/users`                  |
| `getAdminUserById.ts`      | 🔲 Planned | `GET /api/admin/users/:userId`          |
| `adminUpdateUser.ts`       | 🔲 Planned | `PATCH /api/admin/users/:userId`        |
| `adminListBuses.ts`        | 🔲 Planned | `GET /api/admin/buses`                  |
| `adminUpdateBus.ts`        | 🔲 Planned | `PATCH /api/admin/buses/:busId`         |
| `adminDeleteBus.ts`        | 🔲 Planned | `DELETE /api/admin/buses/:busId`        |
| `getBusApiKey.ts`          | 🔲 Planned | `GET /api/admin/buses/:busId/api-key`   |
| `regenerateBusApiKey.ts`   | 🔲 Planned | `POST /api/admin/buses/:busId/regenerate-api-key` |
| `coordinatorListUsers.ts`  | 🔲 Planned | `GET /api/coordinator/users`            |
| `coordinatorRemoveUser.ts` | 🔲 Planned | `DELETE /api/coordinator/users/:userId` |
| `coordinatorGetRequisitions.ts` | 🔲 Planned | `GET /api/coordinator/requisitions` |
| `coordinatorUpdateRequisition.ts` | 🔲 Planned | `PATCH /api/coordinator/requisitions/:id` |
| `sendAnnouncement.ts`      | 🔲 Planned | `POST /api/coordinator/announcements`   |
| `getAnnouncements.ts`      | 🔲 Planned | `GET /api/coordinator/announcements`    |
| `createRoute.ts`           | 🔲 Planned | `POST /api/routes`                      |
| `listRoutes.ts`            | 🔲 Planned | `GET /api/routes`                       |
| `getRouteById.ts`          | 🔲 Planned | `GET /api/routes/:routeId`              |
| `updateRoute.ts`           | 🔲 Planned | `PATCH /api/routes/:routeId`            |
| `addStop.ts`               | 🔲 Planned | `POST /api/routes/:routeId/stops`       |
| `updateStop.ts`            | 🔲 Planned | `PATCH /api/routes/:routeId/stops/:stopId` |
| `deleteStop.ts`            | 🔲 Planned | `DELETE /api/routes/:routeId/stops/:stopId` |
| `createTrip.ts`            | 🔲 Planned | `POST /api/trips`                       |
| `listTrips.ts`             | 🔲 Planned | `GET /api/trips`                        |
| `getTripById.ts`           | 🔲 Planned | `GET /api/trips/:tripId`                |
| `updateTrip.ts`            | 🔲 Planned | `PATCH /api/trips/:tripId`              |
| `saveFcmToken.ts`          | 🔲 Planned | `POST /api/users/me/fcm-token`          |
| `getUserNotifications.ts`  | 🔲 Planned | `GET /api/users/me/notifications`       |
| `markNotificationRead.ts`  | 🔲 Planned | `PATCH /api/users/me/notifications/:id/read` |
| `createRequisition.ts`     | 🔲 Planned | `POST /api/requisitions`                |
| `cancelRequisition.ts`     | 🔲 Planned | `DELETE /api/requisitions/:id`          |
| `createLostItem.ts`        | 🔲 Planned | `POST /api/lost-and-found`              |
| `listLostItems.ts`         | 🔲 Planned | `GET /api/lost-and-found`               |
| `getLostItemById.ts`       | 🔲 Planned | `GET /api/lost-and-found/:id`           |
| `claimLostItem.ts`         | 🔲 Planned | `POST /api/lost-and-found/:id/claim`    |
| `updateLostItem.ts`        | 🔲 Planned | `PATCH /api/lost-and-found/:id`         |
| `deleteLostItem.ts`        | 🔲 Planned | `DELETE /api/lost-and-found/:id`        |
