import { useEffect, useMemo, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Euler, Vector3 } from 'three';

const MOVEMENT_CODES = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);

export default function WalkthroughCamera({ initialPosition, bounds, touchInput, keyboardActive = true, bearing = 0 }) {
  const { camera, gl } = useThree();
  const keys = useRef(new Set());
  const drag = useRef(null);
  const keyboard = useRef(keyboardActive);
  keyboard.current = keyboardActive;
  const heading = useMemo(() => new Euler(0, 0, 0, 'YXZ'), []);
  const motion = useMemo(() => new Vector3(), []);
  const [x, y, z] = initialPosition;

  useEffect(() => { if (!keyboardActive) keys.current.clear(); }, [keyboardActive]);

  useEffect(() => {
    const element = gl.domElement;
    camera.position.set(x, y, z);
    heading.set(0, -bearing * Math.PI / 180, 0);
    camera.quaternion.setFromEuler(heading);

    function press(event) {
      if (!keyboard.current || !MOVEMENT_CODES.has(event.code) || event.target?.closest?.('input, select, textarea, [contenteditable="true"]')) return;
      event.preventDefault();
      keys.current.add(event.code);
    }
    const release = (event) => keys.current.delete(event.code);
    const clear = () => { keys.current.clear(); drag.current = null; };
    function start(event) {
      if (!event.isPrimary || event.button !== 0) return;
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      element.setPointerCapture?.(event.pointerId);
    }
    function look(event) {
      const previous = drag.current;
      if (previous?.id !== event.pointerId) return;
      heading.y -= (event.clientX - previous.x) * 0.0037;
      heading.x = Math.max(-1.22, Math.min(1.22, heading.x - (event.clientY - previous.y) * 0.0037));
      camera.quaternion.setFromEuler(heading);
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    }
    const stop = (event) => { if (drag.current?.id === event.pointerId) drag.current = null; };

    window.addEventListener('keydown', press);
    window.addEventListener('keyup', release);
    window.addEventListener('blur', clear);
    element.addEventListener('pointerdown', start);
    element.addEventListener('pointermove', look);
    element.addEventListener('lostpointercapture', stop);
    element.addEventListener('pointerup', stop);
    element.addEventListener('pointercancel', stop);
    return () => {
      clear();
      window.removeEventListener('keydown', press);
      window.removeEventListener('keyup', release);
      window.removeEventListener('blur', clear);
      element.removeEventListener('pointerdown', start);
      element.removeEventListener('pointermove', look);
      element.removeEventListener('lostpointercapture', stop);
      element.removeEventListener('pointerup', stop);
      element.removeEventListener('pointercancel', stop);
    };
  }, [bearing, camera, gl, heading, x, y, z]);

  useFrame((_, delta) => {
    const held = (key, arrow) => keys.current.has(key) || keys.current.has(arrow) || touchInput.current.has(arrow);
    const sideways = Number(held('KeyD', 'ArrowRight')) - Number(held('KeyA', 'ArrowLeft'));
    const forward = Number(held('KeyS', 'ArrowDown')) - Number(held('KeyW', 'ArrowUp'));
    if (!sideways && !forward) return;
    const c = Math.cos(heading.y);
    const s = Math.sin(heading.y);
    motion.set(c * sideways + s * forward, 0, c * forward - s * sideways).normalize();
    camera.position.addScaledVector(motion, 6.8 * Math.min(delta, 0.045));
    camera.position.x = Math.max(bounds.minX, Math.min(bounds.maxX, camera.position.x));
    camera.position.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, camera.position.z));
  });

  return null;
}
