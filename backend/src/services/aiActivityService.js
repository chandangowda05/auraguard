/**
 * AI Activity detection service.
 * Classifies human activities using MPU6050 sensor data (accelerometer ax, ay, az).
 */

// We assume sensor readings are in Gs (gravity units, where normal resting state is ~1.0g).
// If raw ADC values are provided (e.g. +/- 2g range = 16384 LSB/g), they should be scaled.

export function classifyActivity(sensorData) {
  const { ax, ay, az } = sensorData;
  
  if (ax === undefined || ay === undefined || az === undefined) {
    return 'Normal State';
  }

  // Calculate total acceleration magnitude: A = sqrt(ax^2 + ay^2 + az^2)
  const totalAccel = Math.sqrt(ax * ax + ay * ay + az * az);

  // 1. Fall Detection
  // Free fall: A approaches 0 (typically < 0.4G) followed by an impact spike (> 2.5G)
  // Or simply a high-magnitude shock (> 3.0G) indicative of a hard fall
  if (totalAccel > 3.0 || totalAccel < 0.3) {
    return 'Fall Detection';
  }

  // 2. Running Detection
  // Active movement typically has acceleration values fluctuating well above 1.5G or below 0.6G repeatedly
  if (totalAccel > 1.8 || totalAccel < 0.5) {
    return 'Running';
  }

  // 3. Inactivity Detection
  // Handled by tracking duration of stillness. Stillness is when acceleration is very close to 1.0G (gravity)
  // with a very small variance.
  const isStill = Math.abs(totalAccel - 1.0) < 0.08;
  if (isStill) {
    return 'Still'; // Caller can convert to 'Inactivity' if this state lasts > 5 mins
  }

  return 'Normal State';
}
