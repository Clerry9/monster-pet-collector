import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import AuthPage from "./pages/Auth";
import ResetPasswordPage from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Refund from "./pages/Refund";
import AcceptableUse from "./pages/AcceptableUse";
import Pricing from "./pages/Pricing";
import PurchaseHistory from "./pages/PurchaseHistory";
import AdminRewards from "./pages/AdminRewards";
import AdminPackAnalytics from "./pages/AdminPackAnalytics";
import AdminCosmetics from "./pages/AdminCosmetics";
import Achievements from "./pages/Achievements";
import { CookieConsent } from "./components/CookieConsent";
import { ErrorBoundary } from "./components/ErrorBoundary";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="font-display text-2xl text-primary text-glow-green animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  // Preserve the page the user was trying to reach so we can return them
  // there after a successful sign-in.
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  return <>{children}</>;
}

function AuthRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (user) {
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    return <Navigate to={from && from !== "/auth" ? from : "/"} replace />;
  }
  return <AuthPage />;
}

const App = () => (
  <ErrorBoundary
    title="Application error"
    message="The app hit a runtime error. Reload the page to clear any stale app bundle and try again."
  >
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route
              path="/auth"
              element={
                <ErrorBoundary
                  title="Authentication page error"
                  message="The sign-in page hit a runtime error. Reload the page to clear any stale app bundle and try again."
                >
                  <AuthRoute />
                </ErrorBoundary>
              }
            />
            <Route
              path="/reset-password"
              element={
                <ErrorBoundary
                  title="Reset password error"
                  message="The reset-password page hit a runtime error. Reload to try again."
                >
                  <ResetPasswordPage />
                </ErrorBoundary>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/refund" element={<Refund />} />
            <Route path="/acceptable-use" element={<AcceptableUse />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route
              path="/purchases"
              element={
                <ProtectedRoute>
                  <PurchaseHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/rewards"
              element={
                <ProtectedRoute>
                  <AdminRewards />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/pack-analytics"
              element={
                <ProtectedRoute>
                  <AdminPackAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/cosmetics"
              element={
                <ProtectedRoute>
                  <AdminCosmetics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/achievements"
              element={
                <ProtectedRoute>
                  <Achievements />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CookieConsent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </ErrorBoundary>
);

export default App;
