import { Link } from "react-router-dom";

const Refund = () => (
  <main className="min-h-screen bg-background text-foreground px-4 py-10">
    <article className="mx-auto max-w-3xl space-y-6">
      <Link to="/" className="text-sm text-primary underline">← Back to game</Link>
      <h1 className="font-display text-4xl text-primary">Refund Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">30-Day Money-Back Guarantee</h2>
        <p>We offer a <strong>30-day money-back guarantee</strong> on all in-game purchases (coins, gems, dice tiers, card packs, season passes, bundles, etc.). If you are not satisfied with your purchase, you may request a full refund within 30 days of the order date.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">How to Request a Refund</h2>
        <p>Refunds are processed by our payment provider, <strong>Paddle</strong>, the Merchant of Record for all transactions. To request a refund, visit <a className="text-primary underline" href="https://paddle.net" target="_blank" rel="noreferrer">paddle.net</a> and submit your request using the email address used at checkout. As Merchant of Record, Paddle handles refund decisions in line with the <a className="text-primary underline" href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noreferrer">Paddle Refund Policy</a>. You can also contact us at <a className="text-primary underline" href="mailto:MPetCinfo@proton.me">MPetCinfo@proton.me</a> for assistance.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Failed Deliveries</h2>
        <p>If you were charged but did not receive the items, contact support and we will either deliver the items or issue a refund of that specific transaction.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Statutory Rights</h2>
        <p>Nothing in this policy limits your statutory rights under applicable consumer protection law (e.g., EU/UK rights for faulty digital content). Accounts terminated for violating our <Link to="/acceptable-use" className="text-primary underline">Acceptable Use Policy</Link> are not eligible for refunds of unused virtual items beyond the statutory minimums.</p>
      </section>
    </article>
  </main>
);

export default Refund;
