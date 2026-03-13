# Bus Tracker API

A backend service for tracking buses in real-time, built with Bun, TypeScript, PostgreSQL, Redis, and Socket.io.

## Setup Instructions

1. Install dependencies:
```bash
bun install
```

2. Start the development server:
```bash
bun run src/server.ts
```

---

## 🧪 Testing Guide

This section explains how to test the entire flow of the application, from admin setup to real-time tracking.

### 1. Generate Admin JWT Token
Most admin routes require a `SUPER_ADMIN` role. Use the helper script to generate a temporary token for testing:
```bash
bun run scripts/generateAdminToken.ts
```
*Copy the resulting token. You will use it as a **Bearer Token** in your API client.*

### 2. Register a Bus (Admin Flow)
Use an API client like **Hoppscotch** or **Postman** to create a new bus in the system.

- **Method:** `POST`
- **URL:** `http://localhost:3000/api/buses/register`
- **Auth:** `Bearer Token` (Paste the token from Step 1)
- **Body (JSON):**
  ```json
  {
    "busName": "Express Line A",
    "licensePlate": "DHAKA-G-11-2233",
    "routeLabel": "Route 1"
  }
  ```
- **Result:** You will receive a `busId` and a raw `apiKey`. **Save these for the next step.**

### 3. Simulate a Bus Device (Hardware Flow)
Now that you have a `busId` and `apiKey`, you can run the simulator to push live GPS data:
```bash
bun run scripts/simulateDevice.ts <busId> <apiKey>
```
*The terminal should show `[OK] Pushed...` every 5 seconds.*

### 4. Verify Live WebSocket Updates
To verify that coordinates are being broadcasted in real-time:
1. Open **Hoppscotch** and go to the **Realtime** tab.
2. Select **Socket.io**.
3. URL: `ws://localhost:3000`
4. Connect and listen for the event: `busPositionUpdate`.
*You should see JSON objects appearing every time the simulator pushes a new location.*

### 5. Check API Data (User Flow)
Verify the data is stored and accessible via the regular API:
- **Get all buses on map:** `GET /api/buses/map`
- **Get specific bus position:** `GET /api/buses/<busId>/position`
- **Get history:** `GET /api/buses/<busId>/readings`

*(Note: These routes require the Bearer Token from Step 1)*

---

## API Routes Documentation

### 🌐 Public Routes
*   `GET /api/health`: Server status check.

### 🚌 Device Routes
*   `POST /api/readings`: Pushes live GPS data (Hardware only).
    *   **Headers:** `x-device-id`, `x-api-key`

### ⚙️ Admin Routes
*   `POST /api/buses/register`: Create new bus. (Requires SuperAdmin Token)

### 🔒 Protected Routes
*Requires valid JWT in Authorization header.*

*   `GET /api/buses/map`
*   `GET /api/buses/:busId`
*   `GET /api/buses/:busId/position`
*   `GET /api/buses/:busId/readings`

---

*(Created using `bun init` in v1.3.10)*
