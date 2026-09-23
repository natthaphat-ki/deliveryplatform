const EARTH_RADIUS_KM = 6371;

/** Great-circle distance between two coordinates, in kilometers. */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Rough delivery ETA at an assumed 25 km/h city average, minimum 5 minutes. */
export function etaMinutesFor(distance: number): number {
  return Math.max(5, Math.round((distance / 25) * 60));
}
