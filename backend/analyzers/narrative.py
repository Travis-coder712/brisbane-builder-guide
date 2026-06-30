"""
Claude API narrative generator.

Produces rich natural-language analysis of a generator's bidding behaviour
for a given trading day.  The narrative explains:
  - What the unit actually did (dispatch, revenue)
  - What it could have done differently (forgone revenue, missed intervals)
  - Whether rebids appear strategic or operational
  - How the unit compared to its peers in the same region
  - Notable market events that affected outcomes

The prompt is carefully structured so Claude responds as a NEM market analyst
with deep knowledge of the NER and AEMO dispatch process.
"""

import os
import logging
from datetime import date

import anthropic

from database import get_connection
from config import DUID_MAP, GENERATORS, MARKET_PRICE_CAP

log = logging.getLogger(__name__)

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

SYSTEM_PROMPT = """You are a senior NEM (National Electricity Market) market analyst
with deep expertise in the Australian electricity market rules (NER), AEMO's dispatch
process, and generator bidding strategy.

You understand:
- How 5-minute dispatch intervals work and how RRP is formed by the merit order
- The 10 price-quantity band bidding structure (bands 1–10, $-1000 to $17,500/MWh cap)
- Rebid rules under NER clause 3.8.22 and the non-commercial rebid constraint
- How generators balance dispatch risk (being dispatched below cost) vs revenue
  maximisation (withholding capacity to push up prices)
- Cumulative Price Threshold (CPT), Administered Price Cap (APC) events
- FCAS co-optimisation effects on energy dispatch
- Ramp rate constraints and their impact on availability offers

When analysing bidding behaviour:
- Be specific about dollar amounts, MW, and timing
- Flag potential NER compliance concerns without making legal judgements
- Explain trade-offs the generator faced in plain terms
- Quantify the "what if" — what revenue was left on the table and why
- Note whether outcomes were within the generator's control or driven by system events

Always use Australian market terminology (RRP not LMP, dispatch interval not DI, etc.)
"""


def build_context_payload(duid: str, trading_date: date, timeline: list[dict]) -> str:
    """
    Build a compact JSON-like text block summarising the unit's day.
    Keeps the prompt under ~2000 tokens for speed.
    """
    meta = DUID_MAP.get(duid, {})
    station = meta.get("station", duid)
    participant = meta.get("participant", "Unknown")
    region = meta.get("region", "?")
    capacity = meta.get("capacity_mw", 0)
    fuel = meta.get("fuel", "Unknown")

    # Pull daily summary from analytics table
    conn = get_connection()
    summary = conn.execute("""
        SELECT * FROM analytics_unit_day
        WHERE duid = ? AND trading_date = ?
    """, (duid, trading_date.isoformat())).fetchone()

    rebids = conn.execute("""
        SELECT rebid_at, prior_max_avail, new_max_avail, rrp_at_rebid,
               rrp_5min_after, p5min_price_forecast, classification, rebid_explanation
        FROM rebid_event
        WHERE duid = ? AND date(settlement_date) = ?
        ORDER BY rebid_at
    """, (duid, trading_date.isoformat())).fetchall()

    # Regional RRP summary
    region_summary = conn.execute("""
        SELECT MIN(rrp) as min_rrp, MAX(rrp) as max_rrp, AVG(rrp) as avg_rrp,
               COUNT(CASE WHEN rrp > 300 THEN 1 END) as spike_intervals
        FROM dispatch_price
        WHERE region_id = ?
          AND substr(settlement_date,1,10) LIKE ?
    """, (region, trading_date.strftime("%Y/%m/%d") + "%")).fetchone()

    conn.close()

    lines = [
        f"UNIT: {duid} ({station} Unit, {participant})",
        f"DATE: {trading_date.isoformat()}",
        f"REGION: {region} | FUEL: {fuel} | REGISTERED CAPACITY: {capacity} MW",
        "",
        "=== DAILY PERFORMANCE SUMMARY ===",
    ]

    if summary:
        lines += [
            f"Total Energy Generated: {summary['total_energy_mwh']} MWh",
            f"Actual Revenue: ${summary['actual_revenue']:,.0f}",
            f"Maximum Possible Revenue: ${summary['max_possible_revenue']:,.0f}",
            f"Revenue Efficiency: {summary['revenue_efficiency_pct']:.1f}%",
            f"Intervals as Price Setter: {summary['intervals_price_setter']} of {summary['intervals_available']} available intervals",
            f"Dispatch Rate: {summary['dispatch_rate_pct']:.1f}%",
            f"Average Cleared MW: {summary['avg_cleared_mw']} MW",
            f"Average RRP: ${summary['avg_rrp']:.2f}/MWh",
            f"Rebids: {summary['rebid_count']} total, {summary['strategic_rebid_count']} flagged strategic",
        ]
    else:
        lines.append("(No daily analytics available — raw data only)")

    if region_summary:
        lines += [
            "",
            f"=== REGIONAL MARKET CONDITIONS ({region}) ===",
            f"RRP Range: ${region_summary['min_rrp']:.2f} to ${region_summary['max_rrp']:.2f}/MWh",
            f"Average RRP: ${region_summary['avg_rrp']:.2f}/MWh",
            f"Spike Intervals (>$300): {region_summary['spike_intervals']}",
        ]

    if rebids:
        lines += ["", "=== REBID EVENTS ==="]
        for r in rebids:
            lines.append(
                f"  {r['rebid_at']}: avail {r['prior_max_avail']}→{r['new_max_avail']} MW | "
                f"RRP at rebid ${r['rrp_at_rebid'] or '?'}/MWh | "
                f"RRP 5min later ${r['rrp_5min_after'] or '?'}/MWh | "
                f"P5MIN forecast ${r['p5min_price_forecast'] or 'N/A'}/MWh | "
                f"classification: {r['classification']}"
            )
            if r["rebid_explanation"]:
                lines.append(f"    Reason given: {r['rebid_explanation']}")

    # Add sample of worst forgone-revenue intervals
    if timeline:
        worst = sorted(timeline, key=lambda x: x.get("forgone_revenue", 0), reverse=True)[:5]
        lines += ["", "=== TOP 5 INTERVALS BY FORGONE REVENUE ==="]
        for w in worst:
            if w.get("forgone_revenue", 0) > 0:
                lines.append(
                    f"  {w['settlement_date']}: cleared {w['total_cleared']:.0f} MW of "
                    f"{w['availability']:.0f} MW available | RRP ${w['rrp']:.2f} | "
                    f"forgone ${w['forgone_revenue']:,.0f}"
                )

    return "\n".join(lines)


def generate_narrative(
    duid: str,
    trading_date: date,
    timeline: list[dict],
    focus: str = "all",
) -> str:
    """
    Generate a Claude narrative for one unit on one day.

    focus options:
      'all'      — comprehensive analysis
      'revenue'  — focus on revenue maximisation opportunities
      'rebids'   — focus on rebid behaviour and NER compliance
      'trends'   — compare against prior 7 days
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return (
            "⚠️  Claude API key not configured.  "
            "Add ANTHROPIC_API_KEY to your .env file to enable narrative analysis."
        )

    context = build_context_payload(duid, trading_date, timeline)
    meta = DUID_MAP.get(duid, {})

    focus_instructions = {
        "all": (
            "Provide a comprehensive analysis covering:\n"
            "1. Overall bidding performance assessment (3-4 sentences)\n"
            "2. Revenue optimisation — what was left on the table and why, with specific $ amounts\n"
            "3. Rebid behaviour — classify each rebid and assess NER 3.8.22 compliance risk\n"
            "4. Top 3 actionable recommendations for improved bidding strategy tomorrow\n"
            "5. One sentence on how this unit compared to typical NSW/VIC coal/gas plant performance\n"
            "\nKeep total response under 500 words. Use AUD $ amounts throughout."
        ),
        "revenue": (
            "Focus exclusively on revenue optimisation:\n"
            "1. Identify the 3 largest missed revenue opportunities with exact $ and timing\n"
            "2. Explain WHY each opportunity was missed (constraint, bid position, ramp rate, etc.)\n"
            "3. What specific bid changes would have captured each opportunity?\n"
            "4. Estimate total additional revenue available had bidding been optimal\n"
            "\nBe quantitative. Every claim should reference specific intervals or $ amounts."
        ),
        "rebids": (
            "Focus exclusively on rebid behaviour:\n"
            "1. For each rebid, explain the market context (what was happening with prices)\n"
            "2. Assess whether the rebid reason (if given) is plausible\n"
            "3. Compare rebid timing against P5MIN forecasts — could the participant 'see' the spike coming?\n"
            "4. Rate overall NER 3.8.22 compliance risk: Low / Medium / High, with reasoning\n"
            "5. Note any patterns across rebids (timing, price levels, availability direction)\n"
            "\nBe analytical but avoid definitive legal conclusions."
        ),
        "trends": (
            "Compare this day's performance against the unit's recent history:\n"
            "1. Is today's revenue efficiency above or below recent average?\n"
            "2. Is rebid frequency increasing or decreasing?\n"
            "3. Are dispatch rates trending in line with capacity factor expectations for this fuel type?\n"
            "4. What does the trend suggest about the operator's current bidding strategy?\n"
            "\nUse 'trend' language — 'compared to recent weeks', 'historically this unit', etc."
        ),
    }.get(focus, focus_instructions := "Provide a comprehensive analysis.")

    user_message = f"""Here is the market data for {meta.get('station', duid)} ({duid})
for trading day {trading_date.isoformat()}:

{context}

{focus_instructions}"""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        return response.content[0].text
    except anthropic.APIError as e:
        log.error("Claude API error: %s", e)
        return f"Narrative generation failed: {e}"
