import { Link } from "react-router-dom";

const Refund = () => (
  <main className="min-h-screen bg-background text-foreground px-4 py-10">
    <article className="mx-auto max-w-3xl space-y-6">
      <Link to="/" className="text-sm text-primary underline">← Back to game</Link>
      <h1 className="font-display text-4xl text-primary">Refund Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">No-Refund Policy</h2>
        <p>All purchases of virtual items (coins, dice tiers, card packs, season passes, etc.) are <strong>final and non-refundable</strong>. Once delivered to your account, virtual items cannot be returned, exchanged, or converted to real currency.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Statutory Exceptions</h2>
        <p>Where required by law (e.g., EU/UK consumer rights for faulty digital content, or chargebacks for unauthorized payments), we will honor your statutory rights. Contact <a className="text-primary underline" href="mailto:support@example.com">support@example.com</a> within 14 days of purchase with your transaction ID.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Failed Deliveries</h2>
        <p>If you were charged but did not receive the items, contact support and we will either deliver the items or issue a refund of that specific transaction.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Account Termination</h2>
        <p>Accounts terminated for violating our <Link to="/acceptable-use" className="text-primary underline">Acceptable Use Policy</Link> are not eligible for refunds of unused virtual items.</p>
      </section>
    </article>
  </main>
);

export default Refund;
