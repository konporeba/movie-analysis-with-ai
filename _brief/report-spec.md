# Report Spec

Current state of the report as of 2026-09-20. It describes what is built now; the design has changed a lot since the first brief. The dated log at the end of this file records how it got here, and where it disagrees with the sections below, the sections below win.

## Report identity
- Report name: Movie Analysis With AI
- Format: local Power BI Project (PBIP), PBIR report + TMDL semantic model, import mode
- Semantic model: `Movie Analysis With AI.SemanticModel`, source `movies_metadata.csv` (Kaggle "The Movies Dataset", TMDB metadata), 44,899 films after cleaning, 1874-2017 (2017 is a partial year)
- Audience: movie enthusiasts and analysts exploring the film universe
- Purpose: understand the story of cinema (volume, quality, money) and find which genres, decades, budgets and titles stand out
- Delivery: local PBIP in a public GitHub repo (`konporeba/movie-analysis-with-ai`); not published to the Power BI service

## Narrative
- Core story: film output more than tripled since the 1980s while ratings slipped; money buys revenue, not better ratings; Drama leads in volume, while War and History films rate highest.
- Key questions: How much is made, and when? Which genres, languages and countries dominate? Does money buy quality or return? Which titles are the best rated, the biggest earners and the most voted?

## Design: Neon HUD
- Tone: dark digital heads-up display. Canvas `#050B1A` with a generated grid background image (`grid-bg…png`), cards `#0B1730` with a cyan glow, a small cyan rule and a Consolas eyebrow above each page title. No header band; the title and slicers sit directly on the grid.
- Typography: Bahnschrift for titles and KPI values, Consolas for eyebrows, Segoe UI for chart text. Sizes: page title 36, KPI values 40, chart titles 18, axis and data labels 12-13, table text 14, slicers 13-14.
- Theme: custom `NeonHud` (`StaticResources/RegisteredResources/NeonHud-22118029.json`) on top of the Fluent2 base theme.
  - Theme colors: foreground `#EAF2FF`, background `#0B1730`, secondary background `#10203F`, second-level text `#9DB4D8`.
  - Data colors: `#22D3EE`, `#3B82F6`, `#A78BFA`, `#4ADE80`, `#2DD4BF`, `#60A5FA`, `#FB923C`, `#34D399`.
  - Status colors: good `#34D399`, neutral `#60A5FA`, bad `#FB923C`.
- Color semantics: cyan `#22D3EE` = film counts, violet `#A78BFA` = ratings, blue `#3B82F6` = revenue and budget, signal green `#4ADE80` = ROI and profit, orange `#FB923C` = worse than average.
- Tooltips: styled in the theme and on every data visual. Light-cyan `#7DE3F4` labels, white values, background `#0A1B3D` at 10 % transparency, 9 pt.
- Signature elements: HTML/SVG KPI cards (glow accent, value, context line, progress bar) and DAX-generated rating bars in the title table.
- Accessibility: alt text on every chart, KPI card and table. Text is light on dark navy; accent colors are used for graphics and large values.
- "HTML-style" visuals: Power BI cannot run arbitrary HTML, so the KPI cards use the AppSource **HTML Content** visual (`htmlContent443BE3AD55E043BF878BED274D3A6855`, data role `content`). Each card is a DAX measure that returns an HTML string.

## Pages (1920 x 1080)
All four pages share the same skeleton: a title block at top left (eyebrow, page title, cyan rule) and header slicers at top right. Below them is a KPI row of HTML cards, then chart panels. Cross-filtering is on for every chart pair, slicers are page-local, and there is no filter pane in edit mode.

| # | Page | Title | Slicers | KPI cards | Visuals |
|---|---|---|---|---|---|
| 1 | Overview (landing) | Film Output Tripled Since the 1980s While Ratings Slipped | Decade, Genre, Language | 6: Films, Rating, Revenue, Budget, Runtime, Hit Rate | Films released per year (line), Films per genre (bar), Rating distribution (column), Top 8 languages (bar), Revenue by decade (column) |
| 2 | Money and Success | Bigger Budgets Buy Revenue, Not Better Ratings | Decade, Language, Budget tier, Genre | 4: Median ROI, Avg Budget, Avg Revenue, Profit Rate | Budget vs revenue per film (scatter, log scales), Median ROI by genre (bar), Top 10 ROI multiple (bar, budget $1M+), Median ROI by tier (bar), Rating by tier (bar) |
| 3 | Genre and Country | Drama Leads in Volume, but War and History Films Rate Highest | Decade, Language | 4: Most Films Genre, Best Genre, Top Earner Genre, Best Decade | Rating by genre (bar), Average revenue per film (bar), Top 10 production countries (bar), Rating by decade (line) |
| 4 | Title Explorer | The Films Worth Watching: Best Rated and Biggest Earners | Decade, Genre, Language | 4: Top Grossing, Top Rated, Most Voted, Films Shown | Top 10 films by revenue (bar), Votes vs rating (scatter, 1,000 most-voted films), Highest rated films (table with rating bars) |

