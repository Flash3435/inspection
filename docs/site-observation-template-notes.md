# Site Observation Report — Template Notes

Reference-driven alignment pass for procedure **6.12** (Site Observation Report) and practice instruction **6.01.03**.

---

## Reference files inspected

| File | Status | Method |
|------|--------|--------|
| `docs/reference/6.12_Site Observation Report_(AO).dotx` | Inspected | Unzipped OOXML (`document.xml`, headers, footers, media) |
| `docs/reference/6.01.03 - Site Observation Instruction.pdf` | Inspected | Text extraction (pypdf) |
| `docs/reference/2025-09-02 - Equinix CL1 Mantrap - Site Observation Report (FINAL).pdf` | Inspected | Text extraction (pypdf) |

---

## Actual template / sample structure observed

### Cover / title area

- All-caps title: **SITE OBSERVATION REPORT**
- First-page letterhead with company logo and Toronto office address
- Four-column metadata table (label | value | label | value):
  - Project | … | Project No | …
  - Location | … | Report No | …
  - Contractor | … | Date of Visit | …
  - Building Permit No | … | Report Date | …
  - Sheet | PAGE X OF Y
- Free-text fields below table:
  - **Reason for Site Visit**
  - **Present** (attendees)
- Two italic disclaimer paragraphs (visual observation scope, not engineering opinion, contractor responsibility, deficiency confirmation requirement)

### Body sections (official — not numbered 1.0–6.0)

- **Section A - Progress Summary** — numbered narrative items (1., 2., 3.) describing work-in-progress; inline **Figure N — …** photos
- **Section B - Deficiencies Note on Completed Work** — grouped by trade (1. Electrical, 2. Mechanical, …) with sub-items (1.1, 1.2, …); deficiency wording typically begins *“During the site observation, it was noted that …”*

### Distribution / close-out

- Distribution block: **H.H. ANGUS AND ASSOCIATES LTD.**
- Checkbox recipients: Project File, Owner, Prime Consultant, GM/CM
- **Prepared by:** author name(s)

### Headers / footers

- Subsequent pages: header **Site Observation Report  No. [Report No]**
- Footer: *Expanding What is Possible. Together. For a Better Future.* + **hhangus.com** + page number
- Controlled document reference: procedure **6.12** (filename); instruction **6.01.03** governs process

### Instruction PDF expectations (6.01.03)

Reports should include: attendees, visit/report dates, purpose of visit, progress observations, deficiencies when applicable, dated photo record, distribution to Owner / Prime Consultant / Contractor per project requirements. Reports are normally issued before progress draws are processed.

### Equinix sample specifics (structure only)

- Report No **1**, Project No **2201319**, Building Permit **BP2024-00799**
- Reason for visit: **Final Review**; Present: reviewer names
- Section A: four progress items with paired inline figures
- Section B: Electrical items 1.1–1.4, Mechanical 2.1–2.2; includes documentation/letter requirements and drawing references
- No separate numbered “Limitations” or “Appendix A” — photos are inline under sections

---

## What the current app / export now matches

| Element | Status |
|---------|--------|
| All-caps **SITE OBSERVATION REPORT** title | Yes |
| Four-column cover metadata labels | Yes (DOCX + preview) |
| Reason for Site Visit / Present fields | Yes (optional project fields) |
| Official italic cover disclaimer | Yes |
| Section A / Section B headings and split | Yes (preview + template DOCX) |
| Progress items numbered 1., 2., 3. | Yes |
| Deficiency items grouped by discipline with 1.1, 1.2 numbering | Yes |
| Deficiency lead-in wording | Yes (template export + preview) |
| Figure N — caption format | Yes (was Photo N) |
| Inline photos under observations (template export + preview) | Yes |
| Distribution block + Prepared by | Yes |
| Approximate page header / footer | Yes (DOCX template mode) |
| Logo / letterhead placeholder | Yes (placeholder text) |
| Shared `buildSiteObservationReport()` for preview and export | Yes |

---

## Comparison: sample vs current generated export

### Matched

- Cover title and metadata field labels (Project, Location, Contractor, Building Permit No, Report No, dates)
- Reason for Site Visit and Present
- Cover disclaimer text (structure and intent)
- Section A / Section B naming
- Progress numbering and inline figure captions
- Deficiency discipline grouping and sub-numbering
- Distribution company name and recipient list
- Prepared by line
- Header “Site Observation Report No. …” and footer tagline (approximation)

### Partially matched

