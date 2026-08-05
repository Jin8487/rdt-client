export const meta = {
  name: 'verify-massing-envelope',
  description: 'Adversarially verify every number and legal claim in the draft maximum-massing envelope for 115 Vicarage Road',
  phases: [{ title: 'Verify' }],
}

const VERDICT = {
  type: 'object', required: ['summary', 'verdicts'],
  properties: {
    summary: { type: 'string' },
    verdicts: { type: 'array', items: { type: 'object', required: ['claim', 'verdict', 'reasoning'], properties: {
      claim: { type: 'string' }, verdict: { type: 'string', enum: ['CONFIRMED', 'CORRECTED', 'UNRESOLVED'] },
      reasoning: { type: 'string' }, corrected_value: { type: 'string' }, source: { type: 'string' } } } },
    references: { type: 'array', items: { type: 'object', required: ['title'], properties: { title: { type: 'string' }, url: { type: 'string' }, quote: { type: 'string' } } } },
  },
}

phase('Verify')
const results = await parallel([
  () => agent(`You are a statutory-amendments verifier. Use ToolSearch to load WebFetch/WebSearch (note: legislation.gov.uk direct fetches may be 403-blocked by the proxy — use WebSearch snippets, the GitHub mirror raw.githubusercontent.com/legalize-dev/legalize-uk/main/uk/uksi-2015-596.md which DID fetch successfully earlier, Planning Jungle, Planning Geek, and explanatory memoranda). Resolve these exact questions with citations:
(1) CONFLICT TO RESOLVE: One researcher says SI 2024/579 (in force 21 May 2024) did NOT amend GPDO Sch.2 Part 1; another says the Class B.2(b) exception for 'an enlargement which joins the original roof to the roof of a rear or side extension' (L-shaped dormers over rear extensions) was added by SI 2024/579 in force 25 May 2024. Establish: (a) the exact SI that inserted the roof-join exception into Class B.2(b) and B.2(b)(ii), and its in-force date; (b) whether that exception was actually part of the original GPDO 2015 text (check the made version at legislation.gov.uk/uksi/2015/596/made, Class B); (c) the CURRENT full text of Class B.1 and B.2.
(2) What EXACTLY did SI 2026/313 (Town and Country Planning (General Permitted Development etc.) (England) (Amendment) Order 2026, in force 9 April 2026) change in Part 1 Class AA? Find the SI text or its Explanatory Memorandum or Planning Jungle's 20 March 2026 article.
(3) Confirm the Class AA build-date gateway verbatim: development is NOT permitted if the dwellinghouse was 'constructed before 1st July 1948 or after 28th October 2018' — i.e. an inter-war (1930s) house CANNOT use Class AA at all. Confirm no 2026 amendment changed that gateway.
(4) Confirm the current householder prior-approval application fee for a larger home extension (Class A A.4) and for a Class AA application in England as of 2026 (post the December 2023 fee uplift and any 2025 indexation).
Return the schema verdicts.`, { label: 'verify:amendments', phase: 'Verify', schema: VERDICT, effort: 'high' }),

  () => agent(`You are an adversarial verifier. Your job is to REFUTE each claim below if you can — check each against the GPDO 2015 as amended (mirror that fetched successfully earlier: https://raw.githubusercontent.com/legalize-dev/legalize-uk/main/uk/uksi-2015-596.md — download it again; plus WebSearch of legislation.gov.uk snippets). Site facts you may rely on: 115 Vicarage Road B14 7QG is a DETACHED two-storey inter-war house, hipped roof, NOT in a conservation area, no Article 4 direction on householder rights, plot 607.14 sq m, long rear garden (~30m), existing single-storey rear block drawn at 4.36m deep beyond the original rear wall (2005 permission section shows ~3.3m), existing flat roof measured ~2.9-3.1m high, extension flank ~1.03m from the No.117 boundary and conservatory west face ~0.97m from the No.113 boundary (both within 2m of a boundary). CLAIMS TO ATTACK:
(1) Under Class A.1(g)+A.4 prior approval, the maximum single-storey rear depth is 8.0m measured from the original rear wall, max height 4.0m, and because the enlargement is within 2m of a boundary its eaves must not exceed 3.0m — and the EXISTING 4.36m block can be retained and joined provided the total enlargement complies (A.1(ja)); if the existing block's eaves exceed 3.0m the joined total fails A.1(i).
(2) A neighbour objection to the A.4 notification does NOT allow Birmingham to refuse on design/subservience grounds — only 'the impact on the amenity of any adjoining premises' may be assessed, and if the LPA fails to decide within 42 days the development may lawfully proceed (deemed consent), with no completion deadline since SI 2019/907.
(3) Under Class A.1(h), a two-storey rear extension is PD up to exactly 3.0m beyond the ORIGINAL rear wall provided no part is within 7m of the rear boundary, pitch matches, upper side windows obscure/non-opening below 1.7m.
(4) Under Class B a detached house gets 50 cubic metres of roof enlargement measured EXTERNALLY against the ORIGINAL roof space; a full-width rear box dormer is permitted; nothing may rise above the existing ridge; volume from hip-to-gable infill counts within the 50.
(5) Under Class E, outbuildings in the rear garden: max 50% of curtilage (excluding original house footprint), single storey, 4m max height dual-pitched (3m otherwise, 2.5m within 2m of a boundary), eaves max 2.5m.
(6) A 2005 planning permission whose ONLY condition is 'B1: All building materials to match the existing building in colour, form and texture' does NOT remove GPDO rights under art.3(4) (Dunnett Investments test).
(7) The s.192 LDC route: an LDC for the 8m scheme can only be granted AFTER the A.4 prior-approval procedure has concluded; before that the correct instruments are the prior-approval notice itself and s.191 after build.
(8) If the as-built existing rear block (4.36m) exceeds the 2005 approval (~3.3m), the excess is immune from enforcement if substantially completed more than 4 years before 25 April 2024 (pre-LURA breach), and a s.191 CLEUD can certify it; breaches arising on or after 25 April 2024 face the 10-year rule (LURA 2023 s.115).
For each claim return CONFIRMED / CORRECTED (with the corrected value and exact provision) / UNRESOLVED.`, { label: 'verify:envelope-statute', phase: 'Verify', schema: VERDICT, effort: 'high' }),

  () => agent(`You are an adversarial verifier attacking the PLANNING-MERITS claims in a draft strategy for 115 Vicarage Road, Kings Heath (pre-app 2026/03356/PA; officer Leah Russell conceded in writing: principle of two-storey rear acceptable; 45-Degree Code met from both neighbours, taken from the end of No.117's solid-walled conservatory; but 6m two-storey = overdevelopment, reduce to 4m; roof must match hipped design). Use ToolSearch to load WebFetch/WebSearch. CLAIMS TO ATTACK:
(1) 'The officer's 4m figure has no codified policy basis — no numeric depth cap for two-storey rear extensions exists anywhere in the Birmingham Design Guide SPD 2022, the DM DPD 2021 or the BDP 2017.' Try to find ANY Birmingham numeric depth standard for householder rear extensions (LW-16 through LW-22, DM policies) that would contradict this.
(2) 'The appeal APP/P4605/D/25/3373138 (834 Walsall Road, Perry Barr, B42 1ES, decision c.2025, application 2025/02999/PA) allowed a two storey side and rear extension plus single storey rear extension and outbuilding against Birmingham CC refusal under the same Design Guide subservience test.' Verify this appeal exists, its outcome and what depth was allowed.
(3) 'Pre-application advice is not binding, and an officer concession in pre-app (45-degree code met; taken from conservatory end) can be relied on as evidence in an application/appeal but a different officer could depart from it.' Confirm the legal status of pre-app advice and whether consistency arguments (legitimate expectation / consistency in decision-making) have any force.
(4) 'A prior-approval-granted 8m single-storey rear extension is a Mansell fallback that materially strengthens a planning application for a 4-6m two-storey scheme.' Attack: is there authority that unimplemented PD fallbacks get only limited weight, and what determines the weight (real prospect test)?
(5) '95 Vicarage Road (2020/06341/PA, granted 11 Dec 2020, same officer Leah Russell) approved a retrospective extension that FAILED the 45-Degree Code and numerical guidelines — an on-street consistency precedent.' Sanity-check whether officer-level consistency arguments from a different application at a different house carry real weight.
(6) 'Householder appeals succeed at ~36% nationally (2025/26).' Verify against PINS statistics.
For each claim return CONFIRMED / CORRECTED / UNRESOLVED with reasoning and sources.`, { label: 'verify:merits', phase: 'Verify', schema: VERDICT, effort: 'high' }),
])
return { results }
