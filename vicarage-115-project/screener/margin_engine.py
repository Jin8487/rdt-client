"""Margin engine for the B14-radius deal screener.

underwrite() = exit − (entry + SDLT + buy fees + build + refurb + selling [+ finance])
exit = min(area ceiling, finished sqft × area finished £/sqft), price-type adjusted entry.
"""

# ---------- SDLT: England residential, additional dwelling (2026 rules) ----------
# Standard bands + 5% surcharge on the full price (Finance Act rates from 31 Oct 2024).
STD_BANDS = [(125_000, 0.00), (250_000, 0.02), (925_000, 0.05), (1_500_000, 0.10), (float("inf"), 0.12)]
SURCHARGE = 0.05

def sdlt_additional(price: float) -> float:
    tax, prev = 0.0, 0.0
    for cap, rate in STD_BANDS:
        band = max(0.0, min(price, cap) - prev)
        tax += band * rate
        prev = cap
        if price <= cap:
            break
    return round(tax + price * SURCHARGE)

# ---------- Area calibration v1 (from the 8-area sweep; recalibrate on review) ----------
# ppsf = evidenced finished £/sqft; ceiling = repeatable 2026 street ceiling (not the record);
# pd = whether the PD extend model survives (False = CA/Article4/BVT → planning route, no PD loft).
AREAS = {
    "moseley-prime":      dict(ppsf=385, ceiling=1_300_000, pd=False, ev="27 Chantry Rd £1.28m '25; 53 Chantry unmod £785k Jan '26"),
    "moseley-outer":      dict(ppsf=330, ceiling=900_000,  pd=True,  ev="School Rd £351/sqft; Grove Ave £900k"),
    "selly-park-villa":   dict(ppsf=355, ceiling=950_000,  pd=False, ev="96 Oakfield £1.14m '24; Selly Park Rd ~£370/sqft"),
    "selly-park-south":   dict(ppsf=290, ceiling=320_000,  pd=True,  ev="terrace grid; Rea flood corridor"),
    "kings-heath-top":    dict(ppsf=300, ceiling=725_000,  pd=True,  ev="261 Vicarage £680k '23 @£232/sqft big; mid stock £280-310"),
    "kings-heath-mid":    dict(ppsf=290, ceiling=550_000,  pd=True,  ev="best-street averages £515-540k"),
    "cotteridge-offtrust":dict(ppsf=300, ceiling=560_000,  pd=True,  ev="B30 3 samples £291-326/sqft; MHR £700k+ askings unproven"),
    "stirchley":          dict(ppsf=300, ceiling=460_000,  pd=True,  ev="record £520k '22; repeatable £425-475k"),
    "kings-norton":       dict(ppsf=270, ceiling=470_000,  pd=True,  ev="sweep: low ceiling"),
    "balsall-heath":      dict(ppsf=250, ceiling=450_000,  pd=True,  ev="pending sweep result — provisional"),
    "cannon-hill-edgbaston-fringe": dict(ppsf=300, ceiling=800_000, pd=False, ev="pending sweep result — provisional"),
    "hall-green":         dict(ppsf=270, ceiling=500_000,  pd=True,  ev="sweep: £25-50k typical net"),
    "billesley-yardley-wood": dict(ppsf=250, ceiling=400_000, pd=True, ev="pending sweep result — provisional"),
}

REFURB_RATE = {"light": 25, "medium": 50, "full": 90}
PRICE_ADJ = {"asking": 0.97, "offers-over": 1.02, "guide": 1.08, "sold-recent": 1.00}  # expected completion vs quoted

