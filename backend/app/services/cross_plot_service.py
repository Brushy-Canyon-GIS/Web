"""
Service for generating cross plots for measured sections.

Data is read from the Supabase table `measured_section_stats`. It supports
fuzzy matching so that map display names (e.g. "Arrow Canyon") resolve
to section names (e.g. "ArrowCanyon") when the match score is at least
HIGH_CONFIDENCE_THRESHOLD.

It produces a matplotlib figure with:
- A scatter plot of mean grain size vs mean bed thickness, where point
  size reflects total thickness of that facies.
- A stacked bar chart of total thickness by facies.
"""

from __future__ import annotations

import re
from typing import Optional
import io

import matplotlib.pyplot as plt
import matplotlib.cm as cm
import pandas as pd
from rapidfuzz import fuzz, process
from databases import Database

# Table name in Supabase. Use "meaured_section_stats" if your table has that typo.
MEASURED_SECTION_STATS_TABLE = "measured_section_stats"

# Minimum score (0-100) to treat a map name -> section name match as high confidence.
HIGH_CONFIDENCE_THRESHOLD = 90

# Cardinal direction full words (for canonicalizing order so "SE Colleen" and "SEColleen" match)
_CARDINAL_WORDS = (
    "southeast",
    "southwest",
    "northeast",
    "northwest",
    "north",
    "south",
    "east",
    "west",
)


def _row_to_dict(r) -> dict:
    """Convert a DB row (asyncpg Record or dict-like) to a plain dict."""
    if hasattr(r, "_mapping"):
        return dict(r._mapping)
    if hasattr(r, "keys") and callable(r.keys):
        return {k: r[k] for k in r.keys()}
    return dict(r)


