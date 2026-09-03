import Link from "next/link";
import type { LaunchpadApp } from "@/lib/apps";

/**
 * Launchpad tile: full-card link with a squircle icon tile, app name, and a
 * two-line description snippet. Base surface/border/radius live on the
 * `.launchpad-tile` class in globals.css so the hover lift/tint can sit in a
 * `prefers-reduced-motion` guarded rule; layout stays inline.
 */
export function LaunchpadTile({ app }: { app: LaunchpadApp }) {
  return (
    <Link
      href={app.href}
      className="launchpad-tile"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        padding: "1.25rem 0.75rem",
        textDecoration: "none",
        color: "var(--color-ink)",
      }}
    >
      <div
        style={{
          width: "3.25rem",
          height: "3.25rem",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "var(--radius-lg)",
          background: "var(--color-accent-soft)",
          color: "var(--color-accent)",
        }}
      >
        {app.icon}
      </div>
      <div
        style={{
          fontSize: "0.85rem",
          fontWeight: 500,
          color: "var(--color-ink)",
          textAlign: "center",
          lineHeight: 1.4,
        }}
      >
        {app.name}
      </div>
      <div
        style={{
          fontSize: "0.74rem",
          color: "var(--color-muted)",
          textAlign: "center",
          lineHeight: 1.5,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {app.description}
      </div>
    </Link>
  );
}

/**
 * Launchpad section: hairline-framed uppercase label over a responsive
 * centered grid of tiles.
 */
export function LaunchpadSection({
  title,
  apps,
}: {
  title: string;
  apps: LaunchpadApp[];
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          maxWidth: "18rem",
          margin: "0 auto 1.25rem",
        }}
      >
        <span style={{ flex: 1, height: 1, background: "var(--color-line)" }} />
        <span
          style={{
            fontSize: "0.72rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--color-accent)",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </span>
        <span style={{ flex: 1, height: 1, background: "var(--color-line)" }} />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))",
          gap: "0.85rem",
        }}
      >
        {apps.map((app) => (
          <LaunchpadTile key={app.key} app={app} />
        ))}
      </div>
    </div>
  );
}