def underwrite(price, area_key, existing_sqft, addable_sqft, condition,
               price_type="asking", build_ppsf=190, buy_fees=5_000,
               selling_rate=0.015, selling_legal=1_500,
               finance=False, finance_months=9, finance_rate_pm=0.0095, ltv=0.75,
               ppsf_override=None, ceiling_override=None):
    a = AREAS[area_key]
    ppsf = ppsf_override or a["ppsf"]
    ceiling = ceiling_override or a["ceiling"]
    entry = price * PRICE_ADJ[price_type]

    # Don't build sqft the ceiling won't pay for: clip added space to what earns full rate.
    headroom_sqft = max(0.0, ceiling / ppsf - existing_sqft)
    used_add = min(addable_sqft, headroom_sqft)
    wasted_add = addable_sqft - used_add

    finished_sqft = existing_sqft + used_add
    exit_price = min(ceiling, finished_sqft * ppsf)

    stamp = sdlt_additional(entry)
    build = used_add * build_ppsf
    refurb = existing_sqft * REFURB_RATE[condition]
    selling = exit_price * selling_rate + selling_legal
    fin = (entry * ltv + build + refurb) * finance_rate_pm * finance_months if finance else 0.0

    total_in = entry + stamp + buy_fees + build + refurb + selling + fin
    margin = exit_price - total_in
    cash = entry * (1 - ltv) + stamp + buy_fees + build + refurb if finance else total_in - selling
    return dict(entry=round(entry), sdlt=stamp, build=round(build), refurb=round(refurb),
                selling=round(selling), finance=round(fin), exit=round(exit_price),
                margin=round(margin), total_in=round(total_in),
                roi_pct=round(100 * margin / total_in, 1),
                used_add=round(used_add), wasted_add=round(wasted_add),
                pd=a["pd"], evidence=a["ev"])

# ============================== TESTS ==============================
if __name__ == "__main__":
    P = F = 0
    def check(name, got, want, tol=0):
        global P, F
        lo, hi = (want - tol, want + tol) if not isinstance(want, tuple) else want
        ok = lo <= got <= hi
        P, F = P + ok, F + (not ok)
        print(f"{'PASS' if ok else 'FAIL'}  {name}: got {got:,.0f} want {f'{lo:,.0f}–{hi:,.0f}' if isinstance(want, tuple) or tol else f'{want:,.0f}'}")

    print("— SDLT (additional dwelling, 5% surcharge) vs hand-worked sweep figures —")
    check("SDLT £290k (Hall Green agent: £19k)", sdlt_additional(290_000), 19_000)
    check("SDLT £430k (Moseley agent: £33k)", sdlt_additional(430_000), 33_000)
    check("SDLT £550k (Selly Park agent: £45k)", sdlt_additional(550_000), 45_000)
    check("SDLT £785k (Moseley agent: £68.6k)", sdlt_additional(785_000), 68_500, tol=200)
    check("SDLT £1.0m (band cross-check)", sdlt_additional(1_000_000), 93_750)  # 43.75k std + 50k

    print("— Backtests vs the researched archetypes (sold-recent → no price adj) —")
    sp = underwrite(550_000, "selly-park-villa", 2_200, 400, "medium", price_type="sold-recent")
    check("Selly Park villa margin (agent ~£120k excl. selling)", sp["margin"], (95_000, 130_000))
    # Engine is deliberately MORE conservative than the researcher here: it charges selling
    # costs and prices exit at £385/sqft rather than assuming the £1.28m Chantry comp repeats.
    mo = underwrite(785_000, "moseley-prime", 3_200, 0, "full", price_type="sold-recent", buy_fees=8_000)
    check("Moseley Chantry villa, engine-conservative exit", mo["margin"], (50_000, 90_000))
    mo_hi = underwrite(785_000, "moseley-prime", 3_200, 0, "full", price_type="sold-recent", buy_fees=8_000, ppsf_override=400)
    check("Moseley Chantry villa at £400/sqft exit (27 Chantry comp)", mo_hi["margin"], (95_000, 200_000))
    st = underwrite(315_000, "stirchley", 1_000, 450, "medium", price_type="sold-recent")
    check("Stirchley semi-extend is NEGATIVE (agent: −£35k)", st["margin"], (-70_000, -5_000))
    kh = underwrite(430_000, "kings-heath-top", 1_776, 700, "medium", price_type="sold-recent")
    check("Home play (115-type, bought at market) small/borderline", kh["margin"], (-20_000, 60_000))

    print("— Engine behaviour —")
    big = underwrite(550_000, "selly-park-villa", 2_400, 2_000, "medium", price_type="sold-recent")
    check("Ceiling clip: never builds past the ceiling (wasted>0)", big["wasted_add"], (1, 2_000))
    check("Ceiling clip: exit == ceiling when clipped", big["exit"], 950_000)
    g = underwrite(250_000, "moseley-outer", 1_100, 500, "full", price_type="guide")
    check("Guide-price uplift applied (+8%)", g["entry"], 270_000)
    fin = underwrite(550_000, "selly-park-villa", 2_200, 400, "medium", price_type="sold-recent", finance=True)
    check("Finance toggle reduces margin by ~£45-55k (9mo bridge)", sp["margin"] - fin["margin"], (35_000, 60_000))

    print(f"\n{P} passed, {F} failed")
    raise SystemExit(1 if F else 0)