def _normalize_plot_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize column names so plotting code sees expected names (case-insensitive)."""
    if df.empty:
        return df
    df = df.rename(columns={c: c.lower() for c in df.columns})
    if "facies" in df.columns:
        df = df.rename(columns={"facies": "Facies"})
    return df


class CrossPlotService:
    """
    Service for generating cross plots for measured sections from the database.
    """

    def __init__(self, database: Database, table_name: str = MEASURED_SECTION_STATS_TABLE):
        self.db = database
        self.table_name = table_name
        self._section_names_cache: Optional[list[str]] = None

    async def _fetch_section_names(self) -> list[str]:
        """Unique section names from the table (for fuzzy matching)."""
        if self._section_names_cache is not None:
            return self._section_names_cache
        query = f'SELECT DISTINCT name FROM "{self.table_name}" ORDER BY name'
        rows = await self.db.fetch_all(query)
        names = []
        for r in rows:
            d = _row_to_dict(r)
            val = d.get("name") or d.get("Name")
            if val is not None:
                names.append(str(val))
        self._section_names_cache = names
        return names

    async def _fetch_section_data(self, section_name: str) -> pd.DataFrame:
        """Fetch all rows for one section and return a DataFrame with expected columns."""
        query = f'SELECT * FROM "{self.table_name}" WHERE name = :section_name'
        rows = await self.db.fetch_all(query, values={"section_name": section_name})
        if not rows:
            return pd.DataFrame()
        data = [_row_to_dict(r) for r in rows]
        df = pd.DataFrame(data)
        df = _normalize_plot_columns(df)
        return df

    def _expand_cardinals(self, s: str) -> str:
        """Expand cardinal abbreviations (SE, NW, N, etc.) to full words."""
        s = s.lower()
        for abbr, full in [("se", "southeast"), ("sw", "southwest"), ("ne", "northeast"), ("nw", "northwest")]:
            s = re.sub(r"^" + abbr + r"(?=[a-z0-9])", full, s)
        for abbr, full in [("n", "north"), ("s", "south"), ("e", "east"), ("w", "west")]:
            s = re.sub(r"^" + abbr + r"(?=[a-z0-9])", full, s)
        for abbr, full in [("se", "southeast"), ("sw", "southwest"), ("ne", "northeast"), ("nw", "northwest")]:
            s = re.sub(r"\b" + abbr + r"\b", full, s)
        for abbr, full in [("n", "north"), ("s", "south"), ("e", "east"), ("w", "west")]:
            s = re.sub(r"\b" + abbr + r"\b", full, s)
        return s

    def _normalize_name(self, name: str) -> str:
        """Normalize for exact-like matching (canyon, cardinals, non-alphanumeric strip, canonical order)."""
        s = name.lower().replace("canyon", "")
        s = self._expand_cardinals(s)
        s = re.sub(r"[^a-z0-9]", "", s)
        parts = []
        remaining = s
        for direction in _CARDINAL_WORDS:
            while direction in remaining:
                left, _, right = remaining.partition(direction)
                if left:
                    parts.append(left)
                parts.append(direction)
                remaining = right
        if remaining:
            parts.append(remaining)
        if len(parts) > 1:
            return "".join(sorted(parts))
        return s

    def _normalized_map_variants(self, normalized_map: str) -> list[str]:
        """Return variants for matching (e.g. colleen2 -> colleen02)."""
        variants = [normalized_map]
        m = re.match(r"^colleen(\d)$", normalized_map)
        if m:
            variants.append("colleen0" + m.group(1))
        return variants

    def _resolve_map_name_to_section_name(self, map_name: str, section_names: list[str]) -> Optional[str]:
        """Resolve map display name to table section name using normalization and fuzzy match."""
        if not map_name or not str(map_name).strip():
            return None
        map_name = str(map_name).strip()
        if not section_names:
            return None
        normalized_map = self._normalize_name(map_name)
        acceptable = set(self._normalized_map_variants(normalized_map))
        for sn in section_names:
            if self._normalize_name(sn) in acceptable:
                return sn
        result = process.extractOne(map_name, section_names, scorer=fuzz.token_sort_ratio)
        if result is None:
            return None
        _matched, score, _ = result
        if score >= HIGH_CONFIDENCE_THRESHOLD:
            return _matched
        return None

    async def generate_section_plot_png(self, section_name: str) -> bytes:
        """
        Generate a cross plot PNG for the given section name.
        section_name can be the table name or a map display name (resolved via fuzzy matching).
        """
        section_df = await self._fetch_section_data(section_name)
        if section_df.empty:
            names = await self._fetch_section_names()
            resolved = self._resolve_map_name_to_section_name(section_name, names)
            if resolved is not None:
                section_name = resolved
                section_df = await self._fetch_section_data(section_name)
        if section_df.empty:
            raise ValueError(f"No measured section stats found for '{section_name}'")

        required = ["Facies", "mean_grainsize", "mean_thickness", "total_thickness"]
        missing = [c for c in required if c not in section_df.columns]
        if missing:
            raise ValueError(
                f"Table '{self.table_name}' is missing columns for plotting: {missing}. "
                f"Available: {list(section_df.columns)}"
            )

        csv_name = section_name
        facies_values = sorted(section_df["Facies"].unique())
        cmap = cm.get_cmap("tab20")
        n = max(1, len(facies_values))
        facies_color_map = {
            facies: cmap(i / max(1, n - 1)) for i, facies in enumerate(facies_values)
        }

        # Create figure with two subplots (scatter + stacked bar),
        # following the structure of the notebook.
        fig, (ax0, ax1) = plt.subplots(
            1, 2, figsize=(10, 5), gridspec_kw={"width_ratios": [2, 1]}
        )

        # Subplot 0: scatter (mean grain size vs mean thickness)
        scatter_colors = section_df["Facies"].map(facies_color_map)
        ax0.scatter(
            section_df["mean_grainsize"],
            section_df["mean_thickness"],
            c=scatter_colors,
            s=section_df["total_thickness"] * 10,
        )
        ax0.set_xlabel("Mean Grain Size (arbitrary units)")
        ax0.set_ylabel("Mean bed thickness (m)")
        ax0.set_title("Mean Grain Size vs total thickness by facies", fontsize=8)
        for t in [5, 10, 20]:
            ax0.scatter([], [], s=t * 10, c="black", label=f"{t} m", edgecolors="none")
        ax0.legend(loc="upper left", title="Total thickness\n of that facies")

        stacked = section_df.set_index("Facies")["total_thickness"].to_frame().T
        bar_colors = [facies_color_map.get(f, "#cccccc") for f in stacked.columns]
        stacked.plot(kind="bar", stacked=True, ax=ax1, color=bar_colors, legend=True, width=0.6)

        if "section_total_thickness" in section_df.columns:
            section_total = float(section_df["section_total_thickness"].iloc[0])
        else:
            section_total = float(stacked.values.sum())

        ax1.set_ylabel(f"{csv_name} Facies Thickness")
        ax1.set_title(f"{csv_name} — Total thickness by facies (total = {section_total:.2f} m)", fontsize=8)
        leg = ax1.get_legend()
        if leg:
            legend_labels = [str(f) for f in stacked.columns]
            ax1.legend(leg.legend_handles, legend_labels, title="Facies", bbox_to_anchor=(1.02, 1), loc="upper left", fontsize=5)

        plt.tight_layout()
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
        plt.close(fig)
        buf.seek(0)
        return buf.getvalue()


__all__ = ["CrossPlotService", "MEASURED_SECTION_STATS_TABLE"]
