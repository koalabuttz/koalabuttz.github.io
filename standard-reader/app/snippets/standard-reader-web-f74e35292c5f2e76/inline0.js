
export function srClaimAuthLock() {
  return new Promise((resolve) => {
    if (!navigator.locks) {
      resolve(false);
      return;
    }
    navigator.locks.request(
      "standard-reader.oauth",
      { ifAvailable: true },
      (lock) => {
        resolve(Boolean(lock));
        if (!lock) return;
        // Hold the exclusive lock for this document's lifetime. Navigation releases it.
        return new Promise(() => {});
      }
    ).catch(() => resolve(false));
  });
}
