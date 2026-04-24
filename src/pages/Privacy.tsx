import { Link } from "react-router-dom";

const Privacy = () => (
  <main className="min-h-screen bg-background text-foreground px-4 py-10">
    <article className="mx-auto max-w-3xl space-y-6">
      <Link to="/" className="text-sm text-primary underline">← Back to game</Link>
      <h1 className="font-display text-4xl text-primary">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">1. Who We Are (Data Controller)</h2>
        <p><strong>JAC Consulting</strong> is the data controller responsible for the personal data processed through this game. You can reach us at <a className="text-primary underline" href="mailto:MPetCinfo@proton.me">MPetCinfo@proton.me</a> for any privacy-related questions or requests.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">2. Information We Collect</h2>
        <p>We collect: (a) <strong>account data</strong> — email address, password hash, optional display name; (b) <strong>gameplay data</strong> — coins, levels, cards, achievements, purchase history; (c) <strong>technical data</strong> — IP address, device identifiers, browser type, operating system, log data; (d) <strong>support communications</strong> — messages you send us.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">3. How We Use It & Legal Basis</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li><strong>Provide the service</strong> (account creation, syncing game state, delivering purchases) — legal basis: performance of a contract.</li>
          <li><strong>Process payments</strong> via our Merchant of Record — legal basis: performance of a contract and legal obligation.</li>
          <li><strong>Security, fraud prevention, and abuse detection</strong> — legal basis: legitimate interests.</li>
          <li><strong>Product improvement and analytics</strong> — legal basis: legitimate interests (or consent where required).</li>
          <li><strong>Customer support</strong> — legal basis: performance of a contract / legitimate interests.</li>
          <li><strong>Marketing communications</strong> — legal basis: consent (you can withdraw at any time).</li>
        </ul>
        <p>We do not sell personal data.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">4. Cookies & Advertising</h2>
        <p>We use cookies for authentication and analytics. Third-party ad partners (Google AdSense, CrazyGames, AdMob) may use cookies and device identifiers to serve personalized or non-personalized ads. You can opt out via <a className="text-primary underline" href="https://adssettings.google.com" target="_blank" rel="noreferrer">Google Ads Settings</a>.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">5. Data Sharing</h2>
        <p>We share personal data only with the following categories of recipients, under appropriate contractual safeguards:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li><strong>Hosting & infrastructure providers</strong> — to operate the game and store data.</li>
          <li><strong>Paddle.com</strong> — our Merchant of Record for the sale of in-game items, subscription management, payment processing, tax compliance, and invoicing. Paddle acts as an independent controller for payment data.</li>
          <li><strong>Analytics and advertising partners</strong> — Google AdSense, CrazyGames, AdMob, and similar providers.</li>
          <li><strong>Professional advisers</strong> — legal, accounting, and compliance advisers when needed.</li>
          <li><strong>Authorities</strong> — where required by law, court order, or to protect our rights.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">6. Data Retention</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li><strong>Account & gameplay data</strong> — retained while your account is active and for up to 24 months after account closure, then deleted or anonymised.</li>
          <li><strong>Purchase and transaction records</strong> — retained for up to 7 years to meet tax and accounting obligations.</li>
          <li><strong>Support communications</strong> — retained for up to 24 months after the issue is resolved.</li>
          <li><strong>Server logs and security data</strong> — retained for up to 12 months.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">7. Security</h2>
        <p>We apply appropriate technical and organisational measures to protect your data, including encryption in transit (TLS), encryption at rest, access controls and least-privilege permissions, hashed passwords, regular backups, and monitoring for unauthorised access. No system is perfectly secure, but we work to maintain industry-standard protections.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">8. Your Rights</h2>
        <p>Depending on where you live, you may have the right to access, correct, delete, restrict, or port your personal data, to object to processing, or to withdraw consent. EU/UK users have GDPR rights, including the right to lodge a complaint with a supervisory authority. California users have CCPA rights including the right to know, delete, and opt out of "sale" of personal information (we do not sell data). To exercise any right, email <a className="text-primary underline" href="mailto:MPetCinfo@proton.me">MPetCinfo@proton.me</a>; we respond within one month.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">9. Children</h2>
        <p>The game is not directed to children under 13. We do not knowingly collect data from them.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">10. Contact</h2>
        <p>Questions? Email JAC Consulting at <a className="text-primary underline" href="mailto:MPetCinfo@proton.me">MPetCinfo@proton.me</a>.</p>
      </section>
    </article>
  </main>
);

export default Privacy;
