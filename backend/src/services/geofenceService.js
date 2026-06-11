/**
 * Checks if a point (lat, lng) is inside a polygon (array of {lat, lng} vertices).
 * Ray-casting algorithm.
 * @param {Object} point - { lat, lng }
 * @param {Array<Object>} polygon - Array of { lat, lng }
 * @returns {boolean}
 */
export function isPointInPolygon(point, polygon) {
  if (!polygon || polygon.length < 3) return false;

  const x = point.lat;
  const y = point.lng;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat;
    const yi = polygon[i].lng;
    const xj = polygon[j].lat;
    const yj = polygon[j].lng;

    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }

  return inside;
}
