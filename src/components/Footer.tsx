import { forwardRef } from "react";
import { Link } from "react-router-dom";

export const Footer = forwardRef<HTMLElement>((_props, ref) => (
  <footer ref={ref} className="mt-8 border-t border-border/40 px-4 py-6">
    <nav className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      <Link to="/privacy" className="hover:text-primary hover:underline">Privacy</Link>
      <span aria-hidden>·</span>
      <Link to="/terms" className="hover:text-primary hover:underline">Terms</Link>
      <span aria-hidden>·</span>
      <Link to="/refund" className="hover:text-primary hover:underline">Refunds</Link>
      <span aria-hidden>·</span>
      <Link to="/acceptable-use" className="hover:text-primary hover:underline">Acceptable Use</Link>
      <span aria-hidden>·</span>
      <Link to="/pricing" className="hover:text-primary hover:underline">Pricing</Link>
    </nav>
    <p className="mt-2 text-center text-[10px] text-muted-foreground">
      © {new Date().getFullYear()} · All rights reserved
    </p>
  </footer>
));
Footer.displayName = "Footer";
