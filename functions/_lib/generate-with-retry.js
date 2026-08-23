// Technical Debt Register TD-2's remediation, built: a shared helper for
// every COUNT(*)+1 reference-number counter that had no retry-on-conflict
// (docs/technical-debt-register.md). Each of those counters is already
// backstopped by a database UNIQUE constraint, so the race was never a
// silent-collision risk — only a raw, unhandled 23505 surfacing to the
// caller on the rare occasion two requests read the same count before
// either committed. This does not change that: it makes the failure
// self-heal by recomputing a fresh candidate and trying again, instead of
// making the caller retry the whole request by hand.
//
// generate() and insert() are kept separate rather than one combined
// function because the caller needs the winning candidate value (the
// reference number itself) alongside the insert's own result row.
const UNIQUE_VIOLATION = '23505';

export async function generateWithRetryOnConflict(sql, generate, insert, { attempts = 3 } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    const value = await generate();
    try {
      const result = await insert(value);
      return { value, result };
    } catch (err) {
      if (err && err.code === UNIQUE_VIOLATION) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw new Error(
    `Could not generate a unique identifier after ${attempts} attempts` +
    (lastErr && lastErr.message ? ` (last error: ${lastErr.message})` : '') + '.'
  );
}
