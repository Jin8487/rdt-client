/* Deal-screener margin engine — mirrors margin_engine.py (calibration v2, post adversarial review).
   Plain script: attaches SCREENER to globalThis so it runs in the artifact page and under node. */
(function () {
  "use strict";

  // ---- SDLT: England residential standard bands + additional-dwelling surcharge ----
  const STD_BANDS = [
    [125000, 0.0],
    [250000, 0.02],
    [925000, 0.05],
    [1500000, 0.1],
    [Infinity, 0.12],
  ];

  function sdltAdditional(price, surchargePct) {
    let tax = 0, prev = 0;
    for (const [cap, rate] of STD_BANDS) {
      const band = Math.max(0, Math.min(price, cap) - prev);
      tax += band * rate;
      prev = cap;
      if (price <= cap) break;
    }
    return Math.round(tax + (price * surchargePct) / 100);
  }

  // ---- Area calibration v2 (8-area sweep + adversarial review, Aug 2026) ----
  // ppsf: evidenced finished £/sqft · ceiling: repeatable 2026 exit cap (not the record)
  // pd: PD-extend model survives (false = CA/Article4/estate scheme → planning route)
  // bike: minutes from B14 7QG by cycle · train: usable station or null
  const AREAS = {
    "moseley-prime": { name: "Moseley — prime villa grid", ppsf: 400, ceiling: 1300000, pd: false, bike: 9, train: "Moseley Village (Camp Hill)", ev: "27 Chantry Rd £1.28m Feb '26−1; 53 Chantry unmod £785k Jan '26; reviewed net £110–180k" },
    "moseley-outer": { name: "Moseley — outside the CAs", ppsf: 330, ceiling: 900000, pd: true, bike: 8, train: "Moseley Village (Camp Hill)", ev: "School Rd £351/sqft; Grove Ave £900k; mid-market extend ≈ £0 — entry fully priced" },
    "selly-park-villa": { name: "Selly Park — villa core", ppsf: 355, ceiling: 950000, pd: false, bike: 15, train: null, ev: "96 Oakfield £1.14m Apr '24; dated £600k Mar '26; reviewed net £75–150k. Upland/Warwards keep PD" },
    "selly-park-south": { name: "Selly Park South terraces", ppsf: 290, ceiling: 320000, pd: true, bike: 14, train: null, ev: "Rea flood corridor; terrace cap ~£310–320k" },
    "kings-heath-top": { name: "Kings Heath — top streets", ppsf: 300, ceiling: 725000, pd: true, bike: 3, train: "Kings Heath (Camp Hill)", ev: "261 Vicarage £680k '23; home-play benchmark £80–110k" },
    "kings-heath-mid": { name: "Kings Heath — mid streets", ppsf: 290, ceiling: 550000, pd: true, bike: 5, train: "Kings Heath (Camp Hill)", ev: "best-street averages £515–540k" },
    "cotteridge-offtrust": { name: "Cotteridge / off-Trust B30", ppsf: 300, ceiling: 600000, pd: true, bike: 12, train: "Kings Norton (Camp Hill + Cross-City)", ev: "reviewed: underwrite £560–650k proven exits, NOT the £700k+ MHR askings; budget archetype ~£45k" },
    "stirchley": { name: "Stirchley", ppsf: 300, ceiling: 460000, pd: true, bike: 10, train: "Pineapple Rd (Camp Hill)", ev: "reviewed net £0–10k — entry already gentrified; avoid for flips" },
    "kings-norton": { name: "Kings Norton B38", ppsf: 285, ceiling: 470000, pd: true, bike: 20, train: "Kings Norton (Camp Hill + Cross-City)", ev: "reviewed net £5–35k, base ~£5k; Green CA pockets" },
    "balsall-heath": { name: "Balsall Heath core", ppsf: 215, ceiling: 400000, pd: true, bike: 11, train: null, ev: "reviewed net £0–15k; £/sqft barely clears build cost; avoid" },
    "cannon-hill-edgbaston-fringe": { name: "Cannon Hill / Edgbaston fringe", ppsf: 230, ceiling: 420000, pd: true, bike: 12, train: null, ev: "park pocket in Rea flood-warning corridor; Calthorpe side needs estate consent" },
    "hall-green": { name: "Hall Green", ppsf: 275, ceiling: 500000, pd: true, bike: 13, train: "Hall Green (Shakespeare line)", ev: "reviewed net £10–20k — dated entry within £25/sqft of finished" },
    "edgbaston-calthorpe": { name: "Edgbaston — Calthorpe Estate", ppsf: 450, ceiling: 1500000, pd: false, bike: 16, train: "Five Ways (Cross-City)", ev: "Sir Harrys Rd solds £850k–£1.8m; Calthorpe scheme-of-management consent + CA on top of planning — high friction, high ceiling" },
    "billesley-yardley-wood": { name: "Billesley / Yardley Wood", ppsf: 245, ceiling: 440000, pd: true, bike: 9, train: "Yardley Wood (Shakespeare line)", ev: "Haunch/Wheelers border only; estate core modelled at a loss" },
  };

  // ---- Geography: outcode parsing + great-circle distance ----
  const HOME = { lat: 52.429, lon: -1.8931 }; // B14 7QG, Vicarage Rd

  function parseOutcode(str) {
    const m = String(str || "").trim().toUpperCase().match(/^([A-Z]{1,2}\d{1,2}[A-Z]?)\s*(\d[A-Z]{2})?$/);
    return m ? m[1] : null;
  }

  function haversineMiles(a, b) {
    const R = 3958.8, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  // District each area's stock sits in (for postcode-radius coverage mode)
  const AREA_DISTRICT = {
    "moseley-prime": "B13", "moseley-outer": "B13", "selly-park-villa": "B29", "selly-park-south": "B29",
    "kings-heath-top": "B14", "kings-heath-mid": "B14", "cotteridge-offtrust": "B30", "stirchley": "B30",
    "kings-norton": "B38", "balsall-heath": "B12", "cannon-hill-edgbaston-fringe": "B12",
    "hall-green": "B28", "billesley-yardley-wood": "B13", "edgbaston-calthorpe": "B15",
  };

  const REFURB_RATE = { light: 25, medium: 50, full: 90 };
  const PRICE_ADJ = { asking: -3, "offers-over": 2, guide: 8, "sold-recent": 0 };

  const DEFAULTS = {
    threshold: 150000,
    buildPpsf: 190,
    refurbLight: 25, refurbMedium: 50, refurbFull: 90,
    contingencyPct: 10,
    buyFees: 5000,
    surchargePct: 5,
    adjAsking: -3, adjOffersOver: 2, adjGuide: 8,
    sellingPct: 1.5, sellingLegal: 1500,
    planningCost: 6000,
    exitAdjPct: 0,
    finance: false, financeMonths: 9, financeRatePm: 0.95, ltv: 75,
    maxBike: 30, requireTrain: false,
    maxEntry: 1500000, minBeds: 0, minSqft: 0,
    pdOnly: false, excludeFlood: false, excludeLease: false,
  };

  function underwrite(cand, s, areaOverrides) {
    const base = AREAS[cand.area_key];
    if (!base) return null;
    const ov = (areaOverrides && areaOverrides[cand.area_key]) || {};
    const ppsf = (ov.ppsf || base.ppsf) * (1 + s.exitAdjPct / 100);
    const ceiling = (ov.ceiling || base.ceiling) * (1 + s.exitAdjPct / 100);

    const adjPct = cand.price_type === "asking" ? s.adjAsking
      : cand.price_type === "offers-over" ? s.adjOffersOver
      : cand.price_type === "guide" ? s.adjGuide : 0;
    const entry = cand.price * (1 + adjPct / 100);

    // Never pay to build space the ceiling won't buy.
    const headroom = Math.max(0, ceiling / ppsf - cand.existing_sqft);
    const usedAdd = Math.min(cand.addable_sqft, headroom);
    const wastedAdd = cand.addable_sqft - usedAdd;
    const finishedSqft = cand.existing_sqft + usedAdd;
    const exit = Math.min(ceiling, finishedSqft * ppsf);

    const stamp = sdltAdditional(entry, s.surchargePct);
    const refurbRate = { light: s.refurbLight, medium: s.refurbMedium, full: s.refurbFull }[cand.condition];
    const worksRaw = usedAdd * s.buildPpsf + cand.existing_sqft * refurbRate;
    const works = worksRaw * (1 + s.contingencyPct / 100);
    const planning = base.pd ? 0 : s.planningCost;
    const selling = exit * (s.sellingPct / 100) + s.sellingLegal;
    const fin = s.finance ? (entry * (s.ltv / 100) + works) * (s.financeRatePm / 100) * s.financeMonths : 0;

    const totalIn = entry + stamp + s.buyFees + works + planning + selling + fin;
    const margin = exit - totalIn;
    const cash = s.finance ? entry * (1 - s.ltv / 100) + stamp + s.buyFees + works + planning : totalIn - selling;

    // Sensitivity: margin if exit £/sqft moves ±7.5% (ceiling scaled with it)
    const sens = [-7.5, 7.5].map((d) => {
      const p2 = ppsf * (1 + d / 100), c2 = ceiling * (1 + d / 100);
      const e2 = Math.min(c2, finishedSqft * p2);
      return Math.round(e2 - (totalIn - selling) - (e2 * (s.sellingPct / 100) + s.sellingLegal));
    });

    return {
      entry: Math.round(entry), sdlt: stamp, works: Math.round(works), planning,
      selling: Math.round(selling), finance: Math.round(fin), exit: Math.round(exit),
      totalIn: Math.round(totalIn), margin: Math.round(margin),
      marginLo: sens[0], marginHi: sens[1],
      roiPct: Math.round((1000 * margin) / totalIn) / 10,
      cashNeeded: Math.round(cash),
      marginOnCash: cash > 0 ? Math.round((1000 * margin) / cash) / 10 : null,
      usedAdd: Math.round(usedAdd), wastedAdd: Math.round(wastedAdd),
      finishedSqft: Math.round(finishedSqft),
      bike: cand.bike_min || base.bike, train: base.train, pd: base.pd,
    };
  }

  // ---- Self-test: same expectations as margin_engine.py (calibration v2) ----
  function runTests() {
    const t = [];
    const chk = (name, got, lo, hi) => t.push({ name, got, want: hi === undefined ? `${lo.toLocaleString()}` : `${lo.toLocaleString()}–${hi.toLocaleString()}`, pass: got >= lo && got <= (hi === undefined ? lo : hi) });
    chk("SDLT £290k additional dwelling (hand-worked £19k)", sdltAdditional(290000, 5), 19000);
    chk("SDLT £430k (hand-worked £33k)", sdltAdditional(430000, 5), 33000);
    chk("SDLT £550k (hand-worked £45k)", sdltAdditional(550000, 5), 45000);
    chk("SDLT £785k (hand-worked £68.5k)", sdltAdditional(785000, 5), 68500);
    chk("SDLT £1.0m band cross-check (£93.75k)", sdltAdditional(1000000, 5), 93750);

    const s0 = Object.assign({}, DEFAULTS, { contingencyPct: 0 });
    const sp = underwrite({ area_key: "selly-park-villa", price: 550000, price_type: "sold-recent", existing_sqft: 2200, addable_sqft: 400, condition: "medium" }, s0, null);
    chk("Selly Park villa backtest (review: £75–150k)", sp.margin, 90000, 130000);
    const mo = underwrite({ area_key: "moseley-prime", price: 785000, price_type: "sold-recent", existing_sqft: 3200, addable_sqft: 0, condition: "full" }, Object.assign({}, s0, { buyFees: 8000 }), null);
    chk("Moseley Chantry villa backtest (review: £110–180k)", mo.margin, 90000, 200000);
    const st = underwrite({ area_key: "stirchley", price: 315000, price_type: "sold-recent", existing_sqft: 1000, addable_sqft: 450, condition: "medium" }, s0, null);
    chk("Stirchley semi-extend is negative (review: ≈ −£35k)", st.margin, -75000, -5000);
    const kh = underwrite({ area_key: "kings-heath-top", price: 430000, price_type: "sold-recent", existing_sqft: 1776, addable_sqft: 700, condition: "medium" }, s0, null);
    chk("Kings Heath at-market entry is thin (bought well = £80–110k)", kh.margin, -20000, 60000);

    const big = underwrite({ area_key: "selly-park-villa", price: 550000, price_type: "sold-recent", existing_sqft: 2400, addable_sqft: 2000, condition: "medium" }, s0, null);
    chk("Ceiling clip: wasted sqft detected", big.wastedAdd, 1, 2000);
    chk("Ceiling clip: exit capped at ceiling", big.exit, 950000);
    const g = underwrite({ area_key: "moseley-outer", price: 250000, price_type: "guide", existing_sqft: 1100, addable_sqft: 500, condition: "full" }, s0, null);
    chk("Guide price uplift +8% applied", g.entry, 270000);
    const fin = underwrite({ area_key: "selly-park-villa", price: 550000, price_type: "sold-recent", existing_sqft: 2200, addable_sqft: 400, condition: "medium" }, Object.assign({}, s0, { finance: true }), null);
    chk("9-month bridge costs £35–60k of margin", sp.margin - fin.margin, 35000, 60000);

    const pc = (s2, want) => t.push({ name: `Postcode parse "${s2}"`, got: parseOutcode(s2) === want ? 1 : 0, want: "1", pass: parseOutcode(s2) === want });
    pc("b14 7qg", "B14"); pc("CV1 2AB", "CV1"); pc("B90", "B90"); pc("not a postcode", null);
    const lonBhm = Math.round(haversineMiles({ lat: 51.5074, lon: -0.1278 }, { lat: 52.4862, lon: -1.8904 }));
    chk("Haversine London↔Birmingham ≈ 101 mi", lonBhm, 98, 105);
    const b14b13 = haversineMiles({ lat: 52.4176, lon: -1.8882 }, { lat: 52.4364, lon: -1.8779 });
    chk("B14↔B13 district centroids 1–2 miles", Math.round(b14b13 * 10), 10, 25);
    return t;
  }

  globalThis.SCREENER = { sdltAdditional, underwrite, runTests, AREAS, DEFAULTS, REFURB_RATE, PRICE_ADJ, parseOutcode, haversineMiles, AREA_DISTRICT, HOME };
})();
