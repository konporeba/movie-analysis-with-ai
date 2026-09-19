// "Neon HUD" restyle of Movie Analysis With AI: dark digital theme, larger type.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPORT = 'X:/AI Dashboard V2/Movie Analysis With AI.Report';
const DEF = REPORT + '/definition';
const THEME_NAME = 'NeonHud';
const THEME_GUID = crypto.randomBytes(4).toString('hex');
const THEME_FILE = `${THEME_NAME}-${THEME_GUID}.json`;
const BG_IMAGE_FILE = 'grid-bg1758300000000000001.png';

const SCHEMA_VISUAL = 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.9.0/schema.json';
const SCHEMA_PAGE = 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.1.0/schema.json';

// ---------- palette ----------
const BG = '#050B1A', CARD = '#0B1730', CARD2 = '#10203F', BAND = '#070F22', BORDER = '#1F4A80', GRID = '#1A2E55';
const TEXT = '#EAF2FF', MUTED = '#9DB4D8';
const CYAN = '#22D3EE', BLUE = '#3B82F6', SKY = '#60A5FA', VIOLET = '#A78BFA', PINK = '#4ADE80', TEAL = '#2DD4BF';
const HEAD_FONT = 'Bahnschrift SemiBold', BODY_FONT = 'Segoe UI', BODY_BOLD = 'Segoe UI Semibold';

