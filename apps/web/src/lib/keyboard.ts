function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest('input, textarea, select, button, a, [contenteditable]:not([contenteditable="false"])'))
  );
}

export function shouldIgnoreShortcut(event: KeyboardEvent, allowShift = false) {
  return (
    event.repeat ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    (!allowShift && event.shiftKey) ||
    isInteractiveTarget(event.target)
  );
}
