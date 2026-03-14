/**
 * Concurrent Device Fetcher Simulation Script
 * Simulates 200 devices fetching data from the API simultaneously.
 */

import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../src/config/env';

const SERVER_URL = 'http://localhost:3000';
const NUM_FETCHERS = 200;
const FETCH_INTERVAL = 3000; // 3 seconds

// Generate a valid JWT token for auth
const token = jwt.sign(
  { id: 'wbx_user_simulator', role: 'USER' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

async function startFetcher(id: number) {
  console.log(`[Fetcher ${id}] Started`);
  
  while (true) {
    const startTime = Date.now();
    try {
      const res = await fetch(`${SERVER_URL}/api/buses/map`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const duration = Date.now() - startTime;
      
      if (res.ok) {
        // console.log(`[Fetcher ${id}] OK (${duration}ms)`);
      } else {
        const data: any = await res.json();
        console.error(`[Fetcher ${id}] ERROR: ${data.message || res.statusText}`);
      }
    } catch (error: any) {
      console.error(`[Fetcher ${id}] NETWORK ERROR: ${error.message}`);
    }

    // Wait for the next interval
    await new Promise(resolve => setTimeout(resolve, FETCH_INTERVAL));
  }
}

console.log(`Starting ${NUM_FETCHERS} concurrent fetchers...`);

// Launch all fetchers
for (let i = 1; i <= NUM_FETCHERS; i++) {
  // Stagger the starts slightly to avoid a massive initial burst
  setTimeout(() => startFetcher(i), Math.random() * 2000);
}