- **Sheet PAGE X OF Y** — static `1 OF 1` placeholder; true page-count fields not implemented client-side
- **Location** — uses site address / site name composite; sample uses city/province only
- **Observation IDs** — app still generates M-001 / E-001 internally; sample uses narrative numbering only in body
- **Deficiency detail** — sample includes drawing refs, issuance packages, letter requirements; app uses free-text only
- **Photo layout** — inline figures exported at reduced size; sample uses two-column figure pairs with exact sizing
- **Distribution checkboxes** — text `[x]` markers, not Word content-control checkboxes

### Not yet matched

- Official `.dotx` styles (Aptos, custom Heading styles, exact margins)
- Embedded company logo image from template media
- True first-page vs subsequent-page header artwork
- Revision / issue control block from QMS footer
- Signature / authentication block for licensed review engineer
- Previous-visit deficiency carry-forward
- TAG / Construction Review system integration

### Intentionally deferred

- True `.dotx` population (docxtemplater / server-side)
- PDF export
- Official Word checkbox fields
- Separate Appendix A (sample uses inline figures only)
- Numbered sections 1.0–6.0 in template mode (retained only in `exportStyle: "generic"`)
- Action register table in issued report (shown in preview as supplemental QA aid only)
- Extended limitations section in template mode (cover disclaimer covers official language)

---

## Metadata fields — app mapping

| Template label | App field | Notes |
|----------------|-----------|-------|
| Project | `project.name` | |
| Project No | `project.projectNumber` | |
| Location | `project.siteAddress` / `project.siteName` | Combined when both provided |
| Report No | `project.reportNumber` | Optional; e.g. visit sequence |
| Contractor | `project.contractorName` | New optional field |
| Date of Visit | `project.visitDate` | Falls back to `inspectionDate` |
| Building Permit No | `project.buildingPermitNo` | New optional field |
| Report Date | `project.reportDate` | Defaults to export date if blank |
| Reason for Site Visit | `project.reasonForVisit` | Falls back to scope/description |
| Present | `project.contractorPresent` | Attendees (label updated in UI) |
| Prepared by | `project.preparedBy` | Falls back to `inspectorName` |

---

## Observation / photo layout

| Aspect | Official sample | Current app |
|--------|-----------------|-------------|
| Progress photos | Inline Figure 1–N under Section A | Inline in preview + template DOCX |
| Deficiency photos | Inline under Section B items | Same |
| Caption format | `Figure N — Description` | `Figure N — {observation title}` |
| Photo organization by date | Required by instruction 2.02.02 | Not enforced (export order = observation order) |
| Appendix | None in sample | Retained for `exportStyle: "generic"` only |

---

## Client-side DOCX limitations

- The `docx` npm library **creates a new document**; it does not open or populate the official `.dotx`.
- Page-number fields (`PAGE X OF Y`) are approximated; dynamic total page count is unreliable in browser-generated DOCX.
- Official styles, content controls, and exact section breaks from the template are not preserved.
- Recommended future path: server-side template fill (docxtemplater / python-docx) using `6.12_Site Observation Report_(AO).dotx`.

---

## TODO — deferred template accuracy

- [ ] True `.dotx` population with official styles
- [ ] Embed `word/media/image1.png` logo from template
- [ ] Exact margins, Aptos font, and heading style IDs
- [ ] Word content-control checkboxes for distribution
- [ ] Dynamic PAGE / NUMPAGES fields for Sheet row
- [ ] Signature / licensed engineer authentication block
- [ ] Previous-visit action carry-forward
- [ ] Two-column inline photo grid matching sample pagination
- [ ] Drawing / issuance reference fields on deficiencies
- [ ] Photo sorting by capture date per instruction 2.02.02

---

## Files changed in this pass

- `lib/types.ts` — optional project metadata; `progressItems` / `deficiencyItems` / `officialDisclaimer` on report model
- `lib/constants.ts` — official disclaimer, distribution constants, procedure no.
- `lib/migrate-store.ts` — defaults for new optional fields
- `lib/report-utils.ts` — Section A/B split, cover mapping, Figure captions
- `lib/docx-export/helpers.ts` — four-column table, headers/footers, numbering helpers
- `lib/docx-export/sections/cover.ts` — template cover table and disclaimer
- `lib/docx-export/sections/template-sections.ts` — Section A, B, distribution
- `lib/docx-export/build-document.ts` — template vs generic assembly paths
- `components/ReportPreview.tsx` — aligned with official section structure
- `components/ProjectForm.tsx` — new metadata fields and labels
- `docs/site-observation-template-notes.md` — this document

---

## Recommended next step

Run a side-by-side review with Ash: export a project using **Download Word Report**, open beside the Equinix sample PDF, and confirm field labels and Section A/B flow. If acceptable, next increment is **server-side `.dotx` population`** so styles, logo, and checkboxes come from the controlled template file directly.
