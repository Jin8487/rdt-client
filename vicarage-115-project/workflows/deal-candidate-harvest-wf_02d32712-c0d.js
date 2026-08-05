export const meta = {
  name: 'deal-candidate-harvest',
  description: 'Harvest live unmodernised/dated property listings around B14 for the margin screener',
  phases: [
    { title: 'Harvest', detail: 'live listings + auction lots per area' },
    { title: 'Validate', detail: 'dedupe, normalise, sanity-check sizes' },
  ],
}

const CONTEXT = `
You are sourcing CANDIDATE PROJECT PROPERTIES for a Birmingham developer's margin screener. Today is August 2026.
The buyer profile: project-manages a panelised build system at ~£185–200/sq ft for ADDED space, refurbs existing fabric at £25 (light) / £50 (medium) / £90 (full gut) per sq ft, pays 5% additional-dwelling SDLT surcharge. Target: houses that can be bought dated/unmodernised, extended (PD where rights survive) and/or refurbished, then sold at the area's finished £/sq ft.
METHOD: Load WebSearch via ToolSearch ("select:WebSearch"). Direct property-portal fetches are proxy-blocked; WebSearch snippets are your data. Run 6–10 varied searches: '"<area>" "in need of modernisation" for sale', '"requires updating" <area> house', '<area> probate OR "no upward chain" house for sale', '<area> auction guide price house 2026', 'site:rightmove.co.uk OR site:onthemarket.com <street> for sale', etc.
RULES for each candidate: real, specific, current (live listing, current/recent auction lot, or under-offer within ~6 months). Record price and price_type honestly (asking/guide/offers-over). If floor area is not stated, ESTIMATE existing_sqft from type+beds+era (state the basis in sqft_source): Victorian villa 5-6 bed 2,200–3,200; Edwardian 4-bed semi 1,500–1,900; 1930s 3-bed semi 1,000–1,200; large terrace 1,100–1,400. Estimate addable_sqft: full PD rights → rear single-storey ~350–450 + loft dormer ~250–350 sq ft; conservation-area/Article 4 street → planning-route rear only ~300–400 and NO PD loft (note it). Only include candidates with a plausible route to profit — but include borderline ones and let the engine decide. 5–12 candidates per agent. Cite the listing URL for every candidate.`

const CAND = {
  type: 'object',
  required: ['candidates'],
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        required: ['label', 'area_key', 'price', 'price_type', 'beds', 'ptype', 'existing_sqft', 'sqft_source', 'condition', 'addable_sqft', 'constraint_notes', 'url', 'status'],
        properties: {
          label: { type: 'string', description: 'address or street + short descriptor' },
          area_key: { type: 'string', description: 'one of: moseley-prime, moseley-outer, selly-park-villa, selly-park-south, kings-heath-top, kings-heath-mid, cotteridge-offtrust, stirchley, kings-norton, balsall-heath, cannon-hill-edgbaston-fringe, hall-green, billesley-yardley-wood' },
          price: { type: 'number' },
          price_type: { type: 'string', enum: ['asking', 'guide', 'offers-over', 'sold-recent'] },
          beds: { type: 'number' },
          ptype: { type: 'string', description: 'detached/semi/terrace/villa etc' },
          existing_sqft: { type: 'number' },
          sqft_source: { type: 'string', description: 'listed | epc | estimated (basis)' },
          condition: { type: 'string', enum: ['light', 'medium', 'full'] },
          addable_sqft: { type: 'number' },
          constraint_notes: { type: 'string', description: 'CA/Article4/BVT/flood/lease/covenant flags, or "full PD"' },
          url: { type: 'string' },
          status: { type: 'string', description: 'live | auction <date> | under-offer | sold-stc' },
          notes: { type: 'string' },
        },
      },
    },
  },
}

