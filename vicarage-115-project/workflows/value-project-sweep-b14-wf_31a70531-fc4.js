export const meta = {
  name: 'value-project-sweep-b14',
  description: 'Find better-value buy/extend/sell project areas within short bike or train ride of B14 7QG',
  phases: [
    { title: 'Area sweep', detail: 'one researcher per area: entry prices, ceilings, £/sqft, constraints' },
    { title: 'Adversarial check', detail: 'challenge margins, constraints, station facts; rank' },
  ],
}

const BENCHMARK = `
CONTEXT (established, do not re-research): The client owns 115 Vicarage Road, Kings Heath, Birmingham B14 7QG (kids' school is in Kings Heath). Their home street has a hard price ceiling: highest ever sale on Vicarage Road is 261 Vicarage Road, detached ~2,960 sq ft, sold £680,000 April 2023 (~£232/sq ft). Kings Heath's best streets average £515–540k; area top ~£754k (All Saints Rd); B14 record ~£875k. Finished mid-market Kings Heath stock trades ~£280–310/sq ft. The client's build economics (panelised system, project-managed): ~£180–200/sq ft (~£1,900–2,200/m²) all-in finished cost for added space. They want to find BETTER-VALUE project areas nearby: buy an unmodernised house, extend (permitted development where possible), refurbish, and sell under a HIGHER ceiling — i.e., areas where (street ceiling) − (entry price of unmodernised stock) − (build cost) − (transaction costs incl. 5% additional-dwelling SDLT surcharge) is much better than their home-street play (~£80–110k net at best).
Today is August 2026. The Camp Hill rail line through Kings Heath is believed to have reopened (stations: Moseley Village, Kings Heath, Pineapple Road) — verify status if relevant to your area.`

const TASK = `
YOUR TASK for your assigned area:
1. Load WebSearch via ToolSearch ("select:WebSearch"). Direct fetches to Rightmove/Zoopla are proxy-blocked (403) but WebSearch works and returns rich snippets — run at least 5–8 varied searches (e.g. "<street> sold prices", "<area> most expensive streets", "<area> house price per square foot", "<area> unmodernised OR "in need of modernisation" house for sale", "<area> conservation area Article 4 direction").
2. ENTRY: find 2–4 concrete examples of what unmodernised or dated 3-bed (semi/detached/large terrace) stock costs to BUY in the area now or recently (address or street, price, date).
3. CEILING: find the 3–5 highest verified sold prices in the area (address/street, price, date, size if given) and the area's realistic 2026 street ceiling. Distinguish the area record from the repeatable ceiling.
4. £/SQFT: what finished/renovated stock achieves per sq ft.
5. CONSTRAINTS: conservation areas, Article 4 directions removing PD rights, Bournville Village Trust estate-management scheme / covenants, flood zones — anything that changes project viability. Be specific about WHICH streets are constrained vs free.
6. COMMUTE: bike time and train option from B14 7QG (Vicarage Road, near Kings Heath High Street).
7. ARCHETYPE + MARGIN: name the specific project shape that works there (e.g. "buy dated 3-bed semi ~£X on <street type>, add 40m² rear+loft at ~£85k, sell ~£Y") and estimate net margin AFTER 5% SDLT surcharge + ~£5k fees + build cost at £180–200/sq ft. Be honest — if the area's £/sq ft is below ~£250 the extend-arbitrage usually fails; say so.
Return ONLY the structured object. Cite source URLs. Mark confidence honestly — sold-price snippets can be stale.`

