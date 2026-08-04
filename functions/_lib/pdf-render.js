// PDF Architecture Decision — Executive Directive point 3 ("I do not
// want browser-print quality... If necessary, build a dedicated PDF
// generation service rather than relying on browser printing.").
//
// Chosen architecture: Cloudflare Browser Rendering (headless Chromium
// via the `@cloudflare/puppeteer` binding), invoked from THIS SAME
// Cloudflare Pages Functions runtime that already serves every other
// endpoint in this codebase — not a third-party vendor. Reasoning,
// stated plainly:
//   - Same vendor already in use (Cloudflare Pages + Neon) — no new
//     credential, contract, or data-residency relationship to
//     provision, unlike an external HTML-to-PDF API or a self-hosted
//     rendering box.
//   - Genuine headless Chromium (not a lightweight HTML-to-PDF
//     approximation) — print CSS, @page rules, and web fonts render
//     exactly as they do in the browser preview, which is what the
//     Directive's "quality over convenience" instruction calls for.
//   - Usage-based pricing, no idle server to maintain, which matches
//     this project's existing pattern (Cloudflare Pages Functions +
//     Neon serverless — nothing in this stack runs as an always-on
//     process).
//   - Triggered per-issuance (not a scheduled batch) is the correct
//     shape here specifically because SHRS's real issuance volume is
//     low (per-graduate, on demand) — a scheduled batch process would
//     be the right call for high-volume bulk printing runs (e.g. an
//     entire graduating cohort at once), and nothing here forecloses
//     adding that later; this module is called the same way either
//     path uses it.
//
// Honest operational note, stated with the same discipline as every
// other infrastructure claim in this project: Browser Rendering
// requires (1) a Cloudflare account with Browser Rendering enabled and
// a `browser` binding declared in wrangler.toml (already added), and
// (2) an actual deployment to verify against — this sandboxed,
// network-restricted development environment cannot invoke Cloudflare's
// real edge Browser Rendering service, so this code is written against
// the documented @cloudflare/puppeteer API but has NOT been exercised
// against a live binding. Treat it as ready-to-verify, not
// verified-working, until the first real deployment confirms it.
import puppeteer from '@cloudflare/puppeteer';

export class PdfRenderUnavailableError extends Error {
  constructor(reason) {
    super(`PDF rendering is not available: ${reason}. The browser Print / Save as PDF path remains available regardless.`);
    this.name = 'PdfRenderUnavailableError';
  }
}

// Renders a self-contained HTML string (as produced by
// functions/_lib/document-template-shell.js) to PDF bytes via
// Cloudflare Browser Rendering. Throws PdfRenderUnavailableError
// (never a raw/unhandled error) when the `env.BROWSER` binding isn't
// configured, so callers can fall back to serving the HTML directly.
export async function renderHtmlToPdf(env, html) {
  if (!env.BROWSER) {
    throw new PdfRenderUnavailableError('the BROWSER binding is not configured on this environment');
  }
  let browser;
  try {
    browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    return pdf;
  } catch (err) {
    throw new PdfRenderUnavailableError(err && err.message ? err.message : 'browser rendering failed');
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* best-effort cleanup */ }
    }
  }
}
