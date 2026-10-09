// Pure camera transformations, usable by browser runtime and Node tests.
// Vehicle nose, movement heading and cockpit forward all use local -Z.
export const VIEW_MODES = Object.freeze(['free', 'chase', 'cockpit']);
export const CAMERA_EYE = Object.freeze({ x: -0.59, y: 1.01, z: 0.33 });
export function safeMode(mode) {
  return VIEW_MODES.includes(mode) ? mode : 'chase';
}
export function forwardOf(heading) {
  return { x: -Math.sin(heading), z: -Math.cos(heading) };
}
export function rotateXZ(x, z, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return { x: x * c + z * s, z: -x * s + z * c };
}
export function cameraPose(mode, position, heading, pitch = 0, lookYaw = 0, lookPitch = 0) {
  if (mode === 'cockpit') {
    const offset = rotateXZ(CAMERA_EYE.x, CAMERA_EYE.z, heading);
    return {
      position: { x: position.x + offset.x, y: position.y + CAMERA_EYE.y, z: position.z + offset.z },
      yaw: heading + Math.max(-1.15, Math.min(1.15, lookYaw)),
      pitch: Math.max(-0.62, Math.min(0.65, -0.08 + lookPitch)),
      target: null
    };
  }
  if (mode === 'chase') {
    const ahead = forwardOf(heading);
    const raise = Math.max(3.8, Math.min(12.5, 5.8 - pitch * 6));
    return {
      position: { x: position.x - ahead.x * 11.8, y: position.y + raise, z: position.z - ahead.z * 11.8 },
      target: { x: position.x + ahead.x * 10, y: position.y + 0.3, z: position.z + ahead.z * 10 },
      yaw: heading,
      pitch: 0
    };
  }
  return {
    position: { x: position.x, y: position.y, z: position.z },
    target: null,
    yaw: heading,
    pitch
  };
}