const SCHEMA = {
  type: 'object',
  required: ['area', 'commute', 'entry_examples', 'ceiling_examples', 'realistic_ceiling_2026', 'ppsqft_finished', 'planning_constraints', 'project_archetype', 'est_net_margin', 'verdict', 'confidence', 'sources'],
  properties: {
    area: { type: 'string' },
    commute: { type: 'string', description: 'bike minutes + train option from B14 7QG' },
    entry_examples: { type: 'array', items: { type: 'string' } },
    ceiling_examples: { type: 'array', items: { type: 'string' } },
    realistic_ceiling_2026: { type: 'string' },
    ppsqft_finished: { type: 'string' },
    planning_constraints: { type: 'string' },
    project_archetype: { type: 'string' },
    est_net_margin: { type: 'string', description: 'net £ after SDLT surcharge, fees, build cost — show the arithmetic briefly' },
    verdict: { type: 'string', description: 'one sentence: better or worse than the B14 7QG home play, and why' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    sources: { type: 'array', items: { type: 'string' } },
  },
}

const AREAS = [
  { key: 'moseley', brief: 'MOSELEY B13 (Alcester Rd corridor, St Agnes, School Rd, Wake Green Rd, Amesbury Rd, Chantry Rd, Anderton Park Rd). ~8–10 min bike, 1 stop on Camp Hill line (Moseley Village). Reputed ceiling £900k–£1.5m+. Check St Agnes & Moseley conservation areas and any Article 4 carefully — which streets are OUTSIDE them.' },
  { key: 'stirchley', brief: 'STIRCHLEY B30 (Pershore Rd corridor, Hazelwell, Cartland Rd, Fordhouse Lane; Pineapple Road station). ~10 min bike. Gentrifying fast off a low base — check whether ceiling has risen enough for extend-arbitrage or whether it is still a pure-refurb market.' },
  { key: 'selly-park', brief: 'SELLY PARK B29 (Selly Park Road, Oakfield Rd, Elmdon Rd, Bristol Rd side — NOT student Selly Oak). ~15 min bike. Big Victorian villas, hospital/QE professional buyers. Check Selly Park conservation area boundaries.' },
  { key: 'bournville-cotteridge', brief: 'BOURNVILLE + COTTERIDGE B30 (Bournville station on Cross-City line). ~15–20 min bike. CRITICAL: Bournville Village Trust estate-management scheme + covenants suppress PD on Trust land — identify which streets are OFF-Trust (e.g. Cotteridge side) where projects are viable. Strong price premium.' },
  { key: 'hall-green', brief: 'HALL GREEN B28 (Stratford Rd corridor, Robin Hood, Hall Green & Spring Rd stations). ~12–15 min bike. Deep stock of 1930s semis. Check whether ceiling supports extension arbitrage or caps like Kings Heath.' },
  { key: 'kings-norton', brief: 'KINGS NORTON + WEST HEATH B38 (Kings Norton station, The Green conservation area). ~20 min bike / train via Cross-City. Cheap entry — question is whether any street ceiling is high enough.' },
  { key: 'balsall-heath-cannon-hill', brief: 'BALSALL HEATH / CANNON HILL / EDGBASTON FRINGE B12–B15 (Cannon Hill Park borders, Edgbaston cricket ground side, Priory/Park Hill roads on the B5 fringe). ~10–12 min bike. Big unmodernised Victorian stock near the park; check which pockets have professional-buyer ceilings vs which stay HMO-priced, and HMO Article 4 (city-wide in Birmingham?).' },
  { key: 'billesley-yardley-wood', brief: 'BILLESLEY / YARDLEY WOOD B13/B14 (Yardley Wood station, Trittiford/Chinn Brook side, Wheelers Lane area). ~8–12 min bike. Cheapest entry near the school — test honestly whether ANY project beats the home play or whether ceilings are too low.' },
]

phase('Area sweep')
const results = await parallel(AREAS.map(a => () =>
  agent(`${BENCHMARK}\n\nASSIGNED AREA: ${a.brief}\n${TASK}`, { label: `area:${a.key}`, phase: 'Area sweep', schema: SCHEMA })
))

const clean = results.filter(Boolean)

phase('Adversarial check')
const review = await agent(`${BENCHMARK}
You are the adversarial reviewer. Below are structured findings from 8 area researchers. Your job:
1. CHALLENGE each area's est_net_margin arithmetic: entry + build (£180–200/sq ft on ADDED space, plus ~£20–40k refurb of existing fabric) + 5% SDLT surcharge on purchase + ~£5k fees + selling costs ~1.5% — does the claimed margin survive? Recompute where wrong.
2. CHALLENGE ceilings: is the claimed 2026 ceiling supported by a named sale, or hope? Downgrade unsupported ones.
3. CHALLENGE constraints: Bournville Village Trust scheme, conservation areas/Article 4 in Moseley & Selly Park, Birmingham's city-wide HMO Article 4 (verify via WebSearch — load it via ToolSearch first), Camp Hill line station opening status. Correct any researcher who got these wrong.
4. RANK all areas by realistic net margin per project and by margin-per-£-deployed. Name a top 3 with one-line reasons, and name the areas to AVOID with reasons.
Use WebSearch to verify the 3–4 most load-bearing claims only. Return the structured object.

RESEARCHER FINDINGS:
${JSON.stringify(clean, null, 1)}`, {
    label: 'adversarial-review', phase: 'Adversarial check', effort: 'high',
    schema: {
      type: 'object',
      required: ['corrections', 'ranking', 'top3', 'avoid', 'verified_facts'],
      properties: {
        corrections: { type: 'array', items: { type: 'string' }, description: 'each: area — what was wrong — corrected figure/fact' },
        ranking: { type: 'array', items: { type: 'string' }, description: 'all areas ranked, each with corrected net margin estimate' },
        top3: { type: 'array', items: { type: 'string' } },
        avoid: { type: 'array', items: { type: 'string' } },
        verified_facts: { type: 'array', items: { type: 'string' }, description: 'station status, Article 4 / HMO / BVT facts as verified' },
      },
    },
  })

return { areas: clean, review }