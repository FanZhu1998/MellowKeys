# Version 1.0.0 release checks

Checked on 24 September 2026.

- Source scan: no recognized personal API keys, access tokens, private keys, credential URLs, personal filesystem paths, or saved databases in the clean export.
- Original development history: three reachable commits and 56 unique blobs reviewed; no recognized credentials found. Hosting-specific project metadata is intentionally omitted from the GitHub export and is not carried into its history.
- Existing GitHub initial history was reviewed separately. Its pre-existing commit email metadata is preserved; no new personal email is used for the app commit.
- Packaged application payload: scanned separately; no recognized secret patterns or sensitive files.
- Dependencies: `npm audit` reported zero known vulnerabilities for the final lockfile.
- Eleven tests passed, covering harmonic tones, all generated keys/lengths, exact saved voicings, MusicXML, ownership/revision checks, conflict recovery, timeouts, safe IDs, migration persistence and asset/URL boundaries.
- Windows x64 executable: launched successfully in an isolated self-test, loading its local library and bundled piano/font/notation assets without a server or system Node dependency.
- Browser checks: persistent score title, score engraving, sampled-piano playback, keyboard focus after rerender, dark dropdowns, no console errors, and no horizontal document overflow at phone width.

These checks cover the app source, its reachable development history, the repository export and the packaged app. They do not prove that no credential has ever been exposed elsewhere in an account or on the internet. No credential rotation was required by the findings. The Windows build is unsigned; compare the published SHA-256 checksum after downloading.
