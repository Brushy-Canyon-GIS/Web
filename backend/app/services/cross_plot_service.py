"""
Service for generating cross plots for measured sections.

This service is based on the example notebook in
`app/cross_plotting/20260205BrushyCanyonWebsite.ipynb` and the
`MeasuredSectionStats.csv` file in the same folder.

It reads the CSV, filters to a single measured section by name, and
produces a matplotlib figure with:
- A scatter plot of mean grain size vs mean bed thickness, where point
  size reflects total thickness of that facies.
- A stacked bar chart of total thickness by facies.

The figure is returned as a PNG image in memory so that FastAPI routes
can expose it as an HTTP endpoint.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional
import io

import matplotlib.pyplot as plt
import matplotlib.cm as cm
import pandas as pd


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

    def generate_section_plot_png(self, section_name: str) -> bytes:
        """
        Generate a cross plot PNG image for the given section name.

        Args:
            section_name: Name of the measured section (matches the
                          `name` column in MeasuredSectionStats.csv).

        Returns:
            PNG image bytes.

        Raises:
            ValueError: If the section name is not found in the CSV.
            FileNotFoundError: If the CSV file is missing.
        """
        df = self._get_dataframe()

        section_df = df[df["name"] == section_name].copy()
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

        ax1.set_ylabel(f"{section_name} Facies Thickness")
        ax1.set_title(
            f"{section_name} — Total thickness by facies "
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

