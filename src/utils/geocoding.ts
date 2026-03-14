/**
 * Reverse Geocoding Utility
 * Translates GPS coordinates into human-readable addresses using OpenStreetMap Nominatim.
 */

import { redis } from '../config/redis';

export async function getAddressFromCoords(latitude: number, longitude: number): Promise<string | null> {
  // Round to 4 decimal places (~11m precision) to increase cache hits
  const roundedLat = latitude.toFixed(4);
  const roundedLon = longitude.toFixed(4);
  const cacheKey = `geo:cache:${roundedLat}:${roundedLon}`;

  try {
    // 1. Check Redis Cache
    const cachedAddress = await redis.get(cacheKey);
    if (cachedAddress) {
      return cachedAddress;
    }

    // 2. Fetch from Nominatim if not in cache
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Bus-Tracker-API (Educational Project)'
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('[GEOCODING] Rate limited by Nominatim');
      }
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json() as any;
    const address = data.display_name || null;

    // 3. Store in Cache (Expire in 24 hours)
    if (address) {
      await redis.set(cacheKey, address, 'EX', 86400);
    }
    
    return address;
  } catch (error) {
    console.error('[GEOCODING] Failed to fetch address:', error);
    return null;
  }
}
