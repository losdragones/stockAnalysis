from __future__ import annotations

from backend.services.strategy_dsl import StrategyDSL


def generate_python_code(name: str, dsl: StrategyDSL) -> str:
    """Generate readable, auditable Python code for the strategy.

    Note: execution uses a controlled runner; this code is stored for audit.
    """
    f = dsl.filters
    e = dsl.exits

    lines: list[str] = []
    lines.append("# Auto-generated strategy code (demo)")
    lines.append("# StrategyName: " + repr(name))
    lines.append("")
    lines.append("def screen(context):")
    lines.append('    \"\"\"Return a pandas.DataFrame of candidates.\"\"\"')
    lines.append("    import pandas as pd")
    lines.append("    universe = context.universe()  # DataFrame with ts_code/name/industry etc.")
    lines.append("    df = context.latest_daily_basic(universe)  # includes pe,total_mv,turnover_rate")
    lines.append("    out = df.copy()")

    if f.peMax is not None:
        lines.append(f"    out = out[out['pe'] <= {float(f.peMax)}]")
    if f.mcapMaxYi is not None:
        # total_mv is usually in 1e4? We'll standardize runner to Yi in context
        lines.append(f"    out = out[out['mcap_yi'] <= {float(f.mcapMaxYi)}]")
    if f.turnMinPct is not None:
        lines.append(f"    out = out[out['turnover_rate'] >= {float(f.turnMinPct)}]")

    if f.tech:
        lines.append(f"    out = context.apply_tech_filter(out, tech={repr(f.tech)})")

    lines.append("    return out.sort_values('turnover_rate', ascending=False).head(200)")
    lines.append("")
    lines.append("def exits(context, position):")
    lines.append('    \"\"\"Return exit rules (for signal generation).\"\"\"')
    lines.append("    rules = {}")
    if e.takeProfitPct is not None:
        lines.append(f"    rules['take_profit_pct'] = {float(e.takeProfitPct)}")
    if e.stopLossPct is not None:
        lines.append(f"    rules['stop_loss_pct'] = {float(e.stopLossPct)}")
    if e.exitPattern:
        lines.append(f"    rules['exit_pattern'] = {repr(e.exitPattern)}")
    lines.append("    return rules")
    lines.append("")

    return "\n".join(lines)

