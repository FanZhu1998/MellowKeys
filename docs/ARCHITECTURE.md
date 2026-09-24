# Architecture and future updates

Mellow Keys has one music engine and two hosts. The browser and Windows app use the same UI, chord IDs, voicings, score renderer, MusicXML serializer, input validation and workspace API.

| Module | Responsibility | Compatibility boundary |
| --- | --- | --- |
| `public/harmony-v2.js` | Curated worlds, chord definitions, spelling and voice leading | Existing chord IDs and quality IDs remain stable |
| `public/model.js`, `schema.js` | Saved phrases, immutable voiced pitches, validation | Versioned workspace data; never reinterpret saved voicings |
| `public/storage.js` | Save queue and status | Accepts an injected load/save transport |
| `public/workspace-transport.js` | Requests, errors and timeouts | `{data, revision}` API contract |
| `public/workspace-merge.js` | Three-way conflict recovery | Conflicting edits remain as recovered copies |
| `public/score.js`, `notation-key.js` | Piano engraving | One chord per bar, exact saved notes |
| `public/musicxml.js` | Editable score export | Independent of DOM and engraving library |
| `public/platform.js`, `ui-focus.js` | Host-specific labels, PDF action, focus restoration | Small host bridge; no Node access in renderer |
| `server/worker.js` | Workspace API and revision checks | Trusted host identity, prepared SQL |
| `server/sqlite-adapter.mjs` | Local SQLite and migrations | Same generated SQL migrations as D1 |
| `server/assets.mjs`, `security.js` | Asset paths and security headers | No arbitrary filesystem access |
| `desktop/` | Window, protocol, PDF dialog and process security | Bundled local content only |
| `scripts/build-client.mjs` | Shared assets and licenses | No network-loaded fonts, scripts or piano samples |

## Save format

The workspace has `schemaVersion: 1`, favorites, score sheets and an active score ID. The initial unversioned web format is treated as version 1. A newer unknown version is rejected instead of overwritten. Each saved phrase includes its key, style, color, playback pattern, tempo, stable chord IDs and exact MIDI voicings.

The API envelope has a separate numeric `revision` for optimistic concurrency. It is not a schema version. Both hosts reject stale writes; the client merges changes against its last saved base. Conflicting copies receive fresh IDs.

## Database and release updates

1. Keep existing chord IDs and their musical meaning stable. Introduce new IDs for incompatible chord definitions.
2. Add an explicit data migration before increasing `WORKSPACE_SCHEMA_VERSION`.
3. Generate additive database migrations with `npm run db:generate`; never edit or remove a migration that has shipped.
4. The desktop migration ledger rejects databases containing migrations unknown to the app. Back up the closed app's data folder before schema upgrades. Avoid downgrading an upgraded library.
5. Test a previous-version database fixture, current saves, conflict recovery, MusicXML, and packaged startup when changing persistence.
6. Increase the package version, record the change, rebuild from the lockfile, rerun secret/dependency checks, and distribute the complete Windows folder or ZIP.

Desktop updates replace the application folder. The data directory is separate and remains in place. This release intentionally has no automatic updater, background account sign-in or cloud synchronization. The hosted account library and desktop library are separate.

## Publication

Use `npm run export:source -- <empty-directory>` to produce an allowlisted source copy with generic hosting configuration. Review that copy and run its secret scanner before initializing its clean Git history. This avoids publishing deployment identifiers and private development history.

CI checks source and tests on pushes and builds the Windows package on a version tag or manual run. It uploads a build artifact; publishing a signed installer or GitHub Release can be added later without changing the music modules. No repository secret is required by the current workflow.
