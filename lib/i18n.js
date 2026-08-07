/* Shared internationalisation core.
 *
 * ONE implementation, two consumers: scripts/build.js requires it under
 * Node to render every page, and js/i18n.js loads it in the browser to
 * drive the live language switcher. Locale maths (which prefix belongs to
 * which language, how a URL in one language maps to the same page in
 * another, how a key falls back when a translation is missing) is subtle
 * enough that having it written twice guarantees the two copies disagree —
 * and a switcher that disagrees with the build sends visitors to 404s.
 *
 * The UMD-ish wrapper is the same one js/adhkar-data.js already uses in
 * this repo: under Node's CommonJS wrapper top-level `this` is
 * `module.exports`, so `require()` hands back the API with zero changes to
 * the file the browser loads.
 */
(function (global) {
  'use strict';

  // In the browser the registry is injected by the build (see
  // buildLocaleRuntime in scripts/build.js) so no fetch is needed before
  // the switcher can paint. Under Node we read the JSON directly.
  var REGISTRY = global.__SHRS_LOCALES__ || null;
  if (!REGISTRY && typeof require === 'function' && typeof __dirname === 'string') {
    REGISTRY = require('../i18n/locales.json');
  }

  var LOCALES = (REGISTRY && REGISTRY.locales ? REGISTRY.locales : []).filter(function (l) {
    return l.enabled !== false;
  });
  var DEFAULT_CODE = (REGISTRY && REGISTRY.defaultLocale) || 'en';

  var BY_CODE = {};
  LOCALES.forEach(function (l) { BY_CODE[l.code] = l; });

  function locales() { return LOCALES.slice(); }
  function codes() { return LOCALES.map(function (l) { return l.code; }); }
  function defaultCode() { return DEFAULT_CODE; }
  function isKnown(code) { return Object.prototype.hasOwnProperty.call(BY_CODE, code); }

  /* Always returns a locale object — never undefined. Callers deep in the
     build (breadcrumbs, hreflang) would otherwise each need their own
     guard, and a typo'd code would surface as a confusing crash rather
     than as pages quietly built in the default language. */
  function get(code) {
    return BY_CODE[code] || BY_CODE[DEFAULT_CODE];
  }

  // --- URL <-> locale ----------------------------------------------------
  // Prefixes are matched longest-first so a future '/fr-CA' cannot be
  // shadowed by an existing '/fr'.
  var PREFIXED = LOCALES
    .filter(function (l) { return l.pathPrefix; })
    .sort(function (a, b) { return b.pathPrefix.length - a.pathPrefix.length; });

  function localeFromPath(pathname) {
    var p = normalisePath(pathname);
    for (var i = 0; i < PREFIXED.length; i++) {
      var pre = PREFIXED[i].pathPrefix;
      if (p === pre || p.indexOf(pre + '/') === 0) return PREFIXED[i].code;
    }
    return DEFAULT_CODE;
  }

  function normalisePath(pathname) {
    var p = String(pathname || '/');
    // Tolerate being handed a full URL (the switcher reads location.href).
    var schemeAt = p.indexOf('://');
    if (schemeAt > -1) {
      var afterHost = p.indexOf('/', schemeAt + 3);
      p = afterHost > -1 ? p.slice(afterHost) : '/';
    }
    p = p.split('#')[0].split('?')[0];
    if (p.charAt(0) !== '/') p = '/' + p;
    return p;
  }

  /* Strips the locale prefix, yielding the language-neutral path that
     identifies a page across every edition: '/ar/academics/' -> '/academics/'.
     This neutral form is the join key the switcher uses, which is why the
     locale trees must stay structurally parallel. */
  function neutralPath(pathname) {
    var p = normalisePath(pathname);
    var code = localeFromPath(p);
    var pre = get(code).pathPrefix;
    if (!pre) return p;
    var rest = p.slice(pre.length);
    return rest.charAt(0) === '/' ? rest : '/' + rest;
  }

  /* Not every page exists in every language. The registry carries, per
     locale, the neutral paths that locale does NOT have (a short exception
     list rather than a full inventory — most pages exist everywhere, so
     listing the absences is both smaller to ship and easier to read).
     Anything not listed is assumed present. */
  var MISSING = (REGISTRY && REGISTRY.missing) || {};

  /* In the browser the map arrives with the injected registry. Under Node it
     cannot: the build computes it FROM the manifest it is about to render, so
     it is not knowable when this module is first required. scripts/build.js
     calls this once, before rendering any page, so the build and the browser
     then agree on which editions exist. */
  function setAvailability(missing) {
    MISSING = missing || {};
  }

  function hasPage(pathname, code) {
    var absent = MISSING[code];
    if (!absent || !absent.length) return true;
    return absent.indexOf(neutralPath(pathname)) === -1;
  }

  /* pathFor() answers "where would this page live in that language"; this
     answers "where should I actually send the reader". They differ only when
     the counterpart does not exist, in which case the reader goes to that
     language's homepage rather than to a 404. Offering a dead link is worse
     than offering a less precise one — and the switcher must never be the
     thing that breaks a visit. */
  function resolvedPathFor(pathname, toCode) {
    if (hasPage(pathname, toCode)) return pathFor(pathname, toCode);
    var target = get(toCode);
    return target.pathPrefix ? target.pathPrefix + '/' : '/';
  }

  /* The heart of "preserve the current page" — maps any path into the
     requested locale. Query string and hash are carried across so a
     visitor who switches language mid-way through a filtered list or
     deep-linked section lands in the same place, not at the top. */
  function pathFor(pathname, toCode) {
    var target = get(toCode);
    var raw = String(pathname || '/');
    var tail = '';
    var hashAt = raw.indexOf('#');
    if (hashAt > -1) { tail = raw.slice(hashAt); raw = raw.slice(0, hashAt); }
    var qAt = raw.indexOf('?');
    if (qAt > -1) { tail = raw.slice(qAt) + tail; raw = raw.slice(0, qAt); }

    var neutral = neutralPath(raw);
    var out = target.pathPrefix
      ? target.pathPrefix + (neutral === '/' ? '/' : neutral)
      : neutral;
    if (out.charAt(0) !== '/') out = '/' + out;
    return out + tail;
  }

  // --- Translation lookup ------------------------------------------------
  // Dictionaries are flat-keyed with dots ('nav.academics.title') rather
  // than nested objects: flat keys make a missing translation a one-line
  // diff in review, and make the "which keys is Yoruba still missing"
  // question answerable by set subtraction (scripts/i18n-report.js).
  function lookup(dict, key) {
    if (!dict) return undefined;
    var v = dict[key];
    return typeof v === 'string' ? v : undefined;
  }

  /* Resolution order: requested locale -> default locale -> the key itself.
     Falling back to the DEFAULT language rather than to an empty string is
     deliberate: a half-translated page that shows one English label reads
     as unfinished, but a page with a blank button is broken. The key
     itself is the last resort and is intentionally ugly so it cannot pass
     review unnoticed. */
  function translate(dicts, code, key, vars) {
    var out = lookup(dicts[code], key);
    if (out === undefined) out = lookup(dicts[DEFAULT_CODE], key);
    if (out === undefined) out = '⟦' + key + '⟧';
    return vars ? interpolate(out, vars) : out;
  }

  function interpolate(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, function (whole, name) {
      return Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole;
    });
  }

  // --- Locale-aware formatting -------------------------------------------
  // Intl does the heavy lifting, but Yoruba is not present in every
  // runtime's CLDR data. Asking for 'yo-NG' where it is unsupported
  // silently yields the runtime's default locale, which would print
  // English month names inside a Yoruba page and look like a translation
  // bug rather than a data gap. So we verify the request was honoured and
  // fall back explicitly to the locale's declared numberFallback.
  function resolveIntlLocale(code) {
    var l = get(code);
    if (typeof Intl === 'undefined' || !Intl.DateTimeFormat || !Intl.DateTimeFormat.supportedLocalesOf) {
      return l.numberFallback || l.intlLocale;
    }
    try {
      var supported = Intl.DateTimeFormat.supportedLocalesOf([l.intlLocale]);
      return supported.length ? l.intlLocale : (l.numberFallback || l.intlLocale);
    } catch (e) {
      return l.numberFallback || l.intlLocale;
    }
  }

  function formatDate(date, code, options) {
    var d = (date instanceof Date) ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    var opts = options || { year: 'numeric', month: 'long', day: 'numeric' };
    try {
      return new Intl.DateTimeFormat(resolveIntlLocale(code), opts).format(d);
    } catch (e) {
      return d.toISOString().slice(0, 10);
    }
  }

  function formatNumber(value, code, options) {
    var n = Number(value);
    if (!isFinite(n)) return '';
    try {
      return new Intl.NumberFormat(resolveIntlLocale(code), options || {}).format(n);
    } catch (e) {
      return String(n);
    }
  }

  /* School fees are denominated in Naira regardless of the reading
     language — switching to French must not imply the invoice is in
     euros. So the currency CODE is fixed per locale in the registry
     (all NGN today) while only the FORMATTING follows the language. */
  function formatCurrency(value, code, currencyOverride) {
    var l = get(code);
    return formatNumber(value, code, {
      style: 'currency',
      currency: currencyOverride || l.currency || 'NGN',
      currencyDisplay: 'symbol',
    });
  }

  var API = {
    locales: locales,
    codes: codes,
    defaultCode: defaultCode,
    isKnown: isKnown,
    get: get,
    localeFromPath: localeFromPath,
    neutralPath: neutralPath,
    normalisePath: normalisePath,
    pathFor: pathFor,
    hasPage: hasPage,
    setAvailability: setAvailability,
    resolvedPathFor: resolvedPathFor,
    translate: translate,
    interpolate: interpolate,
    resolveIntlLocale: resolveIntlLocale,
    formatDate: formatDate,
    formatNumber: formatNumber,
    formatCurrency: formatCurrency,
  };

  global.SHRS_I18N = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : this);
