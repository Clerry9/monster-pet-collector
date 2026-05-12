/**
 * Slow-moving radial-gradient blobs as a global backdrop.
 * Pure CSS @keyframes so it stays cheap on mobile.
 * Hidden under prefers-reduced-motion.
 */
export function AnimatedBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden motion-reduce:hidden"
    >
      <div
        className="absolute -top-32 -left-32 w-[60vmin] h-[60vmin] rounded-full opacity-40 blur-3xl"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary) / 0.55), transparent 70%)",
          animation: "blob-float-a 22s ease-in-out infinite",
        }}
      />
      <div
        className="absolute top-1/3 -right-24 w-[55vmin] h-[55vmin] rounded-full opacity-30 blur-3xl"
        style={{
          background: "radial-gradient(circle, hsl(var(--accent) / 0.5), transparent 70%)",
          animation: "blob-float-b 28s ease-in-out infinite",
        }}
      />
      <div
        className="absolute bottom-0 left-1/4 w-[50vmin] h-[50vmin] rounded-full opacity-25 blur-3xl"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)",
          animation: "blob-float-c 32s ease-in-out infinite",
        }}
      />
    </div>
  );
}