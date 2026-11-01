"use client";

import { useState } from "react";
import { ArrowUpRight, Clock3, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourtDrawing } from "./court-drawing";

type Labels = {
  selector: string;
  clay: string;
  quick: string;
  clayTag: string;
  quickTag: string;
  clayTitle: string;
  quickTitle: string;
  clayBody: string;
  quickBody: string;
  duration: string;
  member: string;
  ask: string;
  notice: string;
  illustration: string;
};

export function CourtSelector({ labels }: { labels: Labels }) {
  const [surface, setSurface] = useState<"clay" | "quick">("clay");
  const clay = surface === "clay";
  return (
    <div className="court-explorer">
      <div
        className={`explorer-visual ${clay ? "explorer-clay" : "explorer-quick"}`}
      >
        <span className="surface-number" aria-hidden="true">
          {clay ? "03" : "04"}
        </span>
        <CourtDrawing surface={surface} label={labels.illustration} />
        <span className="diagram-label">
          {clay ? labels.clayTag : labels.quickTag}
        </span>
      </div>
      <div className="explorer-content">
        <div
          className="surface-selector"
          role="group"
          aria-label={labels.selector}
        >
          <Button
            variant="outline"
            aria-pressed={clay}
            onClick={() => setSurface("clay")}
          >
            {labels.clay}
          </Button>
          <Button
            variant="outline"
            aria-pressed={!clay}
            onClick={() => setSurface("quick")}
          >
            {labels.quick}
          </Button>
        </div>
        <div
          aria-live="polite"
          aria-atomic="true"
          className="surface-description"
        >
          <p className="eyebrow">{clay ? labels.clayTag : labels.quickTag}</p>
          <h3>{clay ? labels.clayTitle : labels.quickTitle}</h3>
          <p>{clay ? labels.clayBody : labels.quickBody}</p>
        </div>
        <ul className="court-facts">
          <li>
            <Clock3 size={18} aria-hidden="true" />
            {labels.duration}
          </li>
          <li>
            <KeyRound size={18} aria-hidden="true" />
            {labels.member}
          </li>
        </ul>
        <a className="text-link" href="#contact">
          {labels.ask}
          <ArrowUpRight size={20} aria-hidden="true" />
        </a>
        <p className="booking-notice">{labels.notice}</p>
      </div>
    </div>
  );
}
