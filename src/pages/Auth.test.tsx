import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AuthPage from "./Auth";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

const signInAnonymouslyMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInAnonymously: (...args: unknown[]) => signInAnonymouslyMock(...args),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { error: (...a: unknown[]) => toastError(...a), success: (...a: unknown[]) => toastSuccess(...a) }),
}));

vi.mock("@/lib/authErrors", () => ({ reportAuthError: vi.fn() }));
vi.mock("@/integrations/lovable/index", () => ({ lovable: { auth: { signInWithOAuth: vi.fn() } } }));
vi.mock("@/components/Footer", () => ({ Footer: () => null }));

function renderAuth() {
  return render(
    <MemoryRouter>
      <AuthPage />
    </MemoryRouter>
  );
}

describe("Auth: Play as Guest button", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    signInAnonymouslyMock.mockReset();
    toastError.mockReset();
    toastSuccess.mockReset();
  });

  it("shows loading state and disables during sign-in, then navigates on success", async () => {
    let resolveSignIn!: (v: { error: null }) => void;
    signInAnonymouslyMock.mockImplementation(
      () => new Promise((res) => { resolveSignIn = res; })
    );

    renderAuth();
    const btn = screen.getByRole("button", { name: /play as guest/i });
    expect(btn).not.toBeDisabled();

    fireEvent.click(btn);

    // Loading state
    const loadingBtn = await screen.findByRole("button", { name: /starting guest session/i });
    expect(loadingBtn).toBeDisabled();
    expect(loadingBtn).toHaveAttribute("aria-busy", "true");

    // Resolve the sign-in
    await act(async () => {
      resolveSignIn({ error: null });
    });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });
    });
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("shows a clear error message and re-enables on failure", async () => {
    signInAnonymouslyMock.mockResolvedValue({ error: new Error("network fail") });

    renderAuth();
    const btn = screen.getByRole("button", { name: /play as guest/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        expect.stringMatching(/couldn't start guest session/i)
      );
    });
    // Button is re-enabled after failure
    const reEnabled = await screen.findByRole("button", { name: /play as guest/i });
    expect(reEnabled).not.toBeDisabled();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});