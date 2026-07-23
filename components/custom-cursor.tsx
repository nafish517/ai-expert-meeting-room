"use client";

import { useEffect, useRef, useState } from "react";

const HOVER_SELECTOR = [
  "a",
  "button",
  "[role='button']",
  "input",
  "select",
  "textarea",
  "label",
  "summary",
  ".landing-cta-primary",
  ".landing-cta-ghost",
  ".landing-nav-cta",
  ".meeting-control",
  ".leave-control",
  ".notes-toggle",
  ".theme-control",
  ".export-pdf-control",
  ".notifications-control",
  ".chat-keyboard-toggle",
  ".panel-primary-button",
  ".app-sidebar-link",
  ".app-sidebar-new-meeting",
  ".app-mobile-nav-trigger",
  ".more-menu button",
  ".composer-heading button",
  ".composer-input button",
  ".file-chip button",
  ".stop-speaking-inline",
  ".stop-speaking-control",
  ".expert-nameplate",
  ".expert-pill",
  ".add-expert-nameplate",
  ".floor-control",
  ".mode-toggle button",
  ".remove-agent",
].join(", ");

function resolveInteractive(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const card = target.closest(".expert-nameplate, .add-expert-nameplate, .expert-pill-wrap");
  if (card instanceof HTMLElement) {
    const pill = target.closest(".expert-pill");
    return pill instanceof HTMLElement ? pill : card;
  }
  const interactive = target.closest(HOVER_SELECTOR);
  return interactive instanceof HTMLElement ? interactive : null;
}

function markExpertCardControls(root: HTMLElement) {
  const card = root.closest(".expert-nameplate, .add-expert-nameplate, .expert-pill-wrap");
  if (!(card instanceof HTMLElement)) return;
  card.classList.add("cursor-target-hot");
  // Only highlight the pill itself — never Talk/Chat/floor, or card hover
  // paints every control the same and hides which mode/floor state is active.
  card.querySelectorAll(".expert-pill").forEach((node) => {
    node.classList.add("cursor-target-hot");
  });
}

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncEnabled = () => {
      const next = finePointer.matches && !reducedMotion.matches;
      setEnabled(next);
      document.documentElement.classList.toggle("has-custom-cursor", next);
    };

    syncEnabled();
    finePointer.addEventListener("change", syncEnabled);
    reducedMotion.addEventListener("change", syncEnabled);

    return () => {
      finePointer.removeEventListener("change", syncEnabled);
      reducedMotion.removeEventListener("change", syncEnabled);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const cursor = cursorRef.current;
    if (!cursor) return;

    const tick = () => {
      const pos = posRef.current;
      const target = targetRef.current;
      pos.x += (target.x - pos.x) * 0.22;
      pos.y += (target.y - pos.y) * 0.22;
      cursor.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`;
      rafRef.current = window.requestAnimationFrame(tick);
    };

    const onMove = (event: MouseEvent) => {
      targetRef.current.x = event.clientX;
      targetRef.current.y = event.clientY;
      cursor.classList.add("is-visible");
    };

    const clearHot = () => {
      document.querySelectorAll(".cursor-target-hot").forEach((node) => {
        node.classList.remove("cursor-target-hot");
      });
    };

    const onOver = (event: MouseEvent) => {
      const interactive = resolveInteractive(event.target);
      cursor.classList.toggle("is-hover", Boolean(interactive));
      clearHot();
      if (!interactive) return;
      interactive.classList.add("cursor-target-hot");
      markExpertCardControls(interactive);
    };

    const onOut = (event: MouseEvent) => {
      const next = resolveInteractive(event.relatedTarget);
      if (next) return;
      cursor.classList.remove("is-hover");
      clearHot();
    };

    const onDown = () => cursor.classList.add("is-pressed");
    const onUp = () => cursor.classList.remove("is-pressed");
    const onLeaveWindow = () => {
      cursor.classList.remove("is-visible", "is-hover", "is-pressed");
      clearHot();
    };

    rafRef.current = window.requestAnimationFrame(tick);
    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("mouseleave", onLeaveWindow);

    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseleave", onLeaveWindow);
      clearHot();
    };
  }, [enabled]);

  if (!enabled) return null;

  return <div ref={cursorRef} className="custom-cursor" aria-hidden="true" />;
}
