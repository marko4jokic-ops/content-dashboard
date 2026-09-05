const steps = [
  {
    title: "Create an env file",
    body: (
      <>
        In the project root, create a file called{" "}
        <code className="rounded bg-panel2 px-1.5 py-0.5 text-gold">
          .env.local
        </code>
        . You can copy the checked-in template:
        <pre className="mt-2 overflow-x-auto rounded-lg border border-edge bg-[#0b0b0d] p-3 text-xs text-dim scrollbar-thin">
          cp .env.local.example .env.local
        </pre>
      </>
    ),
  },
  {
    title: "Add your Windsor.ai key",
    body: (
      <>
        Paste your key into that file. It is read only on the server (in{" "}
        <code className="rounded bg-panel2 px-1.5 py-0.5 text-gold">
          /api/content
        </code>
        ) and is never sent to the browser.
        <pre className="mt-2 overflow-x-auto rounded-lg border border-edge bg-[#0b0b0d] p-3 text-xs text-dim scrollbar-thin">
          WINDSOR_API_KEY=your_windsor_api_key_here
        </pre>
      </>
    ),
  },
  {
    title: "Restart the dev server",
    body: (
      <>
        Stop and re-run{" "}
        <code className="rounded bg-panel2 px-1.5 py-0.5 text-gold">
          npm run dev
        </code>{" "}
        so Next.js picks up the new variable, then reload this page.
      </>
    ),
  },
];

export default function SetupScreen() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="glass rounded-3xl p-8 sm:p-10">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-gold-deep text-lg font-bold text-black">
            ◆
          </span>
          <div>
            <h1 className="text-lg font-semibold text-ink">Content Dashboard</h1>
            <p className="text-sm text-dim">Instagram analytics via Windsor.ai</p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-gold-deep/30 bg-gold-wash/30 p-4">
          <p className="text-sm text-gold">
            <span className="font-semibold">Almost there.</span> The{" "}
            <code className="rounded bg-black/30 px-1 py-0.5">
              WINDSOR_API_KEY
            </code>{" "}
            environment variable isn&apos;t set yet.
          </p>
        </div>

        <ol className="mt-8 space-y-6">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-edge-strong bg-panel2 text-xs font-semibold text-dim">
                {i + 1}
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-ink">{step.title}</h2>
                <div className="mt-1 text-sm leading-relaxed text-dim">
                  {step.body}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 border-t border-edge pt-5 text-xs text-faint">
          Don&apos;t have a key?{" "}
          <a
            href="https://windsor.ai"
            target="_blank"
            rel="noreferrer noopener"
            className="text-gold underline decoration-gold-deep/40 underline-offset-2 hover:decoration-gold"
          >
            Get one from windsor.ai
          </a>{" "}
          and connect an Instagram account.
        </div>
      </div>
    </div>
  );
}