// ---------- expression helpers ----------
const lit = v => ({ expr: { Literal: { Value: v } } });
const S = s => lit("'" + String(s).replace(/'/g, "''") + "'");
const D = n => lit(n + 'D');
const I = n => lit(n + 'L');
const B = b => lit(b ? 'true' : 'false');
const C = hex => ({ solid: { color: lit("'" + hex + "'") } });
const col = (e, p) => ({ Column: { Expression: { SourceRef: { Entity: e } }, Property: p } });
const mea = p => ({ Measure: { Expression: { SourceRef: { Entity: '_Measures' } }, Property: p } });
const proj = (f, extra = {}) => {
  const k = f.Column || f.Measure;
  return Object.assign({ field: f, queryRef: k.Expression.SourceRef.Entity + '.' + k.Property, nativeQueryRef: k.Property }, extra);
};
const cat = f => proj(f, { active: true });
const hex = n => crypto.randomBytes(n).toString('hex');
const filterName = () => 'Filter' + hex(12);
const idFor = (page, key) => crypto.createHash('sha1').update(page + '|' + key).digest('hex').slice(0, 20);

// ---------- geometry ----------
const W = 1920, H = 1080, MARGIN = 32, GUTTER = 24, HEADER_H = 120, TOP = 140, BOTTOM = H - MARGIN;
const ROWS = 11;
const RH = (BOTTOM - TOP) / ROWS, CW = (W - 2 * MARGIN) / 12;
const snap = v => Math.round(v / 8) * 8;
function rect(region, slot) {
  const [c1, r1, c2, r2] = region;
  let x1 = MARGIN + (c1 - 1) * CW, x2 = MARGIN + (c2 - 1) * CW;
  let y1 = TOP + (r1 - 2) * RH, y2 = TOP + (r2 - 2) * RH;
  if (c1 > 1) x1 += GUTTER / 2;
  if (c2 < 13) x2 -= GUTTER / 2;
  if (r1 > 2) y1 += GUTTER / 2;
  if (r2 < 13) y2 -= GUTTER / 2;
  if (slot) {
    const { i, of } = slot;
    const w = (x2 - x1 - (of - 1) * GUTTER) / of;
    x1 = x1 + (i - 1) * (w + GUTTER); x2 = x1 + w;
  }
  const x = snap(x1), y = snap(y1);
  return { x, y, width: Math.min(snap(x2), W - MARGIN) - x, height: Math.min(snap(y2), H - MARGIN) - y };
}

// second grid for pages with a KPI strip: content starts below the strip, rows 2..11
const STRIP_H = 112, TOP2 = TOP + STRIP_H + GUTTER, ROWS2 = 9;
const RH2 = (BOTTOM - TOP2) / ROWS2;
function rect2(region) {
  const [c1, r1, c2, r2] = region;
  let x1 = MARGIN + (c1 - 1) * CW, x2 = MARGIN + (c2 - 1) * CW;
  let y1 = TOP2 + (r1 - 2) * RH2, y2 = TOP2 + (r2 - 2) * RH2;
  if (c1 > 1) x1 += GUTTER / 2;
  if (c2 < 13) x2 -= GUTTER / 2;
  if (r1 > 2) y1 += GUTTER / 2;
  if (r2 < 11) y2 -= GUTTER / 2;
  const x = snap(x1), y = snap(y1);
  return { x, y, width: Math.min(snap(x2), W - MARGIN) - x, height: Math.min(snap(y2), H - MARGIN) - y };
}
function stripRect(i, of) {
  const w = (W - 2 * MARGIN - (of - 1) * GUTTER) / of;
  return { x: snap(MARGIN + (i - 1) * (w + GUTTER)), y: TOP, width: snap(w), height: STRIP_H };
}

// ---------- containers ----------
let zCounter;
function container(pageKey, key, pos, visual, extra = {}) {
  const z = zCounter; zCounter += 1000;
  return {
    $schema: SCHEMA_VISUAL,
    name: idFor(pageKey, key),
    position: { x: pos.x, y: pos.y, z, height: pos.height, width: pos.width, tabOrder: z },
    visual,
    ...extra,
  };
}
function vco({ title, alt, pad = 14 }) {
  const o = {};
  o.title = title
    ? [{ properties: { show: B(true), text: S(title), fontColor: C(TEXT), fontSize: D(18), bold: B(true), fontFamily: S(BODY_BOLD), alignment: S('left') } }]
    : [{ properties: { show: B(false) } }];
  if (alt) o.general = [{ properties: { altText: S(alt) } }];
  o.subTitle = [{ properties: { show: B(false) } }];
  o.visualTooltip = [{ properties: { show: B(true), type: S('Default'), background: C('#0A1B3D'), transparency: D(10), titleFontColor: C('#7DE3F4'), valueFontColor: C('#FFFFFF'), fontSize: D(9) } }];
  o.padding = [{ properties: { top: D(pad), bottom: D(pad), left: D(pad), right: D(pad) } }];
  return o;
}
const sortDef = (field, dir = 'Descending') => ({ sort: [{ field, direction: dir }], isDefaultSort: true });

// ---------- filters ----------
function topNFilter(entity, prop, n, orderCol, fn) {
  return {
    name: filterName(), field: col(entity, prop), type: 'TopN',
    filter: {
      Version: 2,
      From: [
        { Name: 'subquery', Expression: { Subquery: { Query: {
          Version: 2,
          From: [{ Name: 'm', Entity: entity, Type: 0 }],
          Select: [{ Column: { Expression: { SourceRef: { Source: 'm' } }, Property: prop }, Name: 'field' }],
          OrderBy: [{ Direction: 2, Expression: { Aggregation: {
            Expression: { Column: { Expression: { SourceRef: { Source: 'm' } }, Property: orderCol } }, Function: fn } } }],
          Top: n,
        } } }, Type: 2 },
        { Name: 't', Entity: entity, Type: 0 },
      ],
      Where: [{ Condition: { In: {
        Expressions: [{ Column: { Expression: { SourceRef: { Source: 't' } }, Property: prop } }],
        Table: { SourceRef: { Source: 'subquery' } },
      } } }],
    },
    howCreated: 'User',
  };
}
function inFilter(entity, prop, values, not = false) {
  const inExpr = { In: {
    Expressions: [{ Column: { Expression: { SourceRef: { Source: 't' } }, Property: prop } }],
    Values: values.map(v => [{ Literal: { Value: "'" + v + "'" } }]),
  } };
  return {
    name: filterName(), field: col(entity, prop), type: 'Categorical',
    filter: { Version: 2, From: [{ Name: 't', Entity: entity, Type: 0 }],
      Where: [{ Condition: not ? { Not: { Expression: inExpr } } : inExpr }] },
    howCreated: 'User',
  };
}

// ---------- visual builders ----------
const zeroPad = { padding: [{ properties: { top: D(0), bottom: D(0), left: D(0), right: D(0) } }] };
function textbox(pageKey, key, pos, text, { size, color = TEXT, font = BODY_BOLD }) {
  return container(pageKey, key, pos, {
    visualType: 'textbox',
    objects: { general: [{ properties: { paragraphs: [{
      textRuns: [{ value: text, textStyle: { fontFamily: font, fontSize: size + 'px', color } }],
      horizontalTextAlignment: 'left',
    }] } }] },
    visualContainerObjects: {
      background: [{ properties: { show: B(false) } }],
      border: [{ properties: { show: B(false) } }],
      dropShadow: [{ properties: { show: B(false) } }],
      ...zeroPad,
    },
  });
}
function shape(pageKey, key, pos, fill) {
  return container(pageKey, key, pos, {
    visualType: 'shape',
    objects: {
      shape: [{ properties: { tileShape: S('rectangle') } }],
      fill: [{ properties: { fillColor: C(fill), transparency: D(0) }, selector: { id: 'default' } }],
      outline: [{ properties: { show: B(false) }, selector: { id: 'default' } }],
    },
    visualContainerObjects: {
      background: [{ properties: { show: B(false) } }],
      border: [{ properties: { show: B(false) } }],
      dropShadow: [{ properties: { show: B(false) } }],
      ...zeroPad,
    },
  });
}
function slicer(pageKey, key, pos, entity, prop, header, mode = 'Dropdown') {
  return container(pageKey, key, pos, {
    visualType: 'slicer',
    query: { queryState: { Values: { projections: [proj(col(entity, prop), { active: true })] } } },
    objects: {
      data: [{ properties: { mode: S(mode) } }],
      header: [{ properties: { show: B(true), text: S(header), fontColor: C(MUTED), textSize: D(13), fontFamily: S(BODY_BOLD) } }],
      items: [{ properties: { fontColor: C(TEXT), textSize: D(14), fontFamily: S(BODY_FONT), background: C(CARD2) } }],
    },
    visualContainerObjects: {
      padding: [{ properties: { top: D(10), bottom: D(10), left: D(12), right: D(12) } }],
    },
  });
}
function card(pageKey, key, pos, measure, label, color, alt, units = 1) {
  return container(pageKey, key, pos, {
    visualType: 'cardVisual',
    query: { queryState: { Data: { projections: [proj(mea(measure))] } } },
    objects: {
      value: [{ properties: { fontSize: D(40), fontFamily: S(HEAD_FONT), fontColor: C(TEXT), bold: B(false), labelDisplayUnits: D(units) }, selector: { id: 'default' } }],
      label: [{ properties: { show: B(true), text: S(label), fontSize: D(15), fontFamily: S(BODY_FONT), fontColor: C(MUTED) }, selector: { id: 'default' } }],
      accentBar: [{ properties: { show: B(true), position: S('Left'), width: D(6), color: C(color) }, selector: { id: 'default' } }],
      outline: [{ properties: { show: B(false) }, selector: { id: 'default' } }],
      fillCustom: [{ properties: { show: B(true), fillColor: C(CARD), transparency: D(0) }, selector: { id: 'default' } }],
    },
    visualContainerObjects: vco({ alt, pad: 8 }),
  });
}
const HTML_VISUAL = 'htmlContent443BE3AD55E043BF878BED274D3A6855';
function kpiStrip(pageKey, items) {
  return items.map(([m, alt], i) => htmlCard(pageKey, 'kpi_' + m, stripRect(i + 1, items.length), m, alt));
}
function htmlCard(pageKey, key, pos, measure, alt) {
  return container(pageKey, key, pos, {
    visualType: HTML_VISUAL,
    query: { queryState: { content: { projections: [proj(mea(measure))] } } },
    visualContainerObjects: vco({ alt, pad: 0 }),
  });
}
// kind: barChart (horizontal) | columnChart | lineChart
function cartesian(pageKey, key, pos, kind, o) {
  const { catField, measure, color, title, alt, sort, filters, axisStart, axisEnd, scalar, labels = true, dense = false, units = 0, precision, pad, markers, catSize: catSizeOpt, gap = 40, labelMargin, extraObjects = {} } = o;
  const catSize = catSizeOpt || (dense ? 12 : 13);
  const objects = Object.assign({
    dataPoint: [{ properties: { defaultColor: C(color) } }],
    labels: [{ properties: { show: B(labels), color: C(TEXT), fontSize: D(dense ? 12 : 13), fontFamily: S(BODY_FONT), labelDisplayUnits: D(units), ...(precision !== undefined ? { labelPrecision: I(precision) } : {}) } }],
    categoryAxis: [{ properties: { fontSize: D(catSize), labelColor: C(TEXT), ...(kind === 'barChart' || kind === 'columnChart' ? { innerPadding: I(gap) } : {}), ...(labelMargin ? { maxMarginFactor: I(labelMargin) } : {}), ...(scalar ? { axisType: S('Scalar') } : {}) } }],
  }, extraObjects);
  if (kind === 'lineChart') objects.valueAxis = [{ properties: { fontSize: D(12), labelColor: C(MUTED), gridlineColor: C(GRID), ...(axisStart !== undefined ? { start: D(axisStart) } : {}) } }];
  else if (axisStart !== undefined || axisEnd !== undefined) objects.valueAxis = [{ properties: { ...(axisStart !== undefined ? { start: D(axisStart) } : {}), ...(axisEnd !== undefined ? { end: D(axisEnd) } : {}) } }];
  if (markers) objects.lineStyles = [{ properties: { strokeWidth: D(3), showMarker: B(true), markerSize: D(9), markerColor: C(color), lineChartType: S('smooth'), areaShow: B(true) } }];
  const query = { queryState: {
    Category: { projections: [cat(catField)] },
    Y: { projections: [proj(mea(measure))] },
  } };
  if (sort) query.sortDefinition = sort;
  return container(pageKey, key, pos, {
    visualType: kind, query, objects, visualContainerObjects: vco({ title, alt, pad }),
  }, filters ? { filterConfig: { filters } } : {});
}
function scatter(pageKey, key, pos, { xMeasure, yMeasure, sizeMeasure, detail, color, title, alt, filters, log, xTitle, yTitle }) {
  const query = { queryState: {
    Category: { projections: [cat(detail)] },
    X: { projections: [proj(mea(xMeasure))] },
    Y: { projections: [proj(mea(yMeasure))] },
  } };
  if (sizeMeasure) query.queryState.Tooltips = { projections: [proj(mea(sizeMeasure))] };
  const axis = (t, grid) => [{ properties: {
    labelDisplayUnits: D(0), logAxisScale: B(!!log), fontSize: D(12), labelColor: C(MUTED),
    showAxisTitle: B(true), titleText: S(t), titleColor: C(TEXT), titleFontSize: D(13),
    gridlineShow: B(grid), gridlineColor: C(GRID),
  } }];
  return container(pageKey, key, pos, {
    visualType: 'scatterChart', query,
    objects: {
      dataPoint: [{ properties: { defaultColor: C(color) } }],
      bubbles: [{ properties: { bubbleSize: I(1) } }],
      categoryAxis: axis(xTitle, false),
      valueAxis: axis(yTitle, true),
    },
    visualContainerObjects: vco({ title, alt }),
  }, filters ? { filterConfig: { filters } } : {});
}
function titleTable(pageKey, key, pos, { title, alt }) {
  const cols = [
    proj(col('Movies', 'Title'), { displayName: 'Title' }),
    proj(col('Movies', 'Release Year'), { displayName: 'Year' }),
    proj(col('Movies', 'Primary Genre'), { displayName: 'Genre' }),
    proj(mea('Rating Bar SVG'), { displayName: 'Rating' }),
    proj(mea('Weighted Rating'), { displayName: 'Score' }),
    proj(mea('Total Votes'), { displayName: 'Votes' }),
    proj(mea('Total Revenue'), { displayName: 'Revenue' }),
  ];
  return container(pageKey, key, pos, {
    visualType: 'tableEx',
    query: { queryState: { Values: { projections: cols } }, sortDefinition: sortDef(mea('Weighted Rating')) },
    objects: {
      grid: [{ properties: { rowPadding: D(4), imageHeight: D(18), imageWidth: D(120), gridHorizontalColor: C(GRID), gridVerticalColor: C(GRID) } }],
      total: [{ properties: { totals: B(false) } }],
      columnHeaders: [{ properties: { fontSize: D(14), fontColor: C(CYAN), backColor: C('#0D2447'), bold: B(true), autoSizeColumnWidth: B(true), columnAdjustment: S('growToFit') } }],
      values: [{ properties: { fontSize: D(14), fontColor: C(TEXT), backColorPrimary: C(CARD), backColorSecondary: C(CARD2), fontColorPrimary: C(TEXT), fontColorSecondary: C(TEXT) } }],
    },
    visualContainerObjects: Object.assign(vco({ title, alt }), { stylePreset: [{ properties: { name: S('None') } }] }),
  });
}

// ---------- page furniture ----------
function header(pageKey, title, { slicerCount = 0 } = {}) {
  const out = [];
  const SLW = 224, GAP = 16;
  const filtersW = slicerCount * SLW + Math.max(0, slicerCount - 1) * GAP;
  const textX = MARGIN + 24;
  const titleW = slicerCount ? W - textX - MARGIN - filtersW - GUTTER : W - textX - MARGIN;
  out.push(shape(pageKey, 'band_marker', { x: MARGIN, y: 20, width: 6, height: 80 }, CYAN));
  out.push(textbox(pageKey, 'eyebrow', { x: textX, y: 16, width: titleW, height: 28 }, 'MOVIE ANALYSIS  //  TMDB DATASET  //  1874 - 2017', { size: 14, color: CYAN, font: 'Consolas' }));
  out.push(textbox(pageKey, 'page_title', { x: textX, y: 48, width: titleW, height: 60 }, title, { size: 36, color: TEXT, font: HEAD_FONT }));
  return out;
}
function filterSlicers(pageKey, defs, { y = 12, h = 96 } = {}) {
  const SLW = 224, GAP = 16, n = defs.length;
  const x0 = W - MARGIN - (n * SLW + (n - 1) * GAP);
  return defs.map((d, i) => slicer(pageKey, 'slicer_' + d.key, { x: x0 + i * (SLW + GAP), y, width: SLW, height: h }, d.entity, d.prop, d.header, d.mode));
}
function writeVisuals(pageDir, visuals) {
  const vdir = path.join(pageDir, 'visuals');
  fs.rmSync(vdir, { recursive: true, force: true });
  for (const v of visuals) {
    const dir = path.join(vdir, v.name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'visual.json'), JSON.stringify(v, null, 2));
  }
}

const pages = [];

// ===== Page 1 =====
{
  const key = 'p1', id = 'a1d8add3de18ace488d7';
  zCounter = 1000;
  const v = [];
  v.push(...header(key, 'Film Output Tripled Since the 1980s While Ratings Slipped', { slicerCount: 3 }));
  v.push(...filterSlicers(key, [
    { key: 'decade', entity: 'Movies', prop: 'Decade', header: 'DECADE' },
    { key: 'genre', entity: 'Genres', prop: 'Genre', header: 'GENRE' },
    { key: 'language', entity: 'Movies', prop: 'Language', header: 'LANGUAGE' },
  ]));
  const kpis = [
    ['KPI Films HTML', 'Number of films in the current selection with share of all films'],
    ['KPI Rating HTML', 'Vote-weighted average rating of the selection with stars and difference versus all films'],
    ['KPI Revenue HTML', 'Total worldwide revenue of the selection with profit margin'],
    ['KPI Budget HTML', 'Total production budget of the selection as a share of revenue'],
    ['KPI Runtime HTML', 'Average film length in minutes versus all films'],
    ['KPI Hit Rate HTML', 'Share of films with known financials that earned more than they cost'],
  ];
  kpis.forEach(([m, alt], i) => {
    v.push(htmlCard(key, 'kpi_' + m, rect([1, 2, 13, 4], { i: i + 1, of: 6 }), m, alt));
  });
  v.push(cartesian(key, 'films_per_year', rect([1, 4, 9, 8]), 'lineChart', {
    catField: col('Movies', 'Release Year'), measure: 'Movies', color: CYAN, scalar: true, labels: false,
    title: 'Films released per year (2017 is a partial year)', alt: 'Line chart of the number of films released each year, rising steeply after 1990',
    extraObjects: { lineStyles: [{ properties: { strokeWidth: D(3), areaShow: B(true), lineChartType: S('smooth') } }] },
  }));
  v.push(cartesian(key, 'top_genres', rect([9, 4, 13, 13]), 'barChart', {
    catField: col('Genres', 'Genre'), measure: 'Movies', color: CYAN, sort: sortDef(mea('Movies')), precision: 1,
    title: 'Films per genre', alt: 'Bar chart of film count by genre, led by Drama and Comedy',
  }));
  v.push(cartesian(key, 'rating_dist', rect([1, 8, 4, 13]), 'columnChart', {
    catField: col('Movies', 'Rating Band'), measure: 'Rated Movies', color: VIOLET, sort: sortDef(col('Movies', 'Rating Band Sort'), 'Ascending'),
    title: 'Rating distribution (10+ votes)', alt: 'Column chart of films by average rating band',
    filters: [inFilter('Movies', 'Rating Band', ['Unrated'], true)],
  }));
  v.push(cartesian(key, 'top_languages', rect([4, 8, 6, 13]), 'barChart', {
    catField: col('Movies', 'Language'), measure: 'Movies', color: CYAN, sort: sortDef(mea('Movies')), precision: 1, axisEnd: 46000,
    title: 'Top 8 languages', alt: 'Bar chart of the eight most common original languages, English far ahead',
    filters: [topNFilter('Movies', 'Language', 8, 'Movie ID', 2)],
  }));
  v.push(cartesian(key, 'revenue_decade', rect([6, 8, 9, 13]), 'barChart', {
    catField: col('Movies', 'Decade'), measure: 'Total Revenue', color: BLUE, dense: true, units: 1000000000, precision: 0,
    sort: sortDef(col('Movies', 'Decade Sort'), 'Ascending'),
    title: 'Revenue by decade', alt: 'Bar chart of total revenue by decade, growing sharply from the 1980s',
  }));
  pages.push({ id, key, name: 'Overview', visuals: v });
}

// ===== Page 2 =====
{
  const key = 'p2', id = idFor('page', 'p2');
  zCounter = 1000;
  const v = [];
  v.push(...header(key, 'Bigger Budgets Buy Revenue, Not Better Ratings', { slicerCount: 4 }));
  v.push(...filterSlicers(key, [
    { key: 'decade', entity: 'Movies', prop: 'Decade', header: 'DECADE' },
    { key: 'language', entity: 'Movies', prop: 'Language', header: 'LANGUAGE' },
    { key: 'tier', entity: 'Movies', prop: 'Budget Tier', header: 'BUDGET TIER' },
    { key: 'genre', entity: 'Genres', prop: 'Genre', header: 'GENRE' },
  ]));
  v.push(...kpiStrip(key, [
    ['KPI Median ROI HTML', 'Median return on investment as a multiple of budget'],
    ['KPI Avg Budget HTML', 'Average budget per film compared with average revenue'],
    ['KPI Avg Revenue HTML', 'Average revenue per film as a multiple of average budget'],
    ['KPI Profit Rate HTML', 'Share of films with known financials that made a profit'],
  ]));
  v.push(scatter(key, 'budget_vs_revenue', rect2([1, 2, 6, 7]), {
    xMeasure: 'Budget (USD M)', yMeasure: 'Revenue (USD M)', sizeMeasure: 'Total Votes', detail: col('Movies', 'Title and Year'), color: CYAN, log: true,
    title: 'Budget vs revenue per film (log scales)', alt: 'Scatter chart of production budget against revenue for each film with known financials, log scales',
    xTitle: 'Budget', yTitle: 'Revenue',
    filters: [inFilter('Movies', 'Has Financials', ['Yes'])],
  }));
  v.push(cartesian(key, 'roi_by_tier', rect2([1, 7, 3.5, 11]), 'barChart', {
    catField: col('Movies', 'Budget Tier'), measure: 'Median ROI', color: PINK, sort: sortDef(col('Movies', 'Budget Tier Sort'), 'Ascending'),
    title: 'Median ROI by tier', alt: 'Bar chart of median ROI for each budget tier; micro budgets return the most',
    filters: [inFilter('Movies', 'Budget Tier', ['Unknown'], true)],
  }));
  v.push(cartesian(key, 'rating_by_tier', rect2([3.5, 7, 6, 11]), 'barChart', {
    catField: col('Movies', 'Budget Tier'), measure: 'Weighted Rating', color: VIOLET, axisStart: 5, sort: sortDef(col('Movies', 'Budget Tier Sort'), 'Ascending'),
    title: 'Rating by tier (axis from 5)', alt: 'Bar chart of weighted rating for each budget tier; ratings barely change as budgets grow',
    filters: [inFilter('Movies', 'Budget Tier', ['Unknown'], true)],
  }));
  v.push(cartesian(key, 'roi_by_genre', rect2([6, 2, 9, 11]), 'barChart', {
    catField: col('Genres', 'Genre'), measure: 'Median ROI', color: PINK, sort: sortDef(mea('Median ROI')),
    title: 'Median ROI by genre (excl. TV Movie)', alt: 'Bar chart of median return on investment by genre, excluding TV Movie which has too few films with known financials',
    filters: [inFilter('Genres', 'Genre', ['TV Movie'], true)],
  }));
  v.push(cartesian(key, 'top_roi_films', rect2([9, 2, 13, 11]), 'barChart', {
    catField: col('Movies', 'Title and Year'), measure: 'ROI', color: PINK, sort: sortDef(mea('ROI')), axisEnd: 330, gap: 55, labelMargin: 50, catSize: 12,
    title: 'Top 10 ROI multiple (budget $1M+)', alt: 'Bar chart of the ten films with the highest return on investment among films with at least a one million dollar budget',
    filters: [topNFilter('Movies', 'Title and Year', 10, 'Big Budget ROI', 4)],
  }));
  pages.push({ id, key, name: 'Money and Success', visuals: v });
}

// ===== Page 3 =====
{
  const key = 'p3', id = idFor('page', 'p3');
  zCounter = 1000;
  const v = [];
  v.push(...header(key, 'Drama Leads in Volume, but War and History Films Rate Highest', { slicerCount: 2 }));
  v.push(...filterSlicers(key, [
    { key: 'decade', entity: 'Movies', prop: 'Decade', header: 'DECADE' },
    { key: 'language', entity: 'Movies', prop: 'Language', header: 'LANGUAGE' },
  ]));
  v.push(...kpiStrip(key, [
    ['KPI Most Films Genre HTML', 'Genre with the most films and its share of the selection'],
    ['KPI Best Genre HTML', 'Best rated genre and its weighted rating'],
    ['KPI Top Earner Genre HTML', 'Genre with the highest average revenue per film compared with the overall average'],
    ['KPI Best Decade HTML', 'Best rated decade and its weighted rating'],
  ]));
  v.push(cartesian(key, 'genre_rating_rank', rect2([1, 2, 5, 11]), 'barChart', {
    catField: col('Genres', 'Genre'), measure: 'Weighted Rating', color: VIOLET, axisStart: 5, sort: sortDef(mea('Weighted Rating')),
    title: 'Rating by genre (axis from 5)', alt: 'Ranked bar chart of weighted rating by genre; War, History and Documentary lead',
  }));
  v.push(cartesian(key, 'genre_revenue_rank', rect2([5, 2, 9, 11]), 'barChart', {
    catField: col('Genres', 'Genre'), measure: 'Avg Revenue per Film', color: BLUE, sort: sortDef(mea('Avg Revenue per Film')),
    title: 'Average revenue per film', alt: 'Ranked bar chart of average revenue per film by genre; Adventure and Animation lead',
  }));
  v.push(cartesian(key, 'top_countries', rect2([9, 2, 13, 7]), 'barChart', {
    catField: col('Movies', 'Primary Country'), measure: 'Movies', color: CYAN, sort: sortDef(mea('Movies')), precision: 1, gap: 50,
    title: 'Top 10 production countries', alt: 'Bar chart of the ten countries producing the most films, United States first',
    filters: [inFilter('Movies', 'Primary Country', ['Unknown'], true), topNFilter('Movies', 'Primary Country', 10, 'Movie ID', 2)],
  }));
  v.push(cartesian(key, 'rating_by_decade', rect2([9, 7, 13, 11]), 'lineChart', {
    catField: col('Movies', 'Decade'), measure: 'Weighted Rating', color: VIOLET, markers: true, axisStart: 6, catSize: 11,
    sort: sortDef(col('Movies', 'Decade Sort'), 'Ascending'),
    title: 'Rating by decade (axis from 6)', alt: 'Line chart of weighted rating by decade, peaking in the 1920s and declining since the 1970s',
  }));
  pages.push({ id, key, name: 'Genre and Country', visuals: v });
}

// ===== Page 4 =====
{
  const key = 'p4', id = idFor('page', 'p4');
  zCounter = 1000;
  const v = [];
  v.push(...header(key, 'The Films Worth Watching: Best Rated and Biggest Earners', { slicerCount: 3 }));
  v.push(...filterSlicers(key, [
    { key: 'decade', entity: 'Movies', prop: 'Decade', header: 'DECADE' },
    { key: 'genre', entity: 'Genres', prop: 'Genre', header: 'GENRE' },
    { key: 'language', entity: 'Movies', prop: 'Language', header: 'LANGUAGE' },
  ]));
  v.push(...kpiStrip(key, [
    ['KPI Top Grossing HTML', 'Highest grossing film in the selection and its revenue'],
    ['KPI Top Rated HTML', 'Highest rated film in the selection with score and votes'],
    ['KPI Most Voted HTML', 'Most voted film in the selection and its share of all votes'],
    ['KPI Films Shown HTML', 'Number of films in the selection and how many have enough votes for a reliable rating'],
  ]));
  v.push(cartesian(key, 'top10_revenue', rect2([1, 2, 6, 7]), 'barChart', {
    catField: col('Movies', 'Title and Year'), measure: 'Total Revenue', color: BLUE, sort: sortDef(mea('Total Revenue')), gap: 50, labelMargin: 50, catSize: 12,
    title: 'Top 10 films by revenue', alt: 'Bar chart of the ten highest-grossing films in the selection',
    filters: [topNFilter('Movies', 'Title and Year', 10, 'Revenue', 0)],
  }));
  v.push(scatter(key, 'votes_vs_rating', rect2([6, 2, 13, 7]), {
    xMeasure: 'Total Votes', yMeasure: 'Weighted Rating', detail: col('Movies', 'Title and Year'), color: VIOLET, log: false,
    title: 'Votes vs rating (1,000 most-voted films)', alt: 'Scatter chart of vote count against weighted rating for the thousand most-voted films',
    xTitle: 'Votes', yTitle: 'Weighted rating',
    filters: [topNFilter('Movies', 'Title and Year', 1000, 'Vote Count', 0)],
  }));
  v.push(titleTable(key, 'title_table', rect2([1, 7, 13, 11]), {
    title: 'Highest rated films (vote-weighted score)', alt: 'Ranked table of films by weighted rating with rating bar, votes and revenue',
  }));
  pages.push({ id, key, name: 'Title Explorer', visuals: v });
}

// ---------- theme ----------
const txt = hexv => ({ solid: { color: hexv } });
const theme = {
  $schema: 'https://raw.githubusercontent.com/microsoft/powerbi-desktop-samples/main/Report%20Theme%20JSON%20Schema/reportThemeSchema-2.153.json',
  name: THEME_FILE,
  dataColors: [CYAN, BLUE, VIOLET, PINK, TEAL, SKY, '#FB923C', '#34D399'],
  good: '#34D399', neutral: '#60A5FA', bad: '#FB923C', maximum: CYAN, center: BLUE, minimum: '#12305C', null: '#4B5F86',
  foreground: TEXT, background: CARD, secondaryBackground: CARD2, tableAccent: CYAN,
  firstLevelElements: TEXT, secondLevelElements: MUTED, thirdLevelElements: GRID, fourthLevelElements: BORDER,
  textClasses: {
    callout: { fontSize: 40, fontFace: HEAD_FONT, color: TEXT },
    title: { fontSize: 18, fontFace: BODY_BOLD, color: TEXT },
    header: { fontSize: 14, fontFace: BODY_BOLD, color: TEXT },
    label: { fontSize: 13, fontFace: BODY_FONT, color: TEXT },
  },
  visualStyles: {
    '*': { '*': {
      border: [{ show: true, color: txt(BORDER), radius: 12 }],
      background: [{ show: true, color: txt(CARD), transparency: 0 }],
      dropShadow: [{ show: true, color: txt(CYAN), position: 'Outer', preset: 'Custom', shadowBlur: 14, shadowDistance: 0, shadowSpread: 0, angle: 45, transparency: 82 }],
      padding: [{ top: 14, bottom: 14, left: 14, right: 14 }],
      visualHeader: [{ show: false }],
      visualTooltip: [{ show: true, type: 'Default', background: txt('#0A1B3D'), themedBackground: txt('#0A1B3D'), transparency: 10, titleFontColor: txt('#7DE3F4'), themedTitleFontColor: txt('#7DE3F4'), valueFontColor: txt('#FFFFFF'), themedValueFontColor: txt('#FFFFFF'), fontSize: 9 }],
      categoryAxis: [{ gridlineStyle: 'dotted', gridlineColor: txt(GRID) }],
      valueAxis: [{ gridlineStyle: 'dotted', gridlineColor: txt(GRID) }],
    } },
    tableEx: { '*': {
      columnHeaders: [{ autoSizeColumnWidth: true, columnAdjustment: 'growToFit', backColor: txt('#0D2447'), fontColor: txt(CYAN), bold: true, fontSize: 14 }],
      values: [{ backColorPrimary: txt(CARD), backColorSecondary: txt(CARD2), fontColorPrimary: txt(TEXT), fontColorSecondary: txt(TEXT), fontSize: 14 }],
    } },
    pivotTable: { '*': {
      columnHeaders: [{ autoSizeColumnWidth: true, columnAdjustment: 'growToFit', backColor: txt('#0D2447'), fontColor: txt(CYAN), bold: true, fontSize: 13 }],
      values: [{ backColorPrimary: txt(CARD), backColorSecondary: txt(CARD2), fontColorPrimary: txt(TEXT), fontColorSecondary: txt(TEXT), fontSize: 13 }],
    } },
    cardVisual: { '*': {
      value: [{ bold: false, '$id': 'default' }],
      label: [{ show: true, '$id': 'default' }],
      cardCalloutArea: [{ paddingUniform: 0 }],
      title: [{ show: false }],
    } },
    textbox: { '*': {
      padding: [{ top: 0, bottom: 0, left: 0, right: 0 }],
      background: [{ show: false }],
      border: [{ show: false }],
      dropShadow: [{ show: false }],
    } },
    shape: { '*': {
      padding: [{ top: 0, bottom: 0, left: 0, right: 0 }],
      background: [{ show: false }],
      border: [{ show: false }],
      dropShadow: [{ show: false }],
    } },
    barChart: { '*': {
      labels: [{ show: true, fontSize: 13, color: txt(TEXT) }],
      valueAxis: [{ show: false, gridlineShow: false, showAxisTitle: false }],
      categoryAxis: [{ show: true, fontSize: 13, labelColor: txt(TEXT), showAxisTitle: false, innerPadding: 20, gridlineShow: false }],
      dataPoint: [{ borderShow: false }],
      legend: [{ show: false }],
    } },
    columnChart: { '*': {
      labels: [{ show: true, fontSize: 13, color: txt(TEXT) }],
      valueAxis: [{ show: false, gridlineShow: false, showAxisTitle: false }],
      categoryAxis: [{ show: true, fontSize: 13, labelColor: txt(TEXT), showAxisTitle: false, innerPadding: 20, gridlineShow: false }],
      dataPoint: [{ borderShow: false }],
      legend: [{ show: false }],
    } },
    lineChart: { '*': {
      lineStyles: [{ strokeWidth: 3, lineChartType: 'smooth', interpolationSmooth: 'monotoneX', areaShow: true, areaMatchStrokeColor: true }],
      dataPoint: [{ transparency: 75 }],
      labels: [{ show: true, fontSize: 13, color: txt(TEXT) }],
      categoryAxis: [{ show: true, fontSize: 13, labelColor: txt(TEXT), showAxisTitle: false, gridlineShow: false }],
      valueAxis: [{ show: true, fontSize: 12, labelColor: txt(MUTED), showAxisTitle: false, gridlineStyle: 'dotted', gridlineColor: txt(GRID) }],
      legend: [{ show: false }],
    } },
    scatterChart: { '*': { legend: [{ show: false }] } },
    slicer: { '*': {
      header: [{ fontFamily: BODY_BOLD, textSize: 13, fontColor: txt(MUTED), background: txt(CARD), outlineStyle: 0 }],
      items: [{ fontFamily: BODY_FONT, textSize: 14, fontColor: txt(TEXT), background: txt(CARD2), outlineStyle: 0, padding: 3 }],
      date: [{ fontFamily: BODY_FONT, textSize: 13, fontColor: txt(TEXT) }],
    } },
  },
};

// ---------- write everything ----------
const pagesDir = DEF + '/pages';
const existing = JSON.parse(fs.readFileSync(pagesDir + '/pages.json', 'utf8'));
const bgUrl = { expr: { ResourcePackageItem: { PackageName: 'RegisteredResources', PackageType: 1, ItemName: BG_IMAGE_FILE } } };
for (const p of pages) {
  const dir = path.join(pagesDir, p.id);
  fs.mkdirSync(dir, { recursive: true });
  const page = {
    $schema: SCHEMA_PAGE, name: p.id, displayName: p.name, displayOption: 'FitToPage', height: H, width: W,
    objects: {
      background: [{ properties: {
        color: C(BG), transparency: D(0),
        image: { image: { name: S('grid-bg.png'), url: bgUrl, scaling: S('Fill') } },
      } }],
      outspace: [{ properties: { color: C(BG), transparency: D(0) } }],
      outspacePane: [{ properties: { backgroundColor: C(CARD), foregroundColor: C(TEXT), border: B(true), borderColor: C(BORDER), checkboxAndApplyColor: C(CYAN), inputBoxColor: C(CARD2), titleSize: D(14), headerSize: D(13), searchTextSize: D(12), fontFamily: S(BODY_FONT) } }],
      filterCard: [
        { properties: { backgroundColor: C(CARD2), foregroundColor: C(TEXT), border: B(true), borderColor: C(CYAN), textSize: D(12) }, selector: { id: 'Applied' } },
        { properties: { backgroundColor: C(CARD), foregroundColor: C(MUTED), border: B(true), borderColor: C(BORDER), textSize: D(12) }, selector: { id: 'Available' } },
      ],
    },
  };
  fs.writeFileSync(path.join(dir, 'page.json'), JSON.stringify(page, null, 2));
  writeVisuals(dir, p.visuals);
}
existing.pageOrder = pages.map(p => p.id);
existing.activePageName = pages[0].id;
fs.writeFileSync(pagesDir + '/pages.json', JSON.stringify(existing, null, 2));

const resDir = REPORT + '/StaticResources/RegisteredResources';
fs.mkdirSync(resDir, { recursive: true });
for (const f of fs.readdirSync(resDir)) if (f.endsWith('.json')) fs.rmSync(path.join(resDir, f));
fs.writeFileSync(path.join(resDir, THEME_FILE), JSON.stringify(theme, null, 2));
const rp = DEF + '/report.json';
const report = JSON.parse(fs.readFileSync(rp, 'utf8'));
const base = report.themeCollection.baseTheme;
report.themeCollection = {
  baseTheme: base,
  customTheme: { name: THEME_FILE, reportVersionAtImport: base.reportVersionAtImport, type: 'RegisteredResources' },
};
report.resourcePackages = (report.resourcePackages || []).filter(r => r.name !== 'RegisteredResources');
report.resourcePackages.push({ name: 'RegisteredResources', type: 'RegisteredResources', items: [
  { name: THEME_FILE, path: THEME_FILE, type: 'CustomTheme' },
  { name: BG_IMAGE_FILE, path: BG_IMAGE_FILE, type: 'Image' },
] });
fs.writeFileSync(rp, JSON.stringify(report, null, 2));
console.log('pages:', pages.map(p => `${p.name} (${p.visuals.length})`).join(', '), '\ntheme:', THEME_FILE);