Chart notes:
- Rating charts use a truncated axis (from 5 on the genre and tier bars, from 6 on the decade line). The chart titles say so.
- Genre rankings run the full page height so all ~20 genres show without scrolling.
- Median ROI by genre leaves out TV Movie.

## Semantic model
Four tables in import mode, compatibility level 1606.

| Table | Grain | Notes |
|---|---|---|
| `Movies` | one row per film | Title, Title and Year, Release Date / Year, Decade (+ sort), Budget, Revenue, Profit, Movie ROI, Big Budget ROI, Has Financials, Runtime (+ band and sort), Budget Tier (+ sort), Vote Average / Count / Points, Rating Band (+ sort), Popularity, Language, Primary Genre, Genre Count, Primary Country, Collection Name, Tagline |
| `Genres` | one row per genre | Dimension |
| `MovieGenres` | film x genre | Bridge for the many-to-many genre relationship |
| `_Measures` | - | 44 measures in display folders, plus a hidden placeholder column |

Relationships: `Genres[Genre] 1 -> * MovieGenres[Genre]` and `Movies[Movie ID] 1 -> * MovieGenres[Movie ID]` with a bi-directional filter, so a Genre slicer filters films.

### Data cleaning
Done in the shared `Movies` query in `expressions.tmdl`:
1. `Csv.Document(..., QuoteStyle.Csv)`, 24 columns, UTF-8 (`QuoteStyle.None` broke multi-line overviews).
2. Dropped: corrupt shifted rows, duplicate ids, adult titles, anything not `Released`, rows without a release date.
3. Numbers typed with the `en-US` culture, so results do not depend on the machine's locale.
4. Budget and revenue under $10,000 are treated as missing (`null`). In this dataset, 0 means "unknown", and about 80 % of budgets are missing. Runtime 0 is also treated as missing.
5. The JSON-like text columns are parsed into Primary Genre, Genre Count, Primary Country and Collection Name. Language codes are mapped to names for the top languages.
6. Genre bridge and dimension tables are built from the exploded `genres` column.
7. Heavy unused columns are dropped (homepage, poster path, overview, production companies and similar).

### Key measures
- Counts: Movies, Rated Movies (10+ votes), Movies with Financials, Share of All Films, Total Votes.
- Ratings: Avg Rating, Weighted Rating (IMDb-style Bayesian average, m = 100), All Films Rating, Rating vs All Films, % Rated 7+.
- Money: Total Revenue / Budget / Profit, Avg Revenue per Film, ROI (a multiple), Median ROI, Hit Rate, and the USD M variants used on axes.
- Other: Avg Runtime, Runtime vs All Films, Top Genre, Best Rated Decade, Selection Summary.
- Visual helpers: Rating Stars (text, unused), Rating Bar SVG (used in the title table), and 18 `KPI ... HTML` measures for the cards.
- `FORMAT` calls in the HTML measures pass the `en-US` locale, so the HTML and CSS stay valid on machines with a comma decimal separator.
- User-defined DAX functions are not used because the compatibility level (1606) is below 1702, so each card is its own measure.

## Known limitations
- Budget and revenue exist for only about a fifth of the films, so the Money page and every ROI figure cover that subset.
- 2017 is a partial year, which makes the last point of the films-per-year line look like a drop.
- Weighted Rating and Avg Rating only count films with enough votes; small groups can still be noisy.
- The HTML KPI cards depend on the AppSource HTML Content visual, which must be available in Power BI Desktop.
- The `Source` step in `expressions.tmdl` uses an absolute path to `movies_metadata.csv`; change it after cloning. The CSV is not in the repo (see `README.md`).
- Not built: Star SVG, rank numbers on the leaderboards, and the release-year range slicer (it did not fit the header).

## Build and validation
- Report files are generated and edited through the Power BI authoring CLIs and `_brief/generator/build-report.js`; the model is edited as TMDL. Desktop re-saves reformat some files (schema versions, TMDL and JSON formatting), which is expected.
- Validate with `powerbi-report-author validate`, then open the PBIP in Power BI Desktop, refresh, and check each page.

## Change history
The entries below are the dated log of changes and are kept as history. Later entries supersede earlier ones. The original Midnight Cinema brief (navy `#0F2854` / `#1C4D8D` / `#4988C4` / `#BDE8F5` palette, light canvas, navy title band, `_Measures` table, `Movies` partition doing the cleaning) was replaced by the Neon HUD design described above.

## Build notes (as built, 2026-09-19)
- Page titles were rewritten to match the data: (1) "Film Output Tripled Since the 1980s While Ratings Slipped", (2) "Bigger Budgets Buy Revenue, Not Better Ratings", (3) "Drama Leads in Volume, but War and History Films Rate Highest", (4) "The Films Worth Watching: Best Rated and Biggest Earners".
- Measures live in the `Movies` table (display folders) instead of a separate `_Measures` table, per the modeling guideline against a single measures table.
- Added columns: `Title and Year` (titles are not unique), `Big Budget ROI` (top-ROI ranking without micro-budget outliers). Renamed column `ROI` to `Movie ROI`; the `ROI` measure is a multiple (x).
- Data rules: budget/revenue under $10,000 treated as missing; only released, non-adult films with a release date; 44,899 films, 1874-2017 (2017 is a partial year).
- Not built: KPI reference-label context lines, rank numbers on leaderboards, Star SVG (a `Rating Stars` text measure exists but is unused). The `Rating Bar SVG` measure is used in the Title Explorer table.
- Heatmap shows grand totals (could not hide them through PBIR properties).

