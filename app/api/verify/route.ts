import { NextResponse } from 'next/server';

// 1. Specific private variables as requested
const Image_Latitude = 48.8566;
const Image_Longitude = 2.3522;
const selected_km_distance_for_success = 50;
const flag = "CTF{y0u_f0und_p4r1s}";

// Haversine formula calculation helper
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toR = (x: number) => (x * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLon = toR(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(Math.max(0, a)), Math.sqrt(Math.max(0, 1 - a)));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { player_guessed_latitude, player_guessed_longitude } = body;

    if (
      typeof player_guessed_latitude !== 'number' ||
      typeof player_guessed_longitude !== 'number'
    ) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    // 3. Handle player guesses and distance calculations securely on the server side
    const distance = haversine(
      player_guessed_latitude,
      player_guessed_longitude,
      Image_Latitude,
      Image_Longitude
    );

    const success = distance <= selected_km_distance_for_success;

    if (success) {
      return NextResponse.json({ success: true, flag });
    } else {
      return NextResponse.json({ success: false });
    }
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
