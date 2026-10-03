export function tilePoint(lat, lng, zoom) {
  const n = 2 ** zoom;
  return {
    x: ((lng + 180) / 360) * n,
    y: ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * n,
  };
}
export function tileLocation(x, y, zoom) {
  const n = 2 ** zoom;
  return {
    lat: (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI,
    lng: (x / n) * 360 - 180,
  };
}
