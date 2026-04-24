import { Link } from "react-router-dom";

const Terms = () => (
  <main className="min-h-screen bg-background text-foreground px-4 py-10">
    <article className="mx-auto max-w-3xl space-y-6">
      <Link to="/" className="text-sm text-primary underline">← Back to game</Link>
      <h1 className="font-display text-4xl text-primary">Terms of Service</h1>
      <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">1. Acceptance</h2>
        <p>These Terms of Service ("Terms") form a binding agreement between you and <strong>JAC Consulting</strong> ("we", "us", "our"), the operator of this game. By creating an account, accessing, or playing the game, you agree to these Terms. If you do not agree, do not use the service.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">2. Your Account</h2>
        <p>You must be at least 13 (or the age of digital consent in your country). You are responsible for safeguarding your credentials and for all activity under your account.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">3. Virtual Items & In-Game Purchases</h2>
        <p>Coins, gems, dice, cards, season passes, bundles, and other in-game items (collectively, "Virtual Items") have no real-world monetary value, cannot be redeemed for cash, and are non-transferable. Virtual Items are licensed (not sold) to you for personal, non-commercial use within the game. We may modify, suspend, or discontinue any Virtual Item at any time. Purchases of Virtual Items are immediately delivered to your account upon successful payment confirmation.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">4. Purchases</h2>
        <p>Our order process is conducted by our online reseller <strong>Paddle.com</strong>. Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer service inquiries and handles returns. Payment, billing, tax, cancellation, and refund mechanics are governed by the <a className="text-primary underline" href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noreferrer">Paddle Buyer Terms</a>. See our <Link to="/refund" className="text-primary underline">Refund Policy</Link> for details.</p>
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

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">8. Contact</h2>
        <p>Questions about these Terms? Contact JAC Consulting at <a className="text-primary underline" href="mailto:MPetCinfo@proton.me">MPetCinfo@proton.me</a>.</p>
      </section>
    </article>
  </main>
);

export default Terms;
