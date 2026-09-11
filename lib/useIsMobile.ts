'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Returns true when the viewport is at or below `maxWidth` pixels.
 * Uses useSyncExternalStore so the value is correct on first client render
 * and always false during server rendering.
 */
export function useIsMobile(maxWidth = 768): boolean {
  const query = `(max-width: ${maxWidth}px)`;

  const subscribe = useCallback(
    (onChange: () => void) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener('change', onChange);
      return () => mediaQuery.removeEventListener('change', onChange);
    },
    [query]
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}

/** True on phones and tablets (coarse pointer, no hover, or touch points). */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(hover: none)').matches ||
    navigator.maxTouchPoints > 0
  );
}

/**
 * Pass to Radix `Dialog.Content onOpenAutoFocus`. On touch devices it stops
 * the dialog from focusing its first field on open, which on iOS would pop
 * the keyboard or the date picker before the user has tapped anything.
 */
export function preventAutoFocusOnTouch(event: Event) {
  if (isTouchDevice()) {
    event.preventDefault();
  }
}
