"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { motion, useReducedMotion } from "motion/react";
import styles from "./script-generator.module.css";

type Point = { x: number; y: number };
type Connection = { key: number; path: string; from: Point; to: Point };

function connect(key: number, from: Point, to: Point): Connection {
  const middle = (from.x + to.x) / 2;
  const radius = Math.min(8, (to.x - from.x) / 4, Math.abs(to.y - from.y) / 2);
  const direction = Math.sign(to.y - from.y);
  // Keep the same commands when a bend flattens or changes direction.
  const path = `M ${from.x} ${from.y} H ${middle - radius} Q ${middle} ${from.y} ${middle} ${from.y + direction * radius} V ${to.y - direction * radius} Q ${middle} ${to.y} ${middle + radius} ${to.y} H ${to.x}`;
  return { key, path, from, to };
}

export type CascadeSegment = {
  from: string;
  to: string;
  fromOffset?: number;
  toOffset: number;
};

export function CascadeConnections({ container, selection, segments }: {
  container: RefObject<HTMLDivElement | null>;
  selection: string;
  segments: readonly CascadeSegment[];
}) {
  const [geometry, setGeometry] = useState<{ connections: Connection[]; animate: boolean }>({ connections: [], animate: false });
  const measuredSelection = useRef(selection);
  const reducedMotion = useReducedMotion();
  const frame = useRef(0);

  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const anchors = segments.flatMap((segment, key) => {
      const from = root.querySelector<HTMLElement>(segment.from);
      const to = root.querySelector<HTMLElement>(segment.to);
      return from && to ? [{ ...segment, key, from, to }] : [];
    });

    const measure = () => {
      const bounds = root.getBoundingClientRect();
      const project = (x: number, y: number): Point => ({ x: x - bounds.left, y: y - bounds.top });
      const next = anchors.flatMap(anchor => {
        const from = anchor.from.getBoundingClientRect();
        const to = anchor.to.getBoundingClientRect();
        const destination = to.top + anchor.toOffset;
        if (!from.width || !to.width || to.left <= from.right || destination < 0 || to.top >= window.innerHeight) return [];
        return [connect(anchor.key, project(from.right, from.top + (anchor.fromOffset ?? from.height / 2)), project(to.left, destination))];
      });
      const animate = measuredSelection.current !== selection;
      measuredSelection.current = selection;
      setGeometry(current =>
        current.connections.length === next.length && current.connections.every((line, index) => line.key === next[index].key && line.path === next[index].path)
          ? current
          : { connections: next, animate },
      );
    };

    function schedule() {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(measure);
    }

    const observer = new ResizeObserver(schedule);
    observer.observe(root);
    for (const anchor of anchors) {
      observer.observe(anchor.from);
      observer.observe(anchor.to);
    }
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    schedule();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule, true);
      cancelAnimationFrame(frame.current);
    };
  }, [container, segments, selection]);

  const transition = { duration: geometry.animate && !reducedMotion ? 0.36 : 0, ease: "easeInOut" as const };

  return <svg aria-hidden="true" className={styles.connections}>
    {geometry.connections.map(({ key, path, from, to }) => (
      <g key={key}>
        <motion.path className={styles.connectionTrack} initial={false} animate={{ d: path }} transition={transition} />
        <motion.path className={styles.connectionSignal} initial={false} animate={{ d: path }} transition={transition} pathLength={100} />
        <motion.rect className={styles.connectionPort} initial={false} animate={{ x: from.x - 2, y: from.y - 2 }} transition={transition} width={4} height={4} />
        <motion.rect className={styles.connectionPort} initial={false} animate={{ x: to.x - 3, y: to.y - 3 }} transition={transition} width={6} height={6} />
      </g>
    ))}
  </svg>;
}
