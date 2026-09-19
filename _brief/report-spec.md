# Report Spec

## Report identity
- Report name: Movie Analysis With AI
- Semantic model: `Movie Analysis With AI.SemanticModel` (local PBIP, import mode, source `movies_metadata.csv`, ~45k rows)
- Audience: Movie enthusiasts / analysts exploring the film universe (1874–2020)
- Primary purpose: Understand the story of cinema (volume, quality, money) and find which genres, eras, budgets and titles win
- Delivery target: Local PBIP only (publishing decided later)

## User decisions and constraints
- Scope: Full dashboard proposed by Claude: content, layout, data transformation, measures, visuals
- Page count: 4
- Palette (mandatory): `#0F2854` `#1C4D8D` `#4988C4` `#BDE8F5`
- "HTML-style" visuals: Power BI cannot execute arbitrary HTML/JS without an AppSource custom visual (not importable offline). Substitute: native visuals with heavy theming + DAX-generated SVG (rating bars / stars) rendered as images inside tables and cards. A standalone HTML artifact copy can be added afterwards if wanted.
- Tooling: Power BI Desktop installed (`PBIDesktop.exe`), `powerbi-desktop` + `powerbi-report-author` CLIs present, modeling MCP connected (offline TMDL)
- Accessibility: WCAG AA text contrast, alt text on every visual
- Data caveats: see Data transformation

## Narrative
- Core story: Cinema exploded in volume after 1990, ratings stay stable, but money is concentrated in a few genres/budgets; big budgets raise revenue but not quality.
- Key questions: How much is made, and when? Which genres/languages dominate? Does money buy quality or return? Which titles are best/biggest?

## Design identity
- Tone: **Midnight Cinema**: deep navy editorial header band, light data cards on a pale cyan canvas
- Signature: full-width navy title band with big display title + **SVG rating bars/stars** and rank-numbered leaderboards recurring on every page
- Typography: Segoe UI Semibold titles / Segoe UI body; tabular numerals for KPIs

## Data transformation (Power Query, in the `Movies` partition)
Current partition is faulty: `QuoteStyle.None` breaks multi-line/quoted overviews, numbers are typed without culture (locale-dependent), `budget`/`popularity`/`release_date` are text.
1. `Csv.Document(..., QuoteStyle.Csv)`, 24 columns, UTF-8
2. Drop 3 corrupt shifted rows (non-numeric `id`), drop 30 duplicate ids, drop 9 `adult = True`, keep `status = Released` only (drops 365 unreleased/rumored)
3. Types with `en-US` culture: budget/revenue/runtime → whole number; popularity, vote_average → decimal; vote_count → whole; release_date → date
4. `0` budget / revenue / runtime → `null` (0 means "unknown" in this dataset; ~80% of budgets)
5. Parse JSON-ish text columns → `Primary Genre`, `Genre Count`, `Primary Country`, `Collection Name`; language code → `Language` (name lookup for top ~30 codes, else code)
6. New tables: `Genres` (dim: Genre) and `MovieGenres` (bridge MovieId ↔ Genre, exploded from `genres`)
7. Drop unused heavy columns: `homepage`, `poster_path`, `video`, `spoken_languages`, `production_companies`, raw JSON columns, `overview` (kept: `tagline`, `title`)

### Model
| Table | Grain | Key columns |
|---|---|---|
| `Movies` | 1 row / movie | MovieId, Title, Release Date, Release Year, Decade (+ Decade Sort), Budget, Revenue, Profit, ROI, Has Financials, Runtime, Runtime Band (+sort), Budget Tier (+sort), Vote Average, Vote Count, Rating Band (+sort), Popularity, Language, Primary Genre, Primary Country, Collection Name, Tagline |
| `Genres` | 1 row / genre | Genre |
| `MovieGenres` | movie × genre | MovieId, Genre |
| `_Measures` | measures only | |

Relationships: `Genres[Genre] 1→* MovieGenres[Genre]`; `Movies[MovieId] 1→* MovieGenres[MovieId]` with **bi-directional** filter so a Genre slicer filters Movies (many-to-many genres).

### Measures (`_Measures`)
- Movies, Rated Movies (votes ≥ 10), Avg Rating, Weighted Rating (IMDb Bayesian, m = 100), % Rated 7+
- Total Revenue, Total Budget, Avg Revenue per Film, Total Profit, ROI (portfolio), Median ROI, Hit Rate (% revenue > budget)
- Avg Runtime, Total Votes, Avg Popularity
- Top Genre, Best Decade (text callouts), Selection Summary (dynamic subtitle)
- Rating Bar SVG, Star SVG (ImageUrl data-category measures), rank helper

