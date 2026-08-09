// Registers the Neon→Postgres resolver hook. Used with `node --import` so
// the real verification endpoint can be exercised against a local database
// without a single edit to the endpoint itself. Never loaded in production.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./neon-pg-loader.mjs', pathToFileURL(import.meta.filename));
