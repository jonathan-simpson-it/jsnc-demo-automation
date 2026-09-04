import Link from "next/link";

export default function PitchBand() {
  return (
    <section
      className="flex w-full flex-col items-center justify-center rounded-2xl border border-neutral-200/80 bg-white p-10 text-center shadow-sm md:p-12"
      style={{ marginTop: "clamp(2rem, 5vw, 3.5rem)" }}
    >
      <p className="mb-2 text-xs font-mono uppercase tracking-wider text-neutral-500">
        Built by Jonathan Simpson &amp; Co.
      </p>
      <h2 className="mb-3 text-xl font-bold text-neutral-900 md:text-2xl">
        This platform can be built for your firm.
      </h2>
      <p className="mx-auto mb-6 max-w-xl text-sm leading-relaxed text-neutral-600">
        We design, build, and deploy bespoke AI systems for regulated financial
        firms: grounded answers, human-in-the-loop review, and audit-ready
        trails, engineered around your documents and your regulators.
      </p>
      <div className="flex w-full items-center justify-center gap-3">
        <Link
          className="rounded-lg bg-neutral-900 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-neutral-800"
          href="/contact"
        >
          Start a project
        </Link>
        <a
          className="rounded-lg border border-neutral-300 bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-800 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
          href="https://www.linkedin.com/company/jonathan-simpson-co"
        >
          Talk on LinkedIn
        </a>
      </div>
    </section>
  );
}