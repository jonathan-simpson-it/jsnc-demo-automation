"use client";
import { useState } from "react";
import { regulatorByCode } from "@/lib/regulators";

interface RegulatorMarkProps {
  code: string;
  size?: number;
  withName?: boolean;
  link?: boolean;
}

export default function RegulatorMark({
  code,
  size = 20,
  withName = false,
  link = true,
}: RegulatorMarkProps) {
  const meta = regulatorByCode(code);
  const [failed, setFailed] = useState(false);
  const showLogo = !!meta?.logo && !failed;

  const mark = showLogo ? (
    <span className="reg-mark" style={{ height: size }}>
      <img
        src={meta!.logo!}
        alt={meta!.name}
        height={size}
        width={size * 3}
        style={{ height: size, width: "auto", maxWidth: "9rem" }}
        onError={() => setFailed(true)}
      />
    </span>
  ) : (
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
      {withName && (
        <span className="reg-mark-name">{meta ? meta.code : code}</span>
      )}
    </>
  );

  if (link && meta) {
    return (
      <a
        className="reg-mark-link"
        href={meta.url}
        target="_blank"
        rel="noopener noreferrer"
        title={meta.name}
      >
        {inner}
      </a>
    );
  }
  return <span className="reg-mark-link">{inner}</span>;
}
