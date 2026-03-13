/**
 * Reverse Geocoding Utility
 * Translates GPS coordinates into human-readable addresses using OpenStreetMap Nominatim.
 */

export async function getAddressFromCoords(latitude: number, longitude: number): Promise<string | null> {
  try {
    // Nominatim requires a descriptive User-Agent
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Bus-Tracker-API (Educational Project)'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json() as any;
    
    // Return the full display name, or a fallback
    return data.display_name || null;
  } catch (error) {
    console.error('[GEOCODING] Failed to fetch address:', error);
    return null;
  }
}
