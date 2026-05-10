import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TutorialCoachmark, type CoachStep } from "./TutorialCoachmark";

const steps: CoachStep[] = [
  { title: "Welcome", body: "Step one body" },
  { title: "Second", body: "Step two body" },
  { title: "Last", body: "Step three body" },
];

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe("TutorialCoachmark", () => {
  it("renders the active step with dialog semantics", () => {
    render(<TutorialCoachmark open steps={steps} onClose={vi.fn()} onFinish={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "coach-title");
    expect(screen.getByText("Welcome")).toBeInTheDocument();
    expect(screen.getByText("Step one body")).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 3/i)).toBeInTheDocument();
  });

  it("ArrowRight / Enter advance and ArrowLeft goes back", () => {
    render(<TutorialCoachmark open steps={steps} onClose={vi.fn()} onFinish={vi.fn()} />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("Second")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByText("Last")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("Enter on the last step calls onFinish", () => {
    const onFinish = vi.fn();
    render(<TutorialCoachmark open startIndex={2} steps={steps} onClose={vi.fn()} onFinish={onFinish} />);
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onFinish).toHaveBeenCalled();
  });

  it("Escape calls onClose", () => {
    const onClose = vi.fn();
    render(<TutorialCoachmark open steps={steps} onClose={onClose} onFinish={vi.fn()} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("notifies onStepChange whenever the index changes", () => {
    const onStepChange = vi.fn();
    render(<TutorialCoachmark open steps={steps} onClose={vi.fn()} onFinish={vi.fn()} onStepChange={onStepChange} />);
    expect(onStepChange).toHaveBeenCalledWith(0, steps[0]);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(onStepChange).toHaveBeenCalledWith(1, steps[1]);
  });

  it("renders nothing when closed", () => {
    const { container } = render(<TutorialCoachmark open={false} steps={steps} onClose={vi.fn()} onFinish={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});