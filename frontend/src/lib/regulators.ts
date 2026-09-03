export interface RegulatorMeta {
  code: string;
  name: string;
  url: string;
  logo: string | null;
  tile: string;
}

export const REGULATORS: Record<string, RegulatorMeta> = {
  SFC: {
    code: "SFC",
    name: "Securities and Futures Commission (SFC)",
    url: "https://www.sfc.hk/en/",
    logo: "/pictures/sfc-logo.svg",
    tile: "SFC",
  },
  HKMA: {
    code: "HKMA",
    name: "Hong Kong Monetary Authority (HKMA)",
    url: "https://www.hkma.gov.hk/eng/",
    logo: "/pictures/hkma-logo.png",
    tile: "HKMA",
  },
  AMLO: {
    code: "AMLO",
    name: "Anti-Money Laundering and Counter-Terrorist Financing Ordinance (AMLO)",
    url: "https://www.elegislation.gov.hk/hk/cap615",
    logo: null,
    tile: "AMLO",
  },
};

export function regulatorByCode(code: string): RegulatorMeta | null {
  return REGULATORS[code.toUpperCase()] ?? null;
}

const FILENAME_RE = /^reg-(sfc|hkma)-/i;

export function regulatorForFilename(filename: string): RegulatorMeta | null {
  const m = FILENAME_RE.exec(filename);
  return m ? regulatorByCode(m[1]) : null;
}

export function regulatorInText(text: string): RegulatorMeta | null {
  for (const code of Object.keys(REGULATORS)) {
    const re = new RegExp(`\\b${code}\\b`, "i");
    if (re.test(text)) return REGULATORS[code];
  }
  return null;
}
