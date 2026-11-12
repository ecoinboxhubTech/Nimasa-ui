export type LatLngBounds = [[number, number], [number, number]];
export type GeoPoint = { lat: number; lng: number };

/** Bounding box for any set of coordinates, with a small padding so markers are not clipped. */
export function boundsOf(points: GeoPoint[], padRatio = 0.08): LatLngBounds | null {
  const lat = points.map((p) => p.lat).filter(Number.isFinite);
  const lng = points.map((p) => p.lng).filter(Number.isFinite);
  if (!lat.length || !lng.length) return null;
  const minLat = Math.min(...lat);
  const maxLat = Math.max(...lat);
  const minLng = Math.min(...lng);
  const maxLng = Math.max(...lng);
  const padLat = Math.max((maxLat - minLat) * padRatio, 0.01);
  const padLng = Math.max((maxLng - minLng) * padRatio, 0.01);
  return [
    [minLat - padLat, minLng - padLng],
    [maxLat + padLat, maxLng + padLng],
  ];
}

export function centerOf(points: GeoPoint[]): [number, number] | null {
  const valid = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (!valid.length) return null;
  return [
    valid.reduce((sum, p) => sum + p.lat, 0) / valid.length,
    valid.reduce((sum, p) => sum + p.lng, 0) / valid.length,
  ];
}
