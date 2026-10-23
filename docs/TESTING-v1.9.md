# HRVec-Andaman2 v1.9 verification — 2026-10-22

## Local and isolated checks

- `npm run check`: JavaScript syntax checks passed.
- `npm test`: 100 tests passed in Asia/Bangkok; 100 passed with TZ=UTC after the template compatibility update.
- Compatibility update on 2026-10-23: legacy Thai headings, copied BOM/spacing and duplicate aliases checked. Real XLSX passed through application form handlers, preview displayed job/competency data with HTML escaping, and only explicit confirmation committed linked demo records. A subsequent invalid file cleared the pending import.
- `tests/schools-db.mjs`: 76 isolated PostgreSQL integration assertions passed for the v1.8 delegation upgrade, scoped actions, field boundaries, revocation, imports and document rechecks.
- `tests/institute-db.mjs`: 40 isolated PostgreSQL assertions passed for fresh v1.9 schema, repeatable upgrade, occupied institute ID, rollback on pre-existing non-empty address, old department normalization, address removal, institute assignment, mixed-department rejection, competency metadata, atomic import and anonymous denial.
- Updated Thai XLSX: 13 personnel columns and 10 certificate columns matched the importer. Blank input sheets confirmed; a disposable filled copy read through the shipped ExcelJS/fflate adapter and importer. Two personnel, two competency certificates, Excel dates, degree majors and leading zeros preserved. Empty director department accepted; missing issuer and unknown school rejected. Six sheets rendered and visually inspected. The original Library template had no real input records. No production import was performed.
- Browser through managed Sites preview: overview drilldown requested admin verification; demo explicitly labeled. Institute selection showed five institute sections; college showed four departments; form had four sections and no address/status input. Central personnel plus competency metadata survived review, confirmation and organization filtering. This used browser-local demonstration records, not production personnel.

## Live project verified

- Rechecked 2026-10-23: schema 1.9.0, 8 active organizations, 1 enabled admin account, 0 active personnel, and all 6 relevant personnel/certificate metadata columns present. This update changes frontend parsing and review; no database migration or password reset was performed.
- Published frontend now uses the existing HR project's public URL and enabled publishable key. Update ZIP omits dist/config.js so existing GitHub installations retain their own settings.
- Four read-only HTTP probes on 2026-10-23 passed: both functions accepted preflight from the Site origin (200), anonymous personnel read was denied (401), and anonymous overview RPC was denied (401). No production account password or business data was submitted.

- Project: `oftlfxiywhtoftxluviv`.
- Applied migration: `20261022111900_institute_structure_v19`.
- Native query returned schema version `1.9.0`, 8 organizations, 1 institute, 0 personnel, no `personnel.address` column; certificate metadata columns present.
- Seven college IDs remained 1–7; institute ID is 8 in this project. Migration does not assume this ID and isolated test with a previously occupied ID passed.
- `hr-accounts` and `hr-bridge`: ACTIVE, deployment version 5. Their code already supports dynamic organizations; no Edge Function code change was required for v1.9.
- 12 live HTTP checks passed: allowed-origin preflight for both deployed origins, missing and invalid session rejection, unauthorized-origin rejection, anonymous personnel and overview access denied.
- Security Advisor unchanged: 9 intentional checked SECURITY DEFINER RPC warnings and leaked-password-protection warning. No new warning category introduced.

## Operational limits

- Actual admin sign-in, actual user-password changes, Drive upload/download and Google Sheets synchronization were not exercised in this turn.
- Current browser review verified that the blank workbook cannot be committed. Filled-workbook browser automation was interrupted; the 100 passing automated checks include the real XLSX reader and form-to-review-to-confirmation path, but are not a production sign-in acceptance test.
- User GitHub repository/Pages deployment was not modified; configured Source ZIP is supplied for the owner to Commit/Sync. Sites source and deployment are separate from that repository.
- Apps Script `Code.gs` backup metadata version updated in source; the user must publish a new Apps Script Web app version as documented. Public Web app requests remain HMAC checked and files private.
- New delegated production users/assignments were not created, and existing admin credentials were not reset.
