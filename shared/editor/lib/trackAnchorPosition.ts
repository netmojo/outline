/** Keep a requested anchor aligned through layout shifts until the user takes control. */
export default function trackAnchorPosition(
  anchor: HTMLElement,
  root: HTMLElement
): () => void {
  let frame: number | undefined;
  let stopped = false;
  const events = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

  const align = () => {
    frame = undefined;
    if (
      !stopped &&
      anchor.isConnected &&
      Math.abs(anchor.getBoundingClientRect().top) > 1
    ) {
      anchor.scrollIntoView({ block: "start", behavior: "instant" });
    }
  };
  const schedule = () => {
    if (!stopped && frame === undefined) {
      frame = requestAnimationFrame(align);
    }
  };
  const observer = new ResizeObserver(schedule);
  const stop = () => {
    stopped = true;
    observer.disconnect();
    if (frame !== undefined) {
      cancelAnimationFrame(frame);
      frame = undefined;
    }
    for (const event of events) {
      document.removeEventListener(event, stop, true);
    }
  };

  for (const event of events) {
    document.addEventListener(event, stop, { capture: true, passive: true });
  }
  observer.observe(root);
  schedule();
  return stop;
}