## Restyle (2026-09-19): Neon HUD
- Dark digital theme `NeonHud`: canvas `#050B1A` with a generated grid background image, cards `#0B1730` with cyan glow, header band with cyan rule and Consolas eyebrow, Bahnschrift titles/KPI values.
- Accents: cyan `#22D3EE` (counts), violet `#A78BFA` (ratings), blue `#3B82F6` (revenue), pink `#F472B6` (ROI); the original four-color palette was replaced by request.
- Type sizes raised: chart titles 18, axis and data labels 12-13, KPI values 40, table text 14, slicers 13-14, page title 36.
- Page 3 heatmap replaced by a "Rating by decade" line chart so the larger genre lists fit without scrolling.
- `Rating Bar SVG` recolored (cyan on navy track).

## HTML KPI cards + header (2026-09-19)
- Header band removed: title, eyebrow and slicers now sit directly on the grid background of the page.
- Overview KPI row uses the AppSource "HTML Content" visual (`htmlContent443BE3AD55E043BF878BED274D3A6855`, data role `content`) bound to six measures in the `KPI HTML` display folder (`KPI Films/Rating/Revenue/Budget/Runtime/Hit Rate HTML`). Each returns styled HTML with a glow accent, value, context line and progress bar, and responds to slicers.
- FORMAT calls pass the `en-US` locale so HTML/CSS numbers stay valid on machines with a comma decimal separator.

## HTML KPI strips on pages 2-4 + spacing (2026-09-19)
- Money, Genre and Title Explorer pages now open with a strip of four compact HTML Content cards (12 measures in the `KPI HTML` folder, e.g. `KPI Median ROI HTML`, `KPI Best Genre HTML`, `KPI Top Grossing HTML`).
- Money page: filter rail replaced by header slicers (Decade, Language, Budget tier, Genre); Release Year range slicer dropped because it did not fit; "Rating by runtime" replaced by "Rating by tier" so the chart supports the page title.
- Bar charts: category gap raised to 40-55 %, Top 10 charts given more height/width; genre rankings run full height (20 bars, no scrolling).
- DAX user-defined functions were not used (model compatibility level 1606 < 1702), so each card is its own measure.

## Tooltips (2026-09-19)
- Theme `NeonHud` now styles default tooltips report-wide (`visualStyles["*"]["*"].visualTooltip`): background `#12305C` at 28 % transparency, label text `#9DB4D8`, value text `#EAF2FF` in bold, 14 pt Segoe UI.

## Tooltip legibility (2026-09-19)
- Tooltips (theme + every data visual): background `#0A1B3D` at 10 % transparency, labels light cyan `#7DE3F4`, values white bold, 16 pt Segoe UI Semibold. Earlier version (muted blue labels, 28 % transparency) was hard to read.

## _Measures table, amber accent, tooltip size (2026-09-19)
- All 44 measures moved from `Movies` into a dedicated `_Measures` table (hidden placeholder column, display folders kept). Supersedes the earlier "measures live in Movies" note; report visuals now bind to `_Measures`.
- Pink `#F472B6` replaced by amber `#FBBF24` (ROI charts, Median ROI / Profitable films / Films in selection KPI cards, negative deltas).
- Tooltips keep the readable colors (light-cyan labels, white bold values, 10 % transparency) but use the normal 13 pt size.

## Tooltip: colors only (2026-09-19)
- Tooltip text size, font and bold settings removed (they made the tooltip larger and bolder than intended). Only the readability fix stays: light-cyan labels, white values, `#0A1B3D` background at 10 % transparency. Size and weight are Power BI defaults.

## Tooltip size (2026-09-19)
- Tooltip text size set to 9 pt (was 8 pt; Power BI default is 10 pt), colors and transparency unchanged.

## Accent color: signal green (2026-09-19)
- Amber replaced by signal green `#4ADE80` (ROI charts, Median ROI / Profitable films / Films in selection cards). "Worse than average" arrows and the theme's `bad` color are orange `#FB923C`; theme `neutral` is sky `#60A5FA`.

## Spec refresh and Desktop re-save (2026-09-20)
- This spec was rewritten to describe the current Neon HUD report; the original Midnight Cinema design contract was removed.
- Power BI Desktop re-saved the project: newer visual schema version, reformatted TMDL and JSON, `filterPaneHiddenInEditMode` set in `report.json`, and the tooltip field order changed on the budget-vs-revenue scatter.
- A `README.md` was added and the GitHub repo was made public.
