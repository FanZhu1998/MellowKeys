# Security and privacy

Mellow Keys does not need a personal API key. The Windows build performs its music generation, sampled-piano playback, notation and saves locally. It includes no analytics or automatic update service. Optional reference links open in your browser only when clicked.

## Data and credentials

- Desktop data lives in `%APPDATA%\\Mellow Keys\\library.sqlite`, outside the installation folder. Application updates preserve it. Close the app before backing up the data directory.
- The hosted edition stores a separate library per authenticated account. Its Worker trusts the `oai-authenticated-user-id` header supplied by the Sites gateway. A different hosting provider must implement a trusted authentication gateway that strips incoming identity headers and supplies its own authenticated identity. Never expose that Worker as a public API that trusts client-supplied identity headers.
- Source publication uses a clean, allowlisted export. Existing hosting identifiers, original Git history, credentials, build caches, local databases and saved user music are excluded.
- Environment files, private keys, credential files and local databases are ignored. The release build stages only application files and assets; it never packages the source checkout or `.git` directory.
- Never commit tokens or put secrets in browser JavaScript. Use repository secrets for any future authenticated automation; no secret is required by the current CI workflow.

## Desktop boundaries

The renderer runs with sandboxing and context isolation, without Node.js integration. A private application protocol serves bundled assets; filesystem traversal, remote navigation, extra windows and browser permission requests are blocked. The preload exposes only PDF saving and a readiness signal, with main-frame sender validation. Runtime loading of Node options and inspector arguments is disabled in the packaged executable.

## Verification

Run `npm run security:scan` before publication, plus `npm audit` and `npm test`. The scanner reports file paths and rule names, never suspected secret values. Automated detection is not a proof that no secret can exist; inspect unfamiliar findings and the staged file list before pushing.

For a suspected vulnerability, use the repository's private vulnerability-reporting feature if available. Do not paste private credentials or saved music into a public issue. If a real credential is exposed, revoke it at its provider before cleaning files or history.

This personal Windows distribution is unsigned. No code-signing certificate or private signing key is included.
