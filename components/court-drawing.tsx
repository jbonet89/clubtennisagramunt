"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";

export function CourtDrawing({
  surface = "clay",
  decorative = false,
  label,
}: {
  surface?: "clay" | "quick";
  decorative?: boolean;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const rotate = useTransform(scrollYProgress, [0, 1], [-8, 7]);
  const y = useTransform(scrollYProgress, [0, 1], [30, -30]);
  const pattern = `grain-${surface}-${decorative}`;
  return (
    <div ref={ref} className={`court-drawing court-${surface}`}>
      <motion.div
        className="court-stage"
        style={reducedMotion ? { rotate: 0, y: 0 } : { rotate, y }}
      >
        <svg
          viewBox="0 0 500 660"
          role={decorative ? undefined : "img"}
          aria-label={decorative ? undefined : label}
          aria-hidden={decorative ? true : undefined}
        >
          <defs>
            <pattern
              id={pattern}
              width="7"
              height="7"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="2" r=".6" fill="white" opacity=".12" />
              <circle cx="5" cy="6" r=".5" fill="black" opacity=".08" />
            </pattern>
          </defs>
          <rect
            x="4"
            y="4"
            width="492"
            height="652"
            rx="5"
            className="court-surround"
          />
          <rect
            x="70"
            y="80"
            width="360"
            height="500"
            className="court-surface"
          />
          <rect
            x="4"
            y="4"
            width="492"
            height="652"
            rx="5"
            fill={`url(#${pattern})`}
          />
          <g fill="none" stroke="#fffef4" strokeWidth="3" opacity=".95">
            <path d="M70 80H430V580H70ZM115 80V580M385 80V580M115 205H385M115 455H385M250 205V455" />
            <path d="M250 80V88M250 572V580" />
          </g>
          <g stroke="#f7f8ef" strokeWidth="1" opacity=".5">
            {Array.from({ length: 10 }, (_, i) => (
              <path key={i} d={`M48 ${321 + i * 2}H452`} />
            ))}
          </g>
          <path d="M47 320H453" stroke="#142341" strokeWidth="5" />
          <path d="M47 319H453" stroke="white" strokeWidth="2" />
          <circle cx="47" cy="330" r="5" fill="#142341" />
          <circle cx="453" cy="330" r="5" fill="#142341" />
          <circle cx="324" cy="478" r="11" fill="#c9e94c" />
          <path
            d="M318 469Q327 478 318 487M330 469Q321 478 330 487"
            stroke="#f9ffdc"
            fill="none"
            strokeWidth="1.5"
          />
        </svg>
      </motion.div>
    </div>
  );
}