## Pages (FHD 1920×1080)
1. **The Movie Universe at a Glance** (Executive, landing): 6 KPI cards, movies released per year, top genres, rating distribution, top languages, revenue by decade. Slicers: Decade, Genre, Language.
2. **Does Money Buy Success?** (Analytical Canvas, filter rail): Budget vs Revenue scatter, ROI by genre, ROI by budget tier, rating by runtime band, top-10 ROI films. Rail slicers: Release Year (between), Genre, Language, Budget Tier.
3. **Genre & Country Leaderboard** (Comparative Benchmark): weighted rating by genre, avg revenue by genre, Genre × Decade rating heatmap, top production countries. Slicers: Decade, Language.
4. **Title Explorer** (Analytical, detail): Top 10 by revenue, votes vs rating scatter, ranked title table with SVG rating bars. Slicers: Decade, Genre, Language.

Report-level: interactions Filter (cross-filter) everywhere; tooltip = default; all charts carry alt text.

## Design system summary
- Theme: custom "MidnightCinema" adapted from `assets/base.json`; page canvas `#BDE8F5`, cards white `#FFFFFF` with 1px `#4988C4` border at 30 %, title band `#0F2854` with `#BDE8F5` text
- Color semantics: Movies=`#4988C4`, Rating=`#1C4D8D`, Revenue=`#0F2854`, Budget=`#4988C4`, ROI=`#1C4D8D`; sequential gradient `#BDE8F5 → #4988C4 → #0F2854`
- Accessibility: text `#0F2854` on white (14:1); `#BDE8F5` on `#0F2854` (11:1); `#4988C4` only as graphic/large fill (≥3:1 on white)

## Model requirements
- Existing measures: none
- New measures / columns / tables: see above
- Relationship/sort: Decade Sort, Runtime Band Sort, Budget Tier Sort, Rating Band Sort

## Canonical design contract

