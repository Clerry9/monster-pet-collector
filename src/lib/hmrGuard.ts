const HMR_DEPENDENCY_RELOAD_PATTERNS = [
  /node_modules\/\.vite\/deps\//,
  /node_modules\/react(?:\/|$)/,
  /node_modules\/react-dom(?:\/|$)/,
  /node_modules\/@react-three(?:\/|$)/,
  /node_modules\/three(?:\/|$)/,
  /node_modules\/@tanstack\/react-query(?:\/|$)/,
  /node_modules\/@tanstack\/query-core(?:\/|$)/,
];

function shouldForceReload(path: string) {
  return HMR_DEPENDENCY_RELOAD_PATTERNS.some((pattern) => pattern.test(path));
}

if (import.meta.env.DEV && import.meta.hot) {
  import.meta.hot.on("vite:beforeUpdate", (payload) => {
    const updates = payload.updates ?? [];
    const dependencyUpdate = updates.find((update) => {
      const path = "path" in update ? update.path : "";
      const acceptedPath = "acceptedPath" in update ? update.acceptedPath : "";
      return shouldForceReload(path) || shouldForceReload(acceptedPath);
    });

    if (dependencyUpdate) {
      console.warn("Dependency HMR update detected; forcing a full reload to avoid stale React bundles.", dependencyUpdate);
      import.meta.hot?.invalidate("Dependency update requires a full page reload.");
      window.location.reload();
    }
  });
}

export {};
