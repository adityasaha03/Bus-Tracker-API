/**
 * Bus Device Simulator
 * Emulates a hardware GPS device pushing coordinates over time.
 * 
 * Usage:
 * bun run scripts/simulateDevice.ts <busId> <apiKey>
 */

const argBusId = process.argv[2];
const argApiKey = process.argv[3];

if (!argBusId || !argApiKey) {
  console.error('Usage: bun run scripts/simulateDevice.ts <busId> <apiKey>');
  process.exit(1);
}

const busId: string = argBusId;
const apiKey: string = argApiKey;

const SERVER_URL = 'http://localhost:3000';

// A simple simulated route (e.g. coordinates moving slightly)
// Starting location around AUST campus bounds
let currentLat = 23.7639;
let currentLon = 90.4066;

async function sendReading() {
  const payload = {
    latitude: currentLat,
    longitude: currentLon,
    recordedAt: new Date().toISOString()
  };

  try {
    const res = await fetch(`${SERVER_URL}/api/readings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': busId,
        'x-api-key': apiKey
      },
      body: JSON.stringify(payload)
    });

    const data: any = await res.json();
    if (res.ok) {
      console.log(`[OK] Pushed ${currentLat.toFixed(5)}, ${currentLon.toFixed(5)}`);
    } else {
      console.error(`[FAIL] ${data.message}`);
    }

    // Move next point slightly
    currentLat += (Math.random() - 0.5) * 0.001;
    currentLon += (Math.random() - 0.5) * 0.001;

  } catch (error: any) {
    console.error(`[ERROR] Network error: ${error.message}`);
  }
}

console.log(`Starting simulator for bus ${busId}...`);
sendReading();
setInterval(sendReading, 5000); // Send every 5 seconds
