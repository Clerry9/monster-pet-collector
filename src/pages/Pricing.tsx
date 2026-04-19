import { Link } from "react-router-dom";

const tiers = [
  { name: "Starter Pack", price: "$1.99", desc: "200 coins + 5 bonus rolls" },
  { name: "Value Pack", price: "$4.99", desc: "600 coins + 20 bonus rolls" },
  { name: "Mega Pack", price: "$9.99", desc: "1,400 coins + 50 bonus rolls" },
  { name: "Star Pack", price: "$14.99", desc: "Premium dice tier + 100 coins" },
  { name: "Season Pass", price: "$4.99", desc: "Unlock all season rewards for the current season" },
];

const Pricing = () => (
  <main className="min-h-screen bg-background text-foreground px-4 py-10">
    <article className="mx-auto max-w-3xl space-y-6">
      <Link to="/" className="text-sm text-primary underline">← Back to game</Link>
      <h1 className="font-display text-4xl text-primary">Pricing</h1>
      <p className="text-muted-foreground">All prices shown in USD. Local currency, taxes, and VAT are calculated at checkout. The game is free to play; purchases are optional.</p>

      <div className="space-y-3">
        {tiers.map((t) => (
          <div key={t.name} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
            <div>
              <h2 className="text-lg font-semibold">{t.name}</h2>
              <p className="text-sm text-muted-foreground">{t.desc}</p>
            </div>
            <div className="font-display text-2xl text-primary">{t.price}</div>
          </div>
        ))}
      </div>

      <section className="space-y-3 pt-4">
        <h2 className="text-2xl font-semibold">Payment & Billing</h2>
        <p>Payments are processed securely by Paddle, our Merchant of Record. One-time purchases only — no subscriptions or auto-renewals. See our <Link to="/refund" className="text-primary underline">Refund Policy</Link> and <Link to="/terms" className="text-primary underline">Terms of Service</Link>.</p>
      </section>

      <p className="text-xs text-muted-foreground">Prices and pack contents may change. The Shop tab inside the game always reflects current live pricing.</p>
    </article>
  </main>
);

export default Pricing;
