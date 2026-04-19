import { Link } from "react-router-dom";

const AcceptableUse = () => (
  <main className="min-h-screen bg-background text-foreground px-4 py-10">
    <article className="mx-auto max-w-3xl space-y-6">
      <Link to="/" className="text-sm text-primary underline">← Back to game</Link>
      <h1 className="font-display text-4xl text-primary">Acceptable Use Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

      <p>To keep the game fair and safe for everyone, you agree not to:</p>

      <ul className="list-disc space-y-2 pl-6">
        <li>Cheat, exploit bugs, use bots, scripts, modified clients, or any automation to gain coins, cards, or progress.</li>
        <li>Buy, sell, trade, or transfer accounts, virtual items, or in-game currency outside the official game.</li>
        <li>Reverse-engineer, decompile, or tamper with the game client, network traffic, or backend.</li>
        <li>Harass, threaten, dox, or impersonate other players, staff, or third parties.</li>
        <li>Post or transmit unlawful, hateful, sexually explicit, or otherwise objectionable content.</li>
        <li>Use the service to distribute malware, phishing links, or spam.</li>
        <li>Attempt to access another user's account or any system you are not authorized to access.</li>
        <li>Use chargebacks or fraudulent payment methods. Confirmed payment fraud results in a permanent ban.</li>
        <li>Violate any applicable law or the rights of others.</li>
      </ul>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Enforcement</h2>
        <p>Violations may result in warnings, removal of items, temporary suspension, or permanent account termination — at our sole discretion and without refund (see <Link to="/refund" className="text-primary underline">Refund Policy</Link>).</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Reporting</h2>
        <p>Report violations to <a className="text-primary underline" href="mailto:support@example.com">support@example.com</a> with as much detail as possible (usernames, timestamps, screenshots).</p>
      </section>
    </article>
  </main>
);

export default AcceptableUse;
