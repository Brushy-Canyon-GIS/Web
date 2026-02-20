"""
Service for generating cross plots for measured sections.

This service is based on the example notebook in
`app/cross_plotting/20260205BrushyCanyonWebsite.ipynb` and the
`MeasuredSectionStats.csv` file in the same folder. It supports
fuzzy matching (as in `20260205BrushyCanyonWebsite 1.ipynb`) so that
map display names (e.g. "Arrow Canyon") resolve to CSV names (e.g. "ArrowCanyon")
when the match score is at least HIGH_CONFIDENCE_THRESHOLD.

It reads the CSV, filters to a single measured section by name, and
produces a matplotlib figure with:
- A scatter plot of mean grain size vs mean bed thickness, where point
  size reflects total thickness of that facies.
- A stacked bar chart of total thickness by facies.

The figure is returned as a PNG image in memory so that FastAPI routes
can expose it as an HTTP endpoint.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Optional
import io

import matplotlib.pyplot as plt
import matplotlib.cm as cm
import pandas as pd
from rapidfuzz import fuzz, process

# Minimum score (0-100) to treat a map name -> CSV name match as high confidence.
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


class CrossPlotService:
    """
    Service for generating cross plots for measured sections.
    """

    def __init__(self, csv_path: Optional[Path] = None) -> None:
        # Default to the MeasuredSectionStats.csv next to the notebook
        if csv_path is None:
            base_dir = Path(__file__).resolve().parents[1]  # app/
            csv_path = base_dir / "cross_plotting" / "MeasuredSectionStats.csv"

        self.csv_path = csv_path
        self._df: Optional[pd.DataFrame] = None
        self._csv_names: Optional[list[str]] = None

    def _get_dataframe(self) -> pd.DataFrame:
        """
        Lazily load and cache the measured section stats CSV.
        """
        if self._df is None:
            if not self.csv_path.exists():
                raise FileNotFoundError(
                    f"Measured section stats CSV not found at '{self.csv_path}'"
                )
            self._df = pd.read_csv(self.csv_path)
        return self._df

    def _get_csv_names(self) -> list[str]:
        """Unique section names from the CSV (used for fuzzy matching)."""
        if self._csv_names is None:
            df = self._get_dataframe()
            self._csv_names = df["name"].dropna().unique().tolist()
        return self._csv_names

    def _expand_cardinals(self, s: str) -> str:
        """Expand cardinal abbreviations (SE, NW, N, etc.) to full words (southeast, northwest, north, etc.)."""
        s = s.lower()
        # Two-letter at start (e.g. SEColleen -> southeastColleen)
        for abbr, full in [("se", "southeast"), ("sw", "southwest"), ("ne", "northeast"), ("nw", "northwest")]:
            s = re.sub(r"^" + abbr + r"(?=[a-z0-9])", full, s)
        # One-letter at start (e.g. NColleen -> northColleen)
        for abbr, full in [("n", "north"), ("s", "south"), ("e", "east"), ("w", "west")]:
            s = re.sub(r"^" + abbr + r"(?=[a-z0-9])", full, s)
        # Whole-word abbreviations (e.g. 'colleen se' -> 'colleen southeast')
        for abbr, full in [("se", "southeast"), ("sw", "southwest"), ("ne", "northeast"), ("nw", "northwest")]:
            s = re.sub(r"\b" + abbr + r"\b", full, s)
        for abbr, full in [("n", "north"), ("s", "south"), ("e", "east"), ("w", "west")]:
            s = re.sub(r"\b" + abbr + r"\b", full, s)
        return s

    def _normalize_name(self, name: str) -> str:
        """
        Normalize for exact-like matching:
        - Lowercase, remove the word 'canyon', expand cardinal abbreviations (SE->southeast, NW->northwest, etc.), strip non-alphanumeric.
        - If the result contains a cardinal direction word, canonicalize by sorting parts so "SE Colleen" and "SEColleen" both become "colleensoutheast".
        """
        s = name.lower().replace("canyon", "")
        s = self._expand_cardinals(s)
        s = re.sub(r"[^a-z0-9]", "", s)
        # If the string contains a cardinal direction word, canonicalize order so "SE Colleen" and "SEColleen" match
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
        """
        Return variants of the normalized map name for matching.
        E.g. 'colleen2' -> ['colleen2', 'colleen02'] so 'Colleen Canyon 2' matches CSV 'Colleen02'.
        """
        variants = [normalized_map]
        m = re.match(r"^colleen(\d)$", normalized_map)
        if m:
            variants.append("colleen0" + m.group(1))
        return variants

    def resolve_map_name_to_csv_name(self, map_name: str) -> Optional[str]:
        """
        Resolve a map display name (e.g. from GeoJSON NAME) to the CSV section name.
        Tries (1) normalized exact match (including Colleen Canyon N <-> Colleen0N), then (2) fuzzy match with score >= HIGH_CONFIDENCE_THRESHOLD.
        """
        if not map_name or not str(map_name).strip():
            return None
        map_name = str(map_name).strip()
        csv_names = self._get_csv_names()
        if not csv_names:
            return None
        normalized_map = self._normalize_name(map_name)
        acceptable = set(self._normalized_map_variants(normalized_map))
        for csv_name in csv_names:
            if self._normalize_name(csv_name) in acceptable:
                return csv_name
        result = process.extractOne(
            map_name, csv_names, scorer=fuzz.token_sort_ratio
        )
        if result is None:
            return None
        _matched_name, score, _ = result
        if score >= HIGH_CONFIDENCE_THRESHOLD:
            return _matched_name
        return None

    def generate_section_plot_png(self, section_name: str) -> bytes:
        """
        Generate a cross plot PNG image for the given section name.

        section_name can be either the CSV name (e.g. ArrowCanyon) or a map
        display name (e.g. Arrow Canyon); in the latter case it is resolved
        via fuzzy matching (high-confidence only).

        Args:
            section_name: Measured section name (CSV column `name`) or map
                          display name (e.g. GeoJSON NAME).

        Returns:
            PNG image bytes.

        Raises:
            ValueError: If the section name is not found in the CSV.
            FileNotFoundError: If the CSV file is missing.
        """
        df = self._get_dataframe()
        # Support map display names: resolve to CSV name if exact match fails
        csv_name = section_name
        section_df = df[df["name"] == csv_name].copy()
        if section_df.empty:
            resolved = self.resolve_map_name_to_csv_name(section_name)
            if resolved is not None:
                csv_name = resolved
                section_df = df[df["name"] == csv_name].copy()
        if section_df.empty:
            raise ValueError(f"No measured section stats found for '{section_name}'")

        # Prepare a color map for facies; we don't have the Excel
        # "Facies Rosetta Stone" in the backend, so use a qualitative
        # matplotlib colormap keyed by facies code.
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
        ax0.set_title(
            "Mean Grain Size vs total thickness by facies", fontsize=8
        )

        # Size legend: black circles showing what thickness each size
        # represents (same scale s = thickness * 10).
        size_legend_m = [5, 10, 20]
        for t in size_legend_m:
            ax0.scatter(
                [],
                [],
                s=t * 10,
                c="black",
                label=f"{t} m",
                edgecolors="none",
            )
        ax0.legend(loc="upper left", title="Total thickness\n of that facies")

        # Subplot 1: stacked bar of total thickness by facies
        stacked = section_df.set_index("Facies")["total_thickness"].to_frame().T
        bar_colors = [facies_color_map.get(f, "#cccccc") for f in stacked.columns]
        stacked.plot(
            kind="bar",
            stacked=True,
            ax=ax1,
            color=bar_colors,
            legend=True,
            width=0.6,
        )

        # Section total thickness is available as `section_total_thickness`
        # in the CSV; fall back to the sum if needed.
        if "section_total_thickness" in section_df.columns:
            section_total = float(section_df["section_total_thickness"].iloc[0])
        else:
            section_total = float(stacked.values.sum())

        ax1.set_ylabel(f"{csv_name} Facies Thickness")
        ax1.set_title(
            f"{csv_name} — Total thickness by facies "
            f"(total = {section_total:.2f} m)",
            fontsize=8,
        )

        # Use simple legend labels: just the facies codes.
        leg = ax1.get_legend()
        if leg:
            legend_labels = [str(f) for f in stacked.columns]
            ax1.legend(
                leg.legend_handles,
                legend_labels,
                title="Facies",
                bbox_to_anchor=(1.02, 1),
                loc="upper left",
                fontsize=5,
            )

        plt.tight_layout()

        # Render to PNG in-memory buffer
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
        plt.close(fig)
        buf.seek(0)
        return buf.getvalue()


__all__ = ["CrossPlotService"]

