// @vitest-environment jsdom
import { vi } from "vitest";
import trackAnchorPosition from "./trackAnchorPosition";

describe("trackAnchorPosition", () => {
  let root: HTMLDivElement;
  let anchor: HTMLAnchorElement;
  let top: number;
  let resize: () => void;
  let frames: Map<number, FrameRequestCallback>;
  let nextFrame: number;
  let stop: (() => void) | undefined;

  const flush = () => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(0));
  };

  beforeEach(() => {
    frames = new Map();
    nextFrame = 0;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resize = callback;
        }
        observe() {}
        disconnect() {}
      }
    );
    root = document.createElement("div");
    anchor = document.createElement("a");
    root.appendChild(anchor);
    document.body.appendChild(root);
    top = 0;
    vi.spyOn(anchor, "getBoundingClientRect").mockImplementation(() => ({
      top,
      bottom: top,
      left: 0,
      right: 100,
      x: 0,
      y: top,
      width: 100,
      height: 0,
      toJSON() {},
    }));
    anchor.scrollIntoView = vi.fn(() => {
      top = 0;
    });
  });

  afterEach(() => {
    stop?.();
    stop = undefined;
    root.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("restores the heading after successive image layout shifts", () => {
    stop = trackAnchorPosition(anchor, root);
    flush();
    top = 1000;
    resize();
    flush();
    expect(top).toBe(0);
    top = 4100;
    resize();
    flush();
    expect(top).toBe(0);
  });

  it.each(["wheel", "touchstart", "pointerdown", "keydown"])(
    "does not pull the user back after %s input, including queued corrections",
    (event) => {
      stop = trackAnchorPosition(anchor, root);
      flush();
      top = 2000;
      resize();
      document.dispatchEvent(new Event(event, { bubbles: true }));
      flush();
      resize();
      flush();
      expect(top).toBe(2000);
      expect(anchor.scrollIntoView).not.toHaveBeenCalled();
    }
  );

  it("does not scroll after tracking is cleaned up for navigation or unmount", () => {
    stop = trackAnchorPosition(anchor, root);
    top = 1000;
    stop();
    flush();
    resize();
    flush();
    expect(top).toBe(1000);
    expect(anchor.scrollIntoView).not.toHaveBeenCalled();
  });

  it("ignores an anchor removed before its queued correction", () => {
    top = 1000;
    stop = trackAnchorPosition(anchor, root);
    anchor.remove();
    flush();
    expect(anchor.scrollIntoView).not.toHaveBeenCalled();
  });
});
