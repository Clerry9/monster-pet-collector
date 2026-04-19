import { Link } from "react-router-dom";

const Terms = () => (
  <main className="min-h-screen bg-background text-foreground px-4 py-10">
    <article className="mx-auto max-w-3xl space-y-6">
      <Link to="/" className="text-sm text-primary underline">← Back to game</Link>
      <h1 className="font-display text-4xl text-primary">Terms of Service</h1>
      <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">1. Acceptance</h2>
        <p>By creating an account or playing, you agree to these Terms. If you do not agree, do not use the service.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">2. Your Account</h2>
        <p>You must be at least 13 (or the age of digital consent in your country). You are responsible for safeguarding your credentials and for all activity under your account.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">3. Virtual Items</h2>
        <p>Coins, dice, cards, and other in-game items have no real-world value, are non-transferable, and are licensed (not sold) to you for personal use within the game.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">4. Purchases</h2>
        <p>Payments are processed by third parties (e.g., Paddle). All sales are final — see our <Link to="/refund" className="text-primary underline">Refund Policy</Link>.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">5. Termination</h2>
        <p>We may suspend or terminate accounts that violate these Terms or our <Link to="/acceptable-use" className="text-primary underline">Acceptable Use Policy</Link>.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">6. Disclaimer</h2>
        <p>The service is provided "as is" without warranties of any kind. We are not liable for indirect, incidental, or consequential damages to the maximum extent permitted by law.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">7. Changes</h2>
        <p>We may update these Terms; continued use after changes means acceptance.</p>
      </section>
    </article>
  </main>
);

export default Terms;
