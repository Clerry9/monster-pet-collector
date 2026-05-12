import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dice3D, FACE_ROT } from "./Dice3D";

// Mock @react-three/fiber so the test runs without WebGL.
vi.mock("@react-three/fiber", () => {
  const Canvas = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="r3f-canvas">{children}</div>
  );
  // useFrame: never fires in tests — we only need the canvas + Cube tree to mount.
  const useFrame = (_cb: unknown) => {};
  return { Canvas, useFrame };
});

describe("Dice3D — server roll alignment", () => {
  describe("reduced-motion fallback", () => {
    for (let face = 1; face <= 6; face++) {
      it(`renders face ${face} as flat number`, () => {
        const { unmount } = render(<Dice3D value={face} reducedMotion />);
        const tile = screen.getByTestId("dice3d-face");
        expect(tile.textContent).toBe(String(face));
        expect(tile.getAttribute("aria-label")).toBe(`Dice showing ${face}`);
        unmount();
      });
    }
  });

  describe("normal mode mounts canvas with correct value", () => {
    for (let face = 1; face <= 6; face++) {
      it(`mounts canvas for face ${face} and exposes target rotation in FACE_ROT`, () => {
        const { unmount } = render(<Dice3D value={face} />);
        expect(screen.getByTestId("r3f-canvas")).toBeInTheDocument();
        expect(FACE_ROT[face]).toBeDefined();
        expect(FACE_ROT[face]).toHaveLength(3);
        unmount();
      });
    }
  });

  describe("re-render simulating server settle", () => {
    it("swaps from random tumble value to authoritative server steps", () => {
      // Simulate GameBoard pattern: random face during tumble, then server result.
      const { rerender } = render(<Dice3D value={3} reducedMotion />);
      expect(screen.getByTestId("dice3d-face").textContent).toBe("3");
      const serverSteps = 5;
      rerender(<Dice3D value={serverSteps} reducedMotion />);
      expect(screen.getByTestId("dice3d-face").textContent).toBe(String(serverSteps));
    });
  });
});