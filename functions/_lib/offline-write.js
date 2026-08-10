// Sultan Hanafi Royal Schools — the server half of the outbound queue.
//
// The queue on the device promises two things it cannot deliver alone:
//
//   1. EVERY DELIVERY IS IDEMPOTENT. A phone that loses signal mid-request has
//      no way to know whether the write landed. It retries. Without something
//      here, a retried reply becomes two messages in a parent's thread — and
//      the client cannot prevent that, because the duplicate is created by the
//      server, after the client gave up listening.
//
//   2. NO LAST-WRITER-WINS. An edit queued on Tuesday and delivered on Friday
//      must not silently overwrite what someone changed on Wednesday. Only the
//      server knows what the row says now, so only the server can refuse.
//
// Both are here, in one place, so an endpoint opts in by calling two functions
// rather than by reimplementing a subtle rule and getting it slightly wrong.
//
// WHAT THIS IS NOT. It is not a general transaction manager. Each guarded
// endpoint still does its own writes; this records the outcome so a repeat of
// the SAME operation returns the SAME answer instead of doing the work twice.
// The window between "wrote the row" and "recorded the key" is real, and the
// guarded endpoints are chosen so that losing that race is harmless — see the
// note on each one.

/** The client's stable operation id. Absent means "not from the queue", which
 *  is allowed: a live form post has no retry problem to solve. */
export function idempotencyKey(request) {
  const raw = request.headers.get('Idempotency-Key');
  if (!raw) return null;
  const key = raw.trim();
  // Bounded and boring. This value becomes a primary key, and an unbounded
  // client-supplied primary key is a way to fill a table.
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(key)) return null;
  return key;
}

/**
 * Has this exact operation already been carried out? Returns the stored
 * response so the caller can replay it verbatim.
 *
 * Scoped to the actor as well as the key: one account cannot replay — or
 * discover — another account's operation by guessing its id.
 */
export async function replayed(sql, key, actorType, actorId) {
  if (!key) return null;
  const res = await sql`
    SELECT response_status, response_body FROM sync_operations
    WHERE idempotency_key = ${key} AND actor_type = ${actorType} AND actor_id = ${actorId}`;
  if (!res.rows.length) return null;
  const row = res.rows[0];
  return { status: row.response_status, body: row.response_body };
}

/**
 * Records what was done, so a retry returns this instead of doing it again.
 * ON CONFLICT DO NOTHING: two deliveries racing must not both succeed at
 * writing the record, and the loser has nothing useful to say.
 */
export async function remember(sql, key, actorType, actorId, operationType, status, body) {
  if (!key) return;
  await sql`
    INSERT INTO sync_operations (idempotency_key, actor_type, actor_id, operation_type, response_status, response_body)
    VALUES (${key}, ${actorType}, ${actorId}, ${operationType}, ${status}, ${JSON.stringify(body)})
    ON CONFLICT (idempotency_key) DO NOTHING`;
}

/**
 * The optimistic-concurrency check, stated as a question with three answers
 * rather than two, because "the row is gone" is not the same as "the row
 * changed" and a caller that conflates them will do the wrong thing.
 *
 *   'absent'    no such row — the caller decides whether that is an insert or
 *               a 404. This function does not guess.
 *   'stale'     the row moved since the device last saw it. REFUSE.
 *   'current'   safe to write.
 */
export function compareVersion(rowUpdatedAt, baseUpdatedAt) {
  if (rowUpdatedAt == null) return 'absent';
  if (!baseUpdatedAt) return 'stale';        // no base version is not a pass
  const a = new Date(rowUpdatedAt).getTime();
  const b = new Date(baseUpdatedAt).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 'stale';
  // Second granularity. Timestamps round-trip through JSON and Postgres with
  // sub-second noise, and a false conflict is a real cost to a real person —
  // but a false PASS would be the silent overwrite this exists to prevent, so
  // the tolerance is deliberately tight rather than generous.
  return Math.abs(a - b) < 1000 ? 'current' : 'stale';
}

/**
 * The 409 body. It carries the server's current view so the interface can show
 * a person both versions and let them choose — which is the whole point. The
 * engine never resolves an institutional disagreement by itself.
 */
export function conflictBody(serverRow, message) {
  return {
    error: message || 'This was changed elsewhere since your device last saw it.',
    conflict: true,
    server: serverRow,
  };
}
