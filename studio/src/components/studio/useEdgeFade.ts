"use client";

import { useEffect, useState, type CSSProperties, type RefObject } from "react";

/**
 * Edge-fade masks for a horizontal scroller: a fade appears only while
 * more content sits beyond that edge (ResizeObserver + scroll listener).
 */
export function useEdgeFade(
  ref: RefObject<HTMLElement | null>,
): CSSProperties {
  const [edges, setEdges] = useState({ left: false, right: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setEdges({
        left: el.scrollLeft > 0,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
      });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [ref]);
  if (!edges.left && !edges.right) return {};
  const from = edges.left ? "transparent, #000 48px" : "#000";
  const to = edges.right
    ? "#000 calc(100% - 48px), transparent"
    : "#000";
  const maskImage = `linear-gradient(to right, ${from}, ${to})`;
  return { maskImage, WebkitMaskImage: maskImage };
}