```yaml
Design Brief:
  generated_by: powerbi-report-design
  contract_version: 1
  mode: greenfield
  design_identity:
    tone: "Midnight Cinema: navy title band, pale-cyan canvas, white data cards, Segoe UI"
    signature: "Full-width navy title band + SVG rating bars/stars and rank-numbered leaderboards on every page"
  archetype: Executive + Analytical + Comparative
  color_map:
    - { measure: "_Measures[Movies]",          color: "#4988C4", tint: "#BDE8F5" }
    - { measure: "_Measures[Avg Rating]",      color: "#1C4D8D", tint: "#BDE8F5" }
    - { measure: "_Measures[Weighted Rating]", color: "#1C4D8D", tint: "#BDE8F5" }
    - { measure: "_Measures[Total Revenue]",   color: "#0F2854", tint: "#BDE8F5" }
    - { measure: "_Measures[Avg Revenue per Film]", color: "#0F2854", tint: "#BDE8F5" }
    - { measure: "_Measures[Total Budget]",    color: "#4988C4", tint: "#BDE8F5" }
    - { measure: "_Measures[Median ROI]",      color: "#1C4D8D", tint: "#BDE8F5" }
  pages:
    - name: "Cinema Exploded After 1990: Volume Up, Quality Flat"
      role: landing
      archetype: Executive
      layout_variant: A
      variant_rationale: "Six headline KPIs plus a year trend and four supporting breakdowns; broad audience needs a 10-second scan."
      page_background: "#BDE8F5"
      layout_summary: "Title+filters band, KPI strip, trend + genre row, three-panel breakdown row."
      layout_contract:
        canvas: { width: 1920, height: 1080, margin: 32, gutter: 24, snap: 8 }
        grid:
          columns: 12
          rows: 12
          regions:
            header:  [1, 1, 9, 2]
            filters: [9, 1, 13, 2]
            kpis:    [1, 2, 13, 4]
            trend:   [1, 4, 8, 8]
            genres:  [8, 4, 13, 8]
            rating:  [1, 8, 5, 13]
            lang:    [5, 8, 9, 13]
            decade:  [9, 8, 13, 13]
        placements:
          - { id: page_title, region: header, kind: textbox, text: "Cinema Exploded After 1990: Volume Up, Quality Flat", purpose: "State the page insight." }
          - { id: decade_slicer, region: filters, kind: slicer, field_bindings: "Movies[Decade]", slicer_type: dropdown, slot: 1, of: 3 }
          - { id: genre_slicer, region: filters, kind: slicer, field_bindings: "Genres[Genre]", slicer_type: dropdown, slot: 2, of: 3 }
          - { id: language_slicer, region: filters, kind: slicer, field_bindings: "Movies[Language]", slicer_type: dropdown, slot: 3, of: 3 }
          - { id: kpi_movies, region: kpis, kind: cardVisual, purpose: "How many films are in scope?", field_bindings: "_Measures[Movies]", color_strategy: measure_match, insight_basis: "Share of all films", slot: 1, of: 6 }
          - { id: kpi_rating, region: kpis, kind: cardVisual, purpose: "How well rated are they?", field_bindings: "_Measures[Weighted Rating]", color_strategy: measure_match, insight_basis: "Star SVG + delta vs all films", slot: 2, of: 6 }
          - { id: kpi_revenue, region: kpis, kind: cardVisual, purpose: "How much money did they earn?", field_bindings: "_Measures[Total Revenue]", color_strategy: measure_match, insight_basis: "Avg revenue per film", slot: 3, of: 6 }
          - { id: kpi_budget, region: kpis, kind: cardVisual, purpose: "How much was invested?", field_bindings: "_Measures[Total Budget]", color_strategy: measure_match, insight_basis: "Median ROI", slot: 4, of: 6 }
          - { id: kpi_runtime, region: kpis, kind: cardVisual, purpose: "How long are films?", field_bindings: "_Measures[Avg Runtime]", color_strategy: none, insight_basis: "Minutes; vs all films", slot: 5, of: 6 }
          - { id: kpi_hit, region: kpis, kind: cardVisual, purpose: "How many films turn a profit?", field_bindings: "_Measures[Hit Rate]", color_strategy: none, insight_basis: "Share of films with known financials", slot: 6, of: 6 }
          - { id: films_per_year, region: trend, kind: lineChart, purpose: "How has film output grown over time?", field_bindings: { Category: "Movies[Release Year]", Y: "_Measures[Movies]" }, color_strategy: measure_match }
          - { id: top_genres, region: genres, kind: barChart, purpose: "Which genres have the most films?", field_bindings: { Category: "Genres[Genre]", Y: "_Measures[Movies]" }, sort_policy: value_desc, color_strategy: gradient }
          - { id: rating_dist, region: rating, kind: columnChart, purpose: "How are ratings distributed?", field_bindings: { Category: "Movies[Rating Band]", Y: "_Measures[Movies]" }, sort_policy: natural_order, color_strategy: measure_match }
          - { id: top_languages, region: lang, kind: barChart, purpose: "Which original languages dominate?", field_bindings: { Category: "Movies[Language]", Y: "_Measures[Movies]" }, sort_policy: value_desc, color_strategy: gradient }
          - { id: revenue_decade, region: decade, kind: columnChart, purpose: "Which decades earned the most?", field_bindings: { Category: "Movies[Decade]", Y: "_Measures[Total Revenue]" }, sort_policy: natural_order, color_strategy: measure_match }
        space_audit:
          content_cell_count: 132
          placed_cell_count: 132
          empty_cell_pct: 0
          unplaced_regions: []
          largest_region: { name: trend, pct_of_content: 21 }
          balance_rationale: "KPI strip is 2 rows with context; five analysis panels are 20-28 cells each so nothing starves and no dead band remains."

    - name: "Big Budgets Raise Revenue, Not Return"
      role: detail
      archetype: Analytical
      layout_variant: B
      variant_rationale: "Four filter dimensions (year, genre, language, budget tier) justify a left filter rail; a scatter is the natural hero for budget vs revenue."
      page_background: "#BDE8F5"
      layout_summary: "Title band, left slicer rail, scatter hero with ROI bars, bottom row of three profitability views."
      layout_contract:
        canvas: { width: 1920, height: 1080, margin: 32, gutter: 24, snap: 8 }
        grid:
          columns: 12
          rows: 12
          regions:
            header:  [1, 1, 13, 2]
            rail:    [1, 2, 3, 13]
            hero:    [3, 2, 9, 8]
            roi_genre: [9, 2, 13, 8]
            tier:    [3, 8, 7, 13]
            runtime: [7, 8, 10, 13]
            toproi: [10, 8, 13, 13]
        placements:
          - { id: page_title, region: header, kind: textbox, text: "Big Budgets Raise Revenue, Not Return", purpose: "State the page insight." }
          - { id: year_slicer, region: rail, kind: slicer, field_bindings: "Movies[Release Year]", slicer_type: between, slot: 1, of: 4, insight_basis: "Arbitrary year-range exploration on a numeric year." }
          - { id: genre_slicer, region: rail, kind: slicer, field_bindings: "Genres[Genre]", slicer_type: list, slot: 2, of: 4 }
          - { id: language_slicer, region: rail, kind: slicer, field_bindings: "Movies[Language]", slicer_type: dropdown, slot: 3, of: 4 }
          - { id: tier_slicer, region: rail, kind: slicer, field_bindings: "Movies[Budget Tier]", slicer_type: list, slot: 4, of: 4 }
          - { id: budget_vs_revenue, region: hero, kind: scatterChart, purpose: "Does spending more earn more?", field_bindings: { X: "_Measures[Total Budget]", Y: "_Measures[Total Revenue]", Details: "Movies[Title]", Size: "_Measures[Total Votes]" }, color_strategy: measure_match }
          - { id: roi_by_genre, region: roi_genre, kind: barChart, purpose: "Which genres return the most per dollar?", field_bindings: { Category: "Genres[Genre]", Y: "_Measures[Median ROI]" }, sort_policy: value_desc, color_strategy: gradient, comparison_basis: "Median ROI, films with known budget & revenue" }
          - { id: roi_by_tier, region: tier, kind: columnChart, purpose: "Does return fall as budgets grow?", field_bindings: { Category: "Movies[Budget Tier]", Y: "_Measures[Median ROI]" }, sort_policy: natural_order, color_strategy: measure_match }
          - { id: rating_by_runtime, region: runtime, kind: columnChart, purpose: "Do longer films score higher?", field_bindings: { Category: "Movies[Runtime Band]", Y: "_Measures[Avg Rating]" }, sort_policy: natural_order, color_strategy: measure_match }
          - { id: top_roi_films, region: toproi, kind: barChart, purpose: "Which films beat the odds?", field_bindings: { Category: "Movies[Title]", Y: "_Measures[ROI]" }, sort_policy: value_desc, color_strategy: gradient, comparison_basis: "Top 10 ROI, budget ≥ $1M" }
        space_audit:
          content_cell_count: 110
          placed_cell_count: 110
          empty_cell_pct: 0
          unplaced_regions: []
          largest_region: { name: hero, pct_of_content: 33 }
          balance_rationale: "Scatter hero (36 cells) answers the page question; four supporting panels of 15-24 cells slice it by genre, tier, runtime and title. Filter rail (22 cells) excluded from content."

    - name: "Drama Leads in Volume, Documentary and Animation in Rating"
      role: detail
      archetype: Comparative
      layout_variant: A
      variant_rationale: "One entity dimension (genre) ranked on two measures plus a genre×decade matrix; rank-comparison is the page job."
      page_background: "#BDE8F5"
      layout_summary: "Two ranked genre bars over a heatmap matrix and a country ranking."
      layout_contract:
        canvas: { width: 1920, height: 1080, margin: 32, gutter: 24, snap: 8 }
        grid:
          columns: 12
          rows: 12
          regions:
            header:  [1, 1, 9, 2]
            filters: [9, 1, 13, 2]
            rank_rating: [1, 2, 7, 8]
            rank_revenue: [7, 2, 13, 8]
            heatmap: [1, 8, 9, 13]
            countries: [9, 8, 13, 13]
        placements:
          - { id: page_title, region: header, kind: textbox, text: "Drama Leads in Volume, Documentary and Animation in Rating", purpose: "State the page insight." }
          - { id: decade_slicer, region: filters, kind: slicer, field_bindings: "Movies[Decade]", slicer_type: dropdown, slot: 1, of: 2 }
          - { id: language_slicer, region: filters, kind: slicer, field_bindings: "Movies[Language]", slicer_type: dropdown, slot: 2, of: 2 }
          - { id: genre_rating_rank, region: rank_rating, kind: barChart, purpose: "Which genres are best rated?", field_bindings: { Category: "Genres[Genre]", Y: "_Measures[Weighted Rating]" }, sort_policy: value_desc, color_strategy: gradient, comparison_basis: "Weighted rating vs all-films average" }
          - { id: genre_revenue_rank, region: rank_revenue, kind: barChart, purpose: "Which genres earn the most per film?", field_bindings: { Category: "Genres[Genre]", Y: "_Measures[Avg Revenue per Film]" }, sort_policy: value_desc, color_strategy: gradient }
          - { id: genre_decade_heat, region: heatmap, kind: pivotTable, purpose: "How has each genre's quality shifted by decade?", field_bindings: { Rows: "Genres[Genre]", Columns: "Movies[Decade]", Values: "_Measures[Weighted Rating]" }, color_strategy: gradient }
          - { id: top_countries, region: countries, kind: barChart, purpose: "Which countries produce the most films?", field_bindings: { Category: "Movies[Primary Country]", Y: "_Measures[Movies]" }, sort_policy: value_desc, color_strategy: gradient }
        space_audit:
          content_cell_count: 132
          placed_cell_count: 132
          empty_cell_pct: 0
          unplaced_regions: []
          largest_region: { name: heatmap, pct_of_content: 30 }
          balance_rationale: "Two equal ranking panels (36 cells each), a wide heatmap needing 8 columns for ~9 decades, and a compact country ranking."

    - name: "The Films Worth Watching: Best Rated and Biggest Earners"
      role: detail
      archetype: Analytical
      layout_variant: A
      variant_rationale: "Record-level exploration: two overview visuals above a ranked detail table."
      page_background: "#BDE8F5"
      layout_summary: "Top-10 revenue bars beside a votes-vs-rating scatter, ranked title table below."
      layout_contract:
        canvas: { width: 1920, height: 1080, margin: 32, gutter: 24, snap: 8 }
        grid:
          columns: 12
          rows: 12
          regions:
            header:  [1, 1, 9, 2]
            filters: [9, 1, 13, 2]
            top10:   [1, 2, 6, 8]
            votes_rating: [6, 2, 13, 8]
            titles:  [1, 8, 13, 13]
        placements:
          - { id: page_title, region: header, kind: textbox, text: "The Films Worth Watching: Best Rated and Biggest Earners", purpose: "State the page insight." }
          - { id: decade_slicer, region: filters, kind: slicer, field_bindings: "Movies[Decade]", slicer_type: dropdown, slot: 1, of: 3 }
          - { id: genre_slicer, region: filters, kind: slicer, field_bindings: "Genres[Genre]", slicer_type: dropdown, slot: 2, of: 3 }
          - { id: language_slicer, region: filters, kind: slicer, field_bindings: "Movies[Language]", slicer_type: dropdown, slot: 3, of: 3 }
          - { id: top10_revenue, region: top10, kind: barChart, purpose: "Which 10 films earned the most?", field_bindings: { Category: "Movies[Title]", Y: "_Measures[Total Revenue]" }, sort_policy: value_desc, color_strategy: measure_match }
          - { id: votes_vs_rating, region: votes_rating, kind: scatterChart, purpose: "Are widely voted films also highly rated?", field_bindings: { X: "Movies[Vote Count]", Y: "Movies[Vote Average]", Details: "Movies[Title]" }, color_strategy: measure_match }
          - { id: title_table, region: titles, kind: tableEx, purpose: "Which individual films rank best?", field_bindings: ["Movies[Title]", "Movies[Release Year]", "Movies[Primary Genre]", "_Measures[Rating Bar SVG]", "_Measures[Weighted Rating]", "Movies[Vote Count]", "Movies[Revenue]"], sort_policy: value_desc }
        space_audit:
          content_cell_count: 132
          placed_cell_count: 132
          empty_cell_pct: 0
          unplaced_regions: []
          largest_region: { name: titles, pct_of_content: 45 }
          balance_rationale: "Ranked table is the deliverable of the page (5 rows tall for ~10 visible rows); two overview visuals above give context. Three data visuals, largest 45 % < 55 %."
  interaction_pattern:
    drill_targets: []
    cross_filter_rules: "Filter for all chart-to-chart pairs; slicers are page-local"
  accessibility:
    alt_text_strategy: headline+trend
    contrast_notes: "#4988C4 only as graphic fill (3.4:1 on white); never as text. #BDE8F5 text only on #0F2854."
  theme:
    base: "assets/base.json adapted to Midnight Cinema (existing Fluent2 base theme retained as baseTheme)"
    user_overrides: "Palette fixed by user: 0F2854, 1C4D8D, 4988C4, BDE8F5"
```

## Implementation notes
- Model changes: rewrite `movies_metadata.tmdl` (rename → `Movies`) with corrected M; add `Genres`, `MovieGenres`, `_Measures`, relationships; validate M/DAX by opening in Desktop and refreshing
- PBIR/report authoring: through `powerbi-report-authoring`; generator script; theme registered in `report.json`
- Validation: `powerbi-report-author validate`, then Desktop `open`/`reload` + `screenshot-all`
- Publishing boundary: none unless requested
- Risks: M cannot be tested until Desktop refresh (30 s on 34 MB CSV); scatter with ~5k points is dense (Top-N or transparency); Genre slicer relies on bi-directional bridge; SVG image measures depend on Desktop version support in `tableEx`

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
- Tooltip text size set to 8 pt (2 pt below Power BI's 10 pt default), colors and transparency unchanged.
