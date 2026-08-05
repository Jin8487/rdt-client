export const meta = {
  name: 'layout-options-115-vicarage',
  description: 'Design and judge broken-plan layout options for the extended house',
  phases: [
    { title: 'Design', detail: '3 independent layout schemes' },
    { title: 'Judge', detail: 'score and select' },
  ],
}

const BRIEF = `Design a room-by-room layout for an extended 1930s detached house, 115 Vicarage Road, Kings Heath, Birmingham. You must give room dimensions (m x m) and positions that add up EXACTLY within the given envelopes.

GEOMETRY (all firm):
- GROUND FLOOR available: (a) existing main house body 8.05m wide x 5.4m deep (front wall to original rear wall), with front bay to lounge; (b) attached garage 2.52m wide x ~5.4m deep on the SE side - MUST REMAIN A GARAGE (cars/storage, door to street); (c) NEW full-width rear zone 10.35m wide x 6.7m deep beyond the original rear wall (all-new build, fully open-spannable, no internal structure needed - posi joists span it). Total GF living ~113m2 + garage.
- Existing GF rooms (can all be remodelled; internal walls non-loadbearing after frame): THROUGH LOUNGE (front, with bay, SW side ~4.2m wide), STUDY, LOBBY, HALL with central stair, garage behind its own wall.
- Side access: a ~1m external alley along the NW flank (No.113 side) leading from the front to the rear garden - the everyday side entrance. Boot room wanted at this side entry.
- FIRST FLOOR available: existing floor 8.05m x 5.4m (currently 4 beds + bath + landing, central stair) + wing over garage 2.52m wide (existing room) + NEW rear zone 10.35m wide x 5.0m deep. Total ~110m2.
- LOFT (new crown roof over everything): central flat-ceiling zone ~21m2 at full 2.0m headroom, sloping sides usable above 1.5m for ~15m2 more; stair must rise from first-floor landing area; rear-slope rooflights face the garden (SE).
- Orientation: rear/garden = SOUTH-EAST (morning-to-midday sun in garden and rear rooms). Front = NW.
- Windows: rear zone can have any glazing to the garden (bifolds etc); flank windows must be obscure glazed; front elevation unchanged.

HOUSEHOLD BRIEF (from the owners):
- Couple + THREE TEENS + GRANDPARENTS who live in for HALF the year.
- Grandparents: FIRST FLOOR suite - they struggle with stairs, so the plan MUST include easy vertical access (design a stairlift-friendly straight stair AND/OR a stacked-cupboard shaft GF-to-FF sized for a future through-floor home lift ~1.1x1.6m, positioned to open near their room). Their suite needs: bedroom + own en-suite + a SITTING AREA (sofa + TV) so they can retreat from noisy grandchildren. Target 20-26m2 total.
- 5 bed / 3 bath overall: loft = master suite (bed + en-suite + dressing). First floor = grandparents suite + 3 teen bedrooms. Family bathroom on first floor.
- Broken-plan ground floor: big kitchen-dining-family across the new rear zone + a SEPARATE closable lounge (the existing front through-lounge is the natural candidate).
- FULL SPICE KITCHEN: enclosed second kitchen ~6-8m2 with wok-capable extract to outside, door-closable from the main kitchen; the main kitchen stays showpiece (island, no wall clutter).
- Big hosting: 20+ person events a couple of times a year - flow between kitchen/dining/family and lounge, guest WC on GF essential (consider wudu-friendly WC with small foot-wash provision), overflow seating.
- Boot room at the side entry (NW flank, near front) - coats, shoes, muddy teens.
- Laundry: FIRST-FLOOR laundry cupboard (washer+dryer stacked + drying cupboard) near bedrooms; garden line drying in summer (rear zone should have a discreet route out).
- Teens have friends over - somewhere they can be that is not the main family room is a plus (loft is parents' - so consider how the family zone/lounge splits).
- Style: minimalist luxury, empty surfaces, storage everywhere it can hide (design in: understairs, landing cupboards, wardrobe walls).

LATEST-RESEARCH PRINCIPLES TO APPLY (cite which you used where):
- Broken-plan zoning: visual connection + acoustic separability (pocket doors/glazed internal screens) beats both full-open and cellular for multigenerational families.
- Kitchen zone theory (not the old work triangle): five zones (consumables, non-consumables, cleaning, prep, cooking); spice kitchen takes the high-heat cooking + mess zones.
- Sightlines: cook must see garden + family zone; grandparents' sitting area should get sun (SE) if possible.
- Deep-plan daylight: the 6.7m-deep rear zone needs rooflights/lightwell over the kitchen run where it meets the old rear wall line (the darkest strip - the old rear wall junction).
- Acoustic: teen bedrooms not sharing walls with grandparents' sitting area; laundry cupboard not on a bedroom wall; soil stacks off bedrooms.
- Ageing-in-place: grandparents' route lift-to-bed-to-ensuite step-free; their en-suite = level-access shower, 900mm door.
- Overheating (TM59): SE glazing needs overhang/blind provision; loft rooflights need blinds; cross-ventilation paths.
- Wet rooms stack: all bathrooms/en-suites/laundry on ONE vertical service wall with the GF spice kitchen/WC - one soil stack (this is a HARD constraint from the build strategy).

OUTPUT: a structured scheme: per floor, list每room: name, dimensions (m x m), position (which corner/edge, what it adjoins), door positions, window/rooflight strategy. State where the stair to loft goes, where the lift shaft/stacked cupboards sit, where the single service wall runs, and a one-paragraph rationale of the strongest moves. Check your arithmetic: room widths across the 10.35m rear zone must sum to 10.35 with ~0.1m partitions; depths must fit 6.7 (GF) / 5.0 (FF). Be honest about the compromise your scheme makes.`

