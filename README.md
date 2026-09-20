# Movie Analysis With AI

A four-page, dark "Neon HUD" Power BI dashboard about the history of cinema (1874–2020): how many films were made, how well they were rated, and where the money is. It is stored as a Power BI Project (PBIP), so the model and report are plain text files that work with Git.

The report was built with Claude Code and the Power BI authoring tools.

## What it answers

- How much cinema is made, and when?
- Which genres, languages and countries dominate?
- Does a bigger budget buy quality, or only revenue?
- Which titles are the best rated, the highest grossing and the most voted?

## Report pages

| Page | Focus |
|---|---|
| **Overview** | Headline KPI cards, films released per year, top genres, rating distribution, top languages, revenue by decade. Slicers: Decade, Genre, Language. |
| **Money and Success** | Budget vs revenue, ROI by genre and budget tier, rating by runtime band, top ROI films. |
| **Genre and Country** | Weighted rating and average revenue by genre, a genre × decade rating heatmap, top production countries. |
| **Title Explorer** | Top titles by revenue, votes vs rating, and a ranked title table with rating bars. |

The KPI cards are HTML/SVG strings built with DAX measures (the `KPI … HTML` and `Rating Bar SVG` measures). Every visual has alt text.

## Semantic model

The import-mode model has four tables:

| Table | Grain | Notes |
|---|---|---|
| `Movies` | one row per movie | Dates, budget, revenue, profit, ROI, runtime, votes, language, primary genre and country, plus sort columns for the bands. |
| `Genres` | one row per genre | Dimension table. |
| `MovieGenres` | movie × genre | Bridge table, so a film can belong to several genres. It filters `Movies` in both directions, so a Genre slicer filters films. |
| `_Measures` | – | All measures: counts, ratings, revenue, budget, profit, ROI, hit rate, runtime, callouts and the HTML/SVG helpers. |

Notable measures:

- **Weighted Rating** is an IMDb-style Bayesian average (m = 100), so films with few votes don't top the charts.
- **Avg Rating** and **% Rated 7+** only count films with at least 10 votes.
- **ROI**, **Median ROI** and **Hit Rate** only use films with known financials.

### Data cleaning (Power Query)

Applied in the `Movies` partition:

- The CSV is parsed with `QuoteStyle.Csv` so multi-line overviews don't break rows.
- 3 corrupt shifted rows, 30 duplicate ids, 9 adult titles and all films that are not `Released` are dropped.
- Numeric columns are typed with the `en-US` culture, so results don't depend on the machine's locale.
- A `0` budget, revenue or runtime means "unknown" in this dataset, so it is converted to `null`. About 80% of budgets are missing, and the financial pages only cover films that have them.
- The JSON-like text columns are parsed into Primary Genre, Primary Country, Collection Name and the genre bridge table.

## Data source

The data is `movies_metadata.csv` from the Kaggle [The Movies Dataset](https://www.kaggle.com/datasets/rounakbanik/the-movies-dataset) (TMDB metadata for about 45,000 films). The file is 33 MB and is **not included** in this repository (it is in `.gitignore`).

## Getting started

Requirements: Windows and [Power BI Desktop](https://powerbi.microsoft.com/desktop/) with **PBIP / PBIR preview features** enabled (*File → Options → Preview features*).

1. Clone the repo.
2. Download `movies_metadata.csv` from the Kaggle link above and put it in the project root, next to `Movie Analysis With AI.pbip`.
3. The `Source` step of the `Movies` query has an absolute path (`X:\AI Dashboard V2\movies_metadata.csv`). Update it to your location in *Transform data → Advanced Editor*, or edit `Movie Analysis With AI.SemanticModel/definition/expressions.tmdl`.
4. Open `Movie Analysis With AI.pbip` in Power BI Desktop and click **Refresh**.

## Repository layout

```
Movie Analysis With AI.pbip            Project entry point
Movie Analysis With AI.SemanticModel/  Semantic model (TMDL): tables, measures, relationships
Movie Analysis With AI.Report/         Report (PBIR): pages, visuals, "Neon HUD" theme
_brief/                                Original report spec and the script that generated the report
```

## Credits

Film data comes from [TMDB](https://www.themoviedb.org/) via Kaggle. This product uses the TMDB data but is not endorsed or certified by TMDB.
