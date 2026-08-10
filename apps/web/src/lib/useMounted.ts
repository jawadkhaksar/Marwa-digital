import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * True once the component has mounted on the client — the hydration-safe
 * way to delay client-only rendering (avoiding a server/client mismatch)
 * without a `useState` + `useEffect(() => setMounted(true), [])` pair,
 * which itself needs an effect just to flip one flag exactly once and never
 * again. useSyncExternalStore is built for exactly this: getServerSnapshot
 * (false) is what SSR and the client's first render both see, so hydration
 * never mismatches, then it re-renders with the client snapshot (true)
 * immediately after.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