const SCHEME = {
  type: 'object', required: ['name', 'concept', 'ground_floor', 'first_floor', 'loft', 'service_wall', 'vertical_access', 'compromise'],
  properties: {
    name: { type: 'string' }, concept: { type: 'string' },
    ground_floor: { type: 'array', items: { type: 'object', required: ['room','dims','position'], properties: { room:{type:'string'}, dims:{type:'string'}, position:{type:'string'}, notes:{type:'string'} } } },
    first_floor: { type: 'array', items: { type: 'object', required: ['room','dims','position'], properties: { room:{type:'string'}, dims:{type:'string'}, position:{type:'string'}, notes:{type:'string'} } } },
    loft: { type: 'array', items: { type: 'object', required: ['room','dims','position'], properties: { room:{type:'string'}, dims:{type:'string'}, position:{type:'string'}, notes:{type:'string'} } } },
    service_wall: { type: 'string' }, vertical_access: { type: 'string' },
    research_moves: { type: 'array', items: { type: 'string' } },
    compromise: { type: 'string' },
  },
}

phase('Design')
const schemes = await parallel([
  () => agent(`${BRIEF}\n\nYOUR DESIGN PRIORITY: THE GRANDPARENTS AND THE HOSTING. Optimise first for the grandparents' suite quality (sun, quiet, lift adjacency, en-suite) and 20-person event flow; everything else fits around those.`, { label: 'design:multigen-first', phase: 'Design', schema: SCHEME, effort: 'high' }),
  () => agent(`${BRIEF}\n\nYOUR DESIGN PRIORITY: THE SHOWPIECE + TEEN LIFE. Optimise first for the most impressive broken-plan kitchen/dining/family sequence to the garden and for teens (their rooms, their friends, their noise contained); everything else fits around those.`, { label: 'design:showpiece-first', phase: 'Design', schema: SCHEME, effort: 'high' }),
  () => agent(`${BRIEF}\n\nYOUR DESIGN PRIORITY: SERVICES, COST AND FUTURE-PROOFING. Optimise first for the single service wall, shortest pipe runs, the lift shaft that genuinely works GF-FF, minimal structure, and rooms that can swap roles over 15 years; everything else fits around those.`, { label: 'design:pragmatist', phase: 'Design', schema: SCHEME, effort: 'high' }),
])

phase('Judge')
const verdict = await agent(`You are the design judge. Here are three layout schemes for the same brief:\n\nSCHEME A (multigen-first): ${JSON.stringify(schemes[0])}\n\nSCHEME B (showpiece-first): ${JSON.stringify(schemes[1])}\n\nSCHEME C (pragmatist): ${JSON.stringify(schemes[2])}\n\nThe brief's hard requirements: grandparents' FF suite (bed+sitting+ensuite, lift-ready access), 3 teen beds FF, loft master suite, broken-plan GF with closable lounge, full spice kitchen, boot room at NW side entry, GF guest WC, FF laundry cupboard, garage retained, ONE vertical service wall, arithmetic that fits 10.35m x 6.7m (GF) and 10.35m x 5.0m (FF) new zones + 8.05x5.4 existing.\n\nScore each scheme 1-10 on: (1) grandparent suite quality & lift logic, (2) kitchen/spice-kitchen/hosting function, (3) teen life & acoustics, (4) service-wall discipline & buildability, (5) daylight & orientation use, (6) arithmetic actually adds up (CHECK the numbers), (7) luxury feel/emptiness/storage. Identify the single best scheme, the best 2-3 moves worth STEALING from the others into it, and any arithmetic errors that must be fixed. Return: scores table, winner, steal-list, fix-list.`, { label: 'judge', phase: 'Judge', effort: 'high' })

return { schemes, verdict }
