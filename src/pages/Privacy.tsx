import { Link } from "react-router-dom";

const Privacy = () => (
  <main className="min-h-screen bg-background text-foreground px-4 py-10">
    <article className="mx-auto max-w-3xl space-y-6">
      <Link to="/" className="text-sm text-primary underline">← Back to game</Link>
      <h1 className="font-display text-4xl text-primary">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">1. Information We Collect</h2>
        <p>We collect the email address you provide at sign-up, an optional display name, and gameplay data (coins, levels, cards, purchases) needed to save your progress.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">2. How We Use It</h2>
        <p>To run your account, sync game state across devices, process purchases, and prevent abuse. We do not sell personal data.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">3. Cookies & Advertising</h2>
        <p>We use cookies for authentication and analytics. Third-party ad partners (Google AdSense, CrazyGames, AdMob) may use cookies and device identifiers to serve personalized or non-personalized ads. You can opt out via <a className="text-primary underline" href="https://adssettings.google.com" target="_blank" rel="noreferrer">Google Ads Settings</a>.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">4. Data Sharing</h2>
        <p>We share data only with service providers who help run the game (hosting, payments, ads) under contract. We disclose data when required by law.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">5. Your Rights</h2>
        <p>You may request access, correction, or deletion of your data at any time by contacting us. EU/UK users have GDPR rights; California users have CCPA rights.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">6. Children</h2>
        <p>The game is not directed to children under 13. We do not knowingly collect data from them.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">7. Contact</h2>
        <p>Questions? Email <a className="text-primary underline" href="mailto:support@example.com">support@example.com</a>.</p>
      </section>
    </article>
  </main>
);

export default Privacy;
