"use client";
import { useState } from "react";
import { regulatorByCode } from "@/lib/regulators";

interface RegulatorMarkProps {
  code: string;
  size?: number;
  withName?: boolean;
  link?: boolean;
  /** When set, the logo is rendered without the fixed-size frame so a parent
      container can size it via classes (e.g. `max-h-full max-w-full
      object-contain`). Inline height/width styles are dropped in this mode. */
  imgClassName?: string;
}

const LOGO_FILTER =
  "brightness(0) invert(1) sepia(1) saturate(3.5) hue-rotate(82deg) brightness(0.4)";

export default function RegulatorMark({
  code,
  size = 20,
  withName = false,
  link = true,
  imgClassName,
}: RegulatorMarkProps) {
  const meta = regulatorByCode(code);
  const [failed, setFailed] = useState(false);
  const showLogo = !!meta?.logo && !failed;

  const mark = imgClassName
    ? showLogo
      ? (
          <img
            src={meta!.logo!}
            alt={meta!.name}
            className={imgClassName}
            style={{ filter: LOGO_FILTER }}
            onError={() => setFailed(true)}
          />
        )
      : (
          <span className="reg-mark-tile">
            {meta ? meta.tile : code.slice(0, 4).toUpperCase()}
          </span>
        )
    : showLogo
      ? (
          <span className="reg-mark" style={{ height: size }}>
            <img
              src={meta!.logo!}
              alt={meta!.name}
              height={size}
              width={size * 3}
              style={{
                height: size,
                width: "auto",
                maxWidth: "9rem",
                filter: LOGO_FILTER,
              }}
              onError={() => setFailed(true)}
            />
          </span>
        )
      : (
          <span
            className="reg-mark-tile"
            style={{
              height: size,
              fontSize: Math.max(0.56, Math.round(size * 0.45)) / 16 + "rem",
            }}
          >
            {meta ? meta.tile : code.slice(0, 4).toUpperCase()}
          </span>
        );

  const inner = (
    <>
      {mark}
      {withName && showLogo && (
        <span className="reg-mark-name">{meta ? meta.code : code}</span>
      )}
    </>
  );

  // In imgClassName mode the wrapper stretches to the container so the img's
  // percentage max sizes resolve against the logo box, not the wrapper.
  const wrapperStyle = imgClassName ? { height: "100%" } : undefined;

  if (link && meta) {
    return (
      <a
        className="reg-mark-link"
        style={wrapperStyle}
        href={meta.url}
        target="_blank"
        rel="noopener noreferrer"
        title={meta.name}
      >
        {inner}
      </a>
    );
  }
  return <span className="reg-mark-link" style={wrapperStyle}>{inner}</span>;
}