const BEATS = [
  { key: 'moseley', brief: 'MOSELEY B13. Priority 1: unmodernised PERIOD VILLAS/large semis on or near the prime grid (Chantry Rd, Amesbury Rd, St Agnes Rd, Oxford Rd, Wake Green Rd, Salisbury Rd, Park Hill, Yew Tree Rd, Dyott Rd, Colmore Crescent, Greenhill Rd) — these are CA/Article 4 streets, note that. Priority 2: dated stock on the OUTSIDE-CA streets (Anderton Park Rd, Leighton Rd, Cambridge Rd, School Rd south end, Springfield Rd, Park Rd/College Rd fringe) where full PD survives. Benchmark: 53 Chantry Rd unmodernised sold £785k Jan 2026; finished prime villas £1.0–1.35m.' },
  { key: 'selly-park', brief: 'SELLY PARK B29 villa core: Oakfield Rd, Selly Park Rd, Elmdon Rd, Serpentine Rd, Selly Wick Rd/Drive, Upland Rd, Warwards Lane. Dated villas/big semis only — NOT the Kitchener/Cecil flood-grid terraces. Note CA/Article 4 on the core streets; Upland Rd + Warwards Lane are outside the CA. Benchmark: dated Oakfield Rd £600k Mar 2026; finished £819k–£1.14m.' },
  { key: 'kings-heath', brief: 'KINGS HEATH B14 top streets: Vicarage Rd itself, All Saints Rd, Stanley Rd, Livingstone Rd, Ashfield Ave, Hazelhurst Rd, Grange Rd, Cambridge Rd, plus the Highbury Park fringe. Dated/probate 3–4 beds and anything with a big plot. Full PD everywhere (no CA in Kings Heath). Ceiling £680–725k — so only candidates with CHEAP entry (sub-£450k with size, or sub-£350k with land) are viable. Look hard for probate and "no chain requiring modernisation" stock.' },
  { key: 'cotteridge-kn', brief: 'COTTERIDGE / KINGS NORTON off-Trust: Middleton Hall Rd, Westhill Rd, Midland Rd, Northfield Rd, Beaumont Rd, Franklin Rd, Mary Vale Rd, and Kings Norton B38 (Westhill Rd, The Green fringe — note Kings Norton Green CA). Full PD off-Trust; flag anything on BVT land (reject) or in the Rea flood corridor. Interested in big-footprint dated semis (the £850k 8-bed asking on MHR shows the size ceiling being tested).' },
  { key: 'auctions', brief: 'AUCTION SWEEP: current and next-catalogue lots from Bond Wolfe, SDL Property Auctions, First For Auctions, GoTo/Brookvale, Cottons — residential houses in B12, B13, B14, B29, B30, B38 with guides. Auction lots are where £150k margins hide. Get lot number, guide, auction date. Flag leaseholds, short leases, structural issues, and bring-back-into-use covenants where mentioned.' },
  { key: 'balsall-heath-cannon-hill', brief: 'BALSALL HEATH / CANNON HILL / EDGBASTON FRINGE B12–B15: big unmodernised Victorian villas near Cannon Hill Park (Edgbaston Rd, Willows Rd/Crescent, Cannon Hill Rd, Park Hill fringe) and the B5/B15 Calthorpe Estate edge (note Calthorpe Estate scheme of management + Edgbaston CA if applicable — flag). Also check whether Birmingham city-wide HMO Article 4 affects resale of large houses there. Cheap big footprints — but be honest about which pockets have owner-occupier ceilings vs HMO-priced streets.' },
]

phase('Harvest')
const raw = await parallel(BEATS.map(b => () =>
  agent(`${CONTEXT}\n\nYOUR BEAT: ${b.brief}`, { label: `harvest:${b.key}`, phase: 'Harvest', schema: CAND })
))

const all = raw.filter(Boolean).flatMap(r => r.candidates)
log(`${all.length} raw candidates harvested`)

phase('Validate')
const validated = await agent(`You are the validator for a property-deal screener. Below are ${all.length} harvested candidate properties around south Birmingham. Your tasks:
1. DEDUPE: same property found by two agents → keep one, merge notes.
2. NORMALISE area_key to exactly one of: moseley-prime, moseley-outer, selly-park-villa, selly-park-south, kings-heath-top, kings-heath-mid, cotteridge-offtrust, stirchley, kings-norton, balsall-heath, cannon-hill-edgbaston-fringe, hall-green, billesley-yardley-wood. Prime vs outer Moseley: prime = Chantry/Amesbury/St Agnes/Oxford/Wake Green/Salisbury/Park Hill/Yew Tree/Dyott/Colmore Cres/Greenhill (CA streets); outer = outside the two CAs.
3. SANITY-CHECK sizes: existing_sqft consistent with beds/type/era (fix obviously wrong estimates, note the fix); addable_sqft consistent with constraint_notes (CA street → no PD loft in the number).
4. FLAG problems: leasehold/short lease, BVT/Calthorpe covenants, flood streets (Cartland Rd, Dogpool Lane, Kitchener/Cecil grid, the Avenues), bring-back-into-use covenants, HMO-priced streets.
5. Drop only true junk (duplicates, non-houses, outside the bike/train radius); keep borderline candidates with honest flags.
Return the cleaned candidate list in the same schema, sorted by area_key.
CANDIDATES: ${JSON.stringify(all)}`, { label: 'validate-dedupe', phase: 'Validate', schema: CAND, effort: 'high' })

return { candidates: validated ? validated.candidates : all, raw_count: all.length }