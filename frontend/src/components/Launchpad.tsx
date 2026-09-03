import Link from "next/link";
import type { LaunchpadApp } from "@/lib/apps";

/**
 * Launchpad directory row: square icon tile, app name, one-line description.
 * Rows live in a hairline card list, like an internal tools directory.
 */
export function LaunchpadTile({ app }: { app: LaunchpadApp }) {
  return (
    <li>
      <Link
        href={app.href}
        className="launchpad-row-link"
        style={{
          textDecoration: "none",
          color: "var(--color-ink)",
        }}
      >
        <span className="launchpad-row-icon">{app.icon}</span>
        <span className="launchpad-row-name">{app.name}</span>
        <span className="launchpad-row-desc">{app.description}</span>
        <span className="launchpad-row-arrow" aria-hidden="true">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </span>
      </Link>
    </li>
  );
}

/**
 * Launchpad section: uppercase label over a hairline card list of rows.
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
      <div className="launchpad-head">
        <span className="launchpad-head-label">{title}</span>
        <span className="launchpad-head-rule" aria-hidden="true" />
      </div>
      <div
        className="panel-card"
        style={{ padding: 0, overflow: "hidden" }}
      >
        <ul className="launchpad-list">
          {apps.map((app) => (
            <LaunchpadTile key={app.key} app={app} />
          ))}
        </ul>
      </div>
    </div>
  );
}
