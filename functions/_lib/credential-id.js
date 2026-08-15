// INSTITUTION CREDENTIAL ID (ICID)
//
// The permanent internal name of a credential. Assigned once, never changed,
// never printed on the certificate, never returned to the public. Audit logs,
// revocations, reissues, transcripts and any future API refer to a credential
// by this and nothing else.
//
// WHY THE ROW NEEDED ONE MORE IDENTIFIER. It already has three, and each is
// unusable for this job:
//
//   serial_no   engraved on paper, so immutable — but it encodes a programme
//               code and a year, and it is the thing formats are most likely
//               to change around over twenty years.
//   id          a database sequence. Any rebuild from the sealed registers
//               re-assigns it. An audit log referencing it would silently come
//               to name a different certificate.
//   content_hash  a function of the signing key, which rotates.
//
// DERIVED, NOT RANDOM — and that is the design decision worth defending.
//
// A random UUID would be assigned by whichever database happened to insert the
// row first. This project's entire recovery model is that the sealed registers
// in the repository are the authority and the database is brought into
// agreement with them; a randomly-assigned identifier inverts that, and the
// first restore-from-registers would mint thirty-three new ICIDs while the
// audit log went on referring to the old ones. An identifier that changes when
// the database is rebuilt is not permanent, whatever the column comment says.
//
// So the ICID is a UUIDv5 over the certificate's own stored serial, under a
// fixed institutional namespace. That gives every property the identifier is
// supposed to have — unique, stable, reproducible anywhere from the register
// alone, and requiring no coordination — from a fact that is already immutable
// because it is engraved on paper.
//
// It is NOT part of the content hash and must never become part of it. The
// five characters engraved on the certificate face derive from that hash, so
// anything added to it changes a printed number. Note also the direction of
// the dependency: the ICID is derived FROM the serial, so making it an input
// to the serial would be circular as well as wrong.
import crypto from 'node:crypto';

// An arbitrary but permanent namespace, generated once for this institution on
// 2026-08-15 and fixed from that moment. Changing it would re-derive every
// ICID, which is the one thing this module exists to prevent.
export const SHRS_CREDENTIAL_NAMESPACE = 'b7d4f0e2-3c81-4a96-9f5d-2e60a8c71b34';

function uuidV5(name, namespace) {
  const nsBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  if (nsBytes.length !== 16) throw new Error(`Bad UUID namespace: ${namespace}`);
  const hash = crypto.createHash('sha1')
    .update(nsBytes).update(Buffer.from(name, 'utf8')).digest();
  const b = Buffer.from(hash.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50;   // version 5
  b[8] = (b[8] & 0x3f) | 0x80;   // RFC 4122 variant
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// `serialNo` is the STORED serial — SHRS-CERT-IBT-2026-000035-368DC — not the
// printed one. The printed form drops the year, so two certificates from
// different years could share it; the stored form is what the database holds
// under a UNIQUE constraint, and uniqueness is the property being inherited.
export function credentialIdFor(serialNo) {
  const s = String(serialNo || '').trim();
  if (!/^SHRS-CERT-[A-Z]{2,4}-\d{4}-\d{6}-[0-9A-F]{5}$/.test(s)) {
    throw new Error(`credentialIdFor expects a stored serial, got "${serialNo}".`);
  }
  return uuidV5(s, SHRS_CREDENTIAL_NAMESPACE);
}
