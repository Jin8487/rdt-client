# 115 Vicarage Road, Kings Heath B14 — Project File

Everything built for the extension + development project, in one place.
(Held on this branch until a dedicated repository exists — create an empty
private repo, e.g. `vicarage-115-project`, and this folder moves there wholesale.)

## What's here

| Path | Contents |
|---|---|
| `reports/massing-envelope-115-vicarage.html` | The master planning report: maximum lawful massing on every level in every direction, tiered guarantee system, 45° geometry, refusal matrix, filing sequence, full references. Published live as a Claude artifact. |
| `screener/deal-screener.html` | **B14 Deal Screener** — interactive margin finder. Set a target margin (default £150k) and every assumption (build £/sqft, refurb rates, SDLT surcharge, price-type discounts, bridging, exit haircuts, cycle-time radius from B14 7QG, train access); it underwrites every candidate live and re-ranks. Self-tests run on every load. |
| `screener/engine.js` | The margin engine: SDLT bands + additional-dwelling surcharge, ceiling-capped exits, works contingency, planning-route costs, selling costs, bridging. 13-test suite included. |
| `screener/margin_engine.py` | Python reference implementation of the same engine (development test harness, 14 tests). |
| `screener/seed_candidates.json` | Real listings/auction lots from the Aug 2026 research sweep, used as the screener's seed data. |
| `research/area-sweep/` | Full eight-area value sweep (Moseley, Stirchley, Selly Park, Bournville/Cotteridge, Hall Green, Kings Norton, Balsall Heath/Cannon Hill, Billesley/Yardley Wood) + adversarial arithmetic review and ranking. |
| `research/ingest/` | Structured findings from the document-ingest agents (2005 approved plans metrology, pre-app analysis, site/neighbour photos, portal history). |
| `research/attack/` | Rejection-proofing research: GPDO Class A/B/C/E analysis, A.1(ja) aggregation trap, Birmingham policy (LW-4/LW-16), appeal precedents, refusal matrix. |
| `renders/plans/` | Tiered massing plans/sections, 45° geometry, maximum floor plans per storey. |
| `renders/layouts/` | Agreed flush-wall scheme + crown roof, and the family layout (ground/first/loft). |
| `renders/elevations/` | Elevation studies. |
| `workflows/` | The orchestration scripts that produced the research (rerunnable). |

## Key numbers (as of Aug 2026)

- **Home street ceiling:** ~£700–725k (261 Vicarage Rd, £680k Apr 2023, ~2,960 sqft).
- **Home build:** full scheme ≈ £270–290k realistic all-in; value-optimal minimum scope (6m ground floor + loft + finishes) ≈ £150–190k → ~£680–710k end value.
- **Best project areas within a bike ride:** Selly Park villa core (net ~£75–150k on ~£790k deployed), Moseley prime-street villa refurb (~£110–180k on ~£1.15m). Everything else underperforms the home play. Camp Hill line (Kings Heath / Moseley Village / Pineapple Rd stations) reopened 7 Apr 2026.

## Screener assumptions worth knowing

Engine defaults: build £190/sqft on added space; refurb £25/£50/£90 per sqft by condition; 10% works contingency; SDLT additional-dwelling surcharge 5%; asking −3% / guide +8% / offers-over +2% price expectation; 1.5% + £1.5k selling; £6k planning-route adder on Article 4 / conservation-area candidates; exits capped at each area's *repeatable* street ceiling (records excluded). Sizes marked "estimated" are inferred from type and era — verify against the EPC before offering. A screen is not a valuation: confirm any exit with two local agents before bidding.
