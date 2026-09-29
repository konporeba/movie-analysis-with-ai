// Upgrade of Movie Analysis With AI (2026-09-29):
//  - taller rich HTML KPI cards on every page
//  - the basic built-in charts are replaced by Deneb (Vega-Lite) charts
// Edits the existing PBIR files in place (keeps names, filters, interactions, container styling).
//   node upgrade-report.js
const fs = require('fs');
const path = require('path');

const DEF = 'X:/AI Dashboard V2/Movie Analysis With AI.Report/definition';
const DENEB = 'deneb7E15AEF80B9E4D4F8E12924291ECE89A';
const P = { overview: 'a1d8add3de18ace488d7', money: 'c288367fb6b6659150fc', genre: '4215b814ac44384df309', titles: '36d04fef1908cd91b0ac' };

// ---------- palette ----------
const CYAN = '#22D3EE', BLUE = '#3B82F6', SKY = '#60A5FA', VIOLET = '#A78BFA', GREEN = '#4ADE80', TEAL = '#2DD4BF', ORANGE = '#FB923C';
const TEXT = '#EAF2FF', MUTED = '#9DB4D8', DIM = '#6C84AB', GRID = '#1A2E55', CARD = '#0B1730';
const grad = (a, b, horizontal = true) => ({ gradient: 'linear', x1: 0, y1: horizontal ? 0 : 1, x2: horizontal ? 1 : 0, y2: 0, stops: [{ offset: 0, color: a }, { offset: 1, color: b }] });

// ---------- PBIR helpers ----------
const lit = v => ({ expr: { Literal: { Value: v } } });
const S = s => lit("'" + String(s).replace(/'/g, "''") + "'");
const B = b => lit(b ? 'true' : 'false');
const D = n => lit(n + 'D');
const C = hex => ({ solid: { color: S(hex) } });
const vpath = (page, id) => path.join(DEF, 'pages', page, 'visuals', id, 'visual.json');
const load = (page, id) => JSON.parse(fs.readFileSync(vpath(page, id), 'utf8'));
const save = (page, id, v) => fs.writeFileSync(vpath(page, id), JSON.stringify(v, null, 2));
const col = (entity, prop, as) => ({ field: { Column: { Expression: { SourceRef: { Entity: entity } }, Property: prop } }, queryRef: `${entity}.${prop}`, nativeQueryRef: prop, displayName: as });
const mea = (prop, as) => ({ field: { Measure: { Expression: { SourceRef: { Entity: '_Measures' } }, Property: prop } }, queryRef: `_Measures.${prop}`, nativeQueryRef: prop, displayName: as });

function place(page, id, x, y, width, height) {
  const v = load(page, id);
  Object.assign(v.position, { x, y, width, height });
  save(page, id, v);
}

// ---------- Deneb ----------
const CONFIG = {
  background: 'transparent',
  view: { stroke: 'transparent' },
  font: 'Segoe UI',
  autosize: { type: 'fit', contains: 'padding' },
  padding: { left: 4, right: 10, top: 8, bottom: 4 },
  axis: {
    domain: false, ticks: false, grid: true, gridColor: GRID, gridDash: [2, 4], labelColor: MUTED, labelFont: 'Segoe UI',
    labelFontSize: 12, labelPadding: 6, titleColor: DIM, titleFont: 'Segoe UI', titleFontSize: 11, titleFontWeight: 'normal', titlePadding: 8,
  },
  axisBand: { grid: false },
  legend: { labelColor: MUTED, titleColor: DIM, labelFontSize: 12, symbolType: 'circle', orient: 'top', direction: 'horizontal', title: null },
  text: { color: TEXT, font: 'Segoe UI', fontSize: 12 },
  rule: { color: MUTED },
  line: { strokeWidth: 2.5 },
};

function toDeneb(page, id, { title, subtitle, fields, spec, alt, dropFilters = false }) {
  const v = load(page, id);
  const vco = v.visual.visualContainerObjects || {};
  if (title) vco.title[0].properties.text = S(title);
  vco.subTitle = [{ properties: { show: B(true), text: S(subtitle), fontColor: C(DIM), fontSize: D(11), fontFamily: S('Segoe UI') } }];
  if (alt) vco.general = [{ properties: { altText: S(alt) } }];
  v.visual = {
    visualType: DENEB,
    query: { queryState: { dataset: { projections: fields } } },
    objects: {
      vega: [{ properties: {
        provider: S('vegaLite'), jsonSpec: S(JSON.stringify(Object.assign({ $schema: 'https://vega.github.io/schema/vega-lite/v5.json', data: { name: 'dataset' } }, spec))),
        jsonConfig: S(JSON.stringify(CONFIG)), renderMode: S('svg'), enableTooltips: B(true), enableContextMenu: B(true),
        enableSelection: B(false), enableHighlight: B(false),
      } }],
    },
    visualContainerObjects: vco,
    drillFilterOtherVisuals: true,
  };
  if (dropFilters) delete v.filterConfig;
  v.$schema = v.$schema.replace(/visualContainer\/[\d.]+\//, 'visualContainer/2.12.0/');
  save(page, id, v);
}

// shared spec fragments
const tip = (field, title, format) => (format ? { field, title, type: 'quantitative', format } : { field, title, type: 'nominal' });
const decadeShort = { calculate: "datum.Decade == 'Pre-1920' ? 'Pre' : \"'\" + substring(datum.Decade, 2)", as: 'D' };
const moneyAxis = "datum.value >= 1e9 ? '$' + format(datum.value / 1e9, ',.0f') + 'bn' : datum.value >= 1e6 ? '$' + format(datum.value / 1e6, ',.0f') + 'M' : '$' + format(datum.value, ',.0f')";
const moneyText = f => `datum.${f} >= 1e9 ? '$' + format(datum.${f} / 1e9, ',.1f') + 'bn' : datum.${f} >= 1e6 ? '$' + format(datum.${f} / 1e6, ',.0f') + 'M' : '$' + format(datum.${f} / 1e3, ',.0f') + 'K'`;
const usdM = "datum.value >= 1000 ? '$' + format(datum.value / 1000, ',.0f') + 'bn' : datum.value >= 1 ? '$' + format(datum.value, ',.0f') + 'M' : '$' + format(datum.value * 1000, ',.0f') + 'K'";

// Ranked horizontal bars with a value label and an optional right-hand metric column.
function rankedBars({ cat, val, label, color, right, rightTitle, tooltip, top, rank = false, labelLimit = 150, room }) {
  const t = [];
  if (top) t.push({ window: [{ op: 'row_number', as: '_r' }], sort: [{ field: val, order: 'descending' }] }, { filter: `datum._r <= ${top}` });
  else if (rank) t.push({ window: [{ op: 'row_number', as: '_r' }], sort: [{ field: val, order: 'descending' }] });
  t.push({ joinaggregate: [{ op: 'max', field: val, as: '_max' }] }, { calculate: `datum.${val} / datum._max`, as: '_p' }, { calculate: label, as: '_lbl' });
  if (rank) t.push({ calculate: "'#' + datum._r + '  ' + datum['" + cat + "']", as: '_cat' });
  const y = { field: rank ? '_cat' : cat, type: 'nominal', sort: { field: val, order: 'descending' }, axis: { title: null, grid: false, labelColor: TEXT, labelFontSize: 13, labelLimit } };
  const layer = [
    { mark: { type: 'bar', height: { band: 0.62 }, cornerRadiusEnd: 4, color: grad(color[0], color[1]) },
      encoding: { y, tooltip, x: { field: '_p', type: 'quantitative', axis: null, scale: { domain: [0, room || (right ? 1.42 : 1.3)] } } } },
    { mark: { type: 'text', align: 'left', dx: 6, color: TEXT, fontSize: 12 }, encoding: { y, tooltip, x: { field: '_p', type: 'quantitative' }, text: { field: '_lbl' } } },
  ];
  if (right) layer.push({ mark: { type: 'text', align: 'right', x: { expr: 'width' }, fontWeight: 'bold', fontSize: 12 },
    encoding: { y, tooltip, text: { field: right.field, format: right.format }, color: right.color } });
  if (rightTitle) layer.push({ data: { values: [{ t: rightTitle }] }, mark: { type: 'text', align: 'right', baseline: 'bottom', x: { expr: 'width' }, y: -2, fontSize: 10, color: DIM }, encoding: { text: { field: 't' } } });
  return { transform: t, layer };
}

// =====================================================================================
// 1. KPI card layout: taller cards (224 px) on every page, charts start at y = 380
// =====================================================================================
const CARD_Y = 132, CARD_H = 224, TOP = 380, BOTTOM = 1048;
const strip = (page, ids) => {
  const n = ids.length, w = (1856 - (n - 1) * 24) / n;
  ids.forEach((id, i) => place(page, id, Math.round(32 + i * (w + 24)), CARD_Y, Math.round(w), CARD_H));
};
strip(P.overview, ['be1e88d93a05f679aef6', '7366b07d7d455aaa935e', 'e6bb119201074ed34ba7', '88a9fc22df53ffe25bdc', '7484ba8496885aed0168', 'c59c0180eba6895ac125']);
strip(P.money, ['c6a12a388a760cad6d89', 'b3835d172a1a072d4c8d', '383dc9c523fe5c59e795', '72bfdb053def4bd0d411']);
strip(P.genre, ['91d0481dc7abebc1a373', 'd55a5c562f9b35b259d1', '3d5dc35a7e1f5970fae9', '2e290fb75dfdec9e1ebf']);
strip(P.titles, ['29fad471b5a47af47c3c', 'fc6f98bb7b5ba316bbbd', 'eb6ef6128669fc9e0c4a', 'e07b82e4f1b31278ef02']);
{ // card alt text for the reworked Profit Rate card
  const v = load(P.money, '72bfdb053def4bd0d411');
  v.visual.visualContainerObjects.general = [{ properties: { altText: S('Profit margin of films with known financials, margin by decade, total profit and franchise revenue share') } }];
  save(P.money, '72bfdb053def4bd0d411', v);
}

// =====================================================================================
// 2. Overview
// =====================================================================================
// Films per year vs rating: the page headline in one chart.
place(P.overview, '715a3cec19c18a61ff40', 32, TOP, 1224, 344);
toDeneb(P.overview, '715a3cec19c18a61ff40', {
  title: 'Films per year vs weighted rating',
  subtitle: 'Area: films released per year · cyan line: 5-year average · violet: weighted rating, 5-year average (right axis) · 2017 is a partial year',
  alt: 'Films released per year since 1874 with a five-year average, and the five-year average weighted rating on a second axis',
  fields: [col('Movies', 'Release Year', 'Year'), mea('Movies', 'Films'), mea('Weighted Rating', 'Rating')],
  spec: {
    transform: [
      { filter: 'isValid(datum.Year)' },
      { window: [{ op: 'mean', field: 'Films', as: 'FilmsMA' }], frame: [-4, 0], sort: [{ field: 'Year' }] },
      { window: [{ op: 'mean', field: 'Rating', as: 'RatingMA' }], frame: [-4, 0], sort: [{ field: 'Year' }] },
    ],
    encoding: { x: { field: 'Year', type: 'quantitative', scale: { nice: false, zero: false }, axis: { format: 'd', grid: false, title: null, tickCount: 12 } } },
    layer: [
      { layer: [
        { transform: [{ filter: 'datum.Year == 1980' }], mark: { type: 'rect', color: CYAN, opacity: 0.05 }, encoding: { x: { datum: 1980 }, x2: { datum: 1990 } } },
        { transform: [{ filter: 'datum.Year == 1980' }], mark: { type: 'text', align: 'center', baseline: 'top', y: 4, color: DIM, fontSize: 11 }, encoding: { x: { datum: 1985 }, text: { value: '1980s' } } },
        { mark: { type: 'area', interpolate: 'monotone', color: grad('rgba(34,211,238,0.02)', 'rgba(34,211,238,0.45)', false) },
          encoding: { y: { field: 'Films', type: 'quantitative', axis: { title: 'Films per year', titleColor: CYAN, format: ',.0f' } } } },
        { mark: { type: 'line', interpolate: 'monotone', color: CYAN, strokeWidth: 2.5 }, encoding: { y: { field: 'FilmsMA', type: 'quantitative' } } },
        { params: [{ name: 'hover', select: { type: 'point', encodings: ['x'], nearest: true, on: 'pointerover', clear: 'pointerout' } }],
          mark: { type: 'rule', color: MUTED, strokeDash: [3, 3] },
          encoding: { opacity: { condition: { param: 'hover', empty: false, value: 0.8 }, value: 0 },
            tooltip: [tip('Year', 'Year', 'd'), tip('Films', 'Films', ',.0f'), tip('FilmsMA', 'Films, 5-yr avg', ',.0f'), tip('Rating', 'Weighted rating', '.2f'), tip('RatingMA', 'Rating, 5-yr avg', '.2f')] } },
      ] },
      { transform: [{ filter: 'datum.Year >= 1915' }],
        mark: { type: 'line', interpolate: 'monotone', color: VIOLET, strokeWidth: 2.5 },
        encoding: { y: { field: 'RatingMA', type: 'quantitative', scale: { zero: false, domain: [5.8, 7.6] }, axis: { orient: 'right', title: 'Weighted rating', titleColor: VIOLET, grid: false, format: '.1f' } } } },
    ],
    resolve: { scale: { y: 'independent' } },
  },
});

// Genre ranking: films as bars, share in the label and the weighted rating as a right-hand column.
place(P.overview, '309fcdd02a65b2e689e9', 1280, TOP, 608, BOTTOM - TOP);
toDeneb(P.overview, '309fcdd02a65b2e689e9', {
  title: 'Films per genre',
  subtitle: 'Films · share of selection · right: weighted rating (violet = above average)',
  alt: 'Number of films per genre with share of the selection and weighted rating',
  fields: [col('Genres', 'Genre', 'Genre'), mea('Movies', 'Films'), mea('Genre Share', 'Share'), mea('Weighted Rating', 'Rating'), mea('All Films Rating', 'AllRating')],
  spec: rankedBars({ cat: 'Genre', val: 'Films', color: ['#0E7490', CYAN],
    label: "format(datum.Films, ',') + '  ·  ' + format(datum.Share, '.0%')",
    right: { field: 'Rating', format: '.2f', color: { condition: { test: 'datum.Rating >= datum.AllRating', value: VIOLET }, value: '#6E6A99' } }, rightTitle: 'RATING',
    tooltip: [tip('Genre', 'Genre'), tip('Films', 'Films', ',.0f'), tip('Share', 'Share of selection', '.1%'), tip('Rating', 'Weighted rating', '.2f')] }),
});

// Rating distribution with share labels; 7+ highlighted.
place(P.overview, '79d44ff21c1bebf81c1d', 32, 748, 456, 300);
toDeneb(P.overview, '79d44ff21c1bebf81c1d', {
  title: 'Rating distribution',
  subtitle: 'Films with 10+ votes by average rating · bright = rated 7 or higher',
  alt: 'Distribution of films with at least ten votes across rating bands, with counts and shares',
  fields: [col('Movies', 'Rating Band', 'Band'), col('Movies', 'Rating Band Sort', 'Sort'), mea('Rated Movies', 'Films')],
  spec: {
    transform: [{ joinaggregate: [{ op: 'sum', field: 'Films', as: '_t' }, { op: 'max', field: 'Films', as: '_max' }] }, { calculate: 'datum.Films / datum._t', as: 'Share' }, { calculate: 'datum.Films / datum._max', as: '_p' },
      { calculate: "indexof(['7-8', '8+'], datum.Band) >= 0", as: 'Top' }],
    encoding: { x: { field: 'Band', type: 'ordinal', sort: { field: 'Sort' }, axis: { title: null, labelAngle: 0, grid: false, labelColor: TEXT, labelFontSize: 13 } },
      tooltip: [tip('Band', 'Rating band'), tip('Films', 'Films', ',.0f'), tip('Share', 'Share', '.1%')] },
    layer: [
      { mark: { type: 'bar', width: { band: 0.66 }, cornerRadiusEnd: 4 },
        encoding: { y: { field: '_p', type: 'quantitative', axis: null, scale: { domain: [0, 1.28] } },
          color: { condition: { test: 'datum.Top', value: grad('#6D28D9', VIOLET, false) }, value: grad('#2E2A5A', '#5B4F9E', false) } } },
      { mark: { type: 'text', baseline: 'bottom', dy: -16, fontSize: 13, fontWeight: 'bold' }, encoding: { y: { field: '_p', type: 'quantitative' }, text: { field: 'Films', format: ',.0f' } } },
      { mark: { type: 'text', baseline: 'bottom', dy: -3, fontSize: 11, color: MUTED }, encoding: { y: { field: '_p', type: 'quantitative' }, text: { field: 'Share', format: '.0%' } } },
    ],
  },
});

// Top languages as a lollipop with share.
place(P.overview, '2f415d1b6a6efa74fd15', 512, 748, 320, 300);
toDeneb(P.overview, '2f415d1b6a6efa74fd15', {
  title: 'Top 8 languages',
  subtitle: 'Films and share of the selection',
  alt: 'Top eight original languages by number of films, with share of the selection',
  fields: [col('Movies', 'Language', 'Language'), mea('Movies', 'Films'), mea('Language Share', 'Share')],
  spec: {
    transform: [{ joinaggregate: [{ op: 'max', field: 'Films', as: '_max' }] }, { calculate: 'datum.Films / datum._max', as: '_p' },
      { calculate: "format(datum.Films, ',') + ' · ' + format(datum.Share, '.0%')", as: '_lbl' }],
    encoding: { y: { field: 'Language', type: 'nominal', sort: { field: 'Films', order: 'descending' }, axis: { title: null, grid: false, labelColor: TEXT, labelFontSize: 13 } },
      x: { field: '_p', type: 'quantitative', axis: null, scale: { domain: [0, 1.55] } },
      tooltip: [tip('Language', 'Language'), tip('Films', 'Films', ',.0f'), tip('Share', 'Share', '.1%')] },
    layer: [
      { mark: { type: 'rule', color: CYAN, strokeWidth: 2, opacity: 0.6 }, encoding: { x: { datum: 0 }, x2: { field: '_p' } } },
      { mark: { type: 'circle', size: 110, color: CYAN, opacity: 1, stroke: CARD, strokeWidth: 2 } },
      { mark: { type: 'text', align: 'left', dx: 10, fontSize: 12 }, encoding: { text: { field: '_lbl' } } },
    ],
  },
});

// Revenue by decade (bars) and hit rate (line).
place(P.overview, '70aaf612fc56ecd2139b', 856, 748, 400, 300);
toDeneb(P.overview, '70aaf612fc56ecd2139b', {
  title: 'Revenue and hit rate by decade',
  subtitle: 'Bars: revenue · green line: share of films that made a profit',
  alt: 'Total revenue per decade as columns and the share of profitable films as a line',
  fields: [col('Movies', 'Decade', 'Decade'), col('Movies', 'Decade Sort', 'Sort'), mea('Total Revenue', 'Revenue'), mea('Hit Rate', 'HitRate'), mea('Movies with Financials', 'Fin')],
  spec: {
    transform: [decadeShort, { calculate: 'datum.Fin >= 30 ? datum.HitRate : null', as: 'Hit' }],
    encoding: { x: { field: 'D', type: 'ordinal', sort: { field: 'Sort' }, axis: { title: null, labelAngle: 0, grid: false, labelFontSize: 11 } },
      tooltip: [tip('Decade', 'Decade'), tip('Revenue', 'Revenue', '$,.0f'), tip('HitRate', 'Profitable films', '.0%'), tip('Fin', 'Films with financials', ',.0f')] },
    layer: [
      { mark: { type: 'bar', width: { band: 0.62 }, cornerRadiusEnd: 3, color: grad('#1D4ED8', BLUE, false) },
        encoding: { y: { field: 'Revenue', type: 'quantitative', axis: { title: null, labelExpr: moneyAxis, tickCount: 4 } } } },
      { layer: [
        { mark: { type: 'line', color: GREEN, strokeWidth: 2.5, interpolate: 'monotone' } },
        { mark: { type: 'circle', color: GREEN, size: 36, opacity: 1 } },
      ], encoding: { y: { field: 'Hit', type: 'quantitative', scale: { domain: [0, 1] }, axis: { orient: 'right', format: '.0%', grid: false, title: null, labelColor: GREEN, tickCount: 3 } } } },
    ],
    resolve: { scale: { y: 'independent' } },
  },
});

// =====================================================================================
// 3. Money and Success
// =====================================================================================
const SX = { type: 'quantitative', scale: { type: 'log', domain: [0.01, 1000] }, axis: { title: 'Budget (log)', values: [0.01, 0.1, 1, 10, 100, 1000], labelExpr: usdM } };
const SY = { type: 'quantitative', scale: { type: 'log', domain: [0.01, 5000] }, axis: { title: 'Revenue (log)', values: [0.01, 0.1, 1, 10, 100, 1000], labelExpr: usdM } };
place(P.money, 'ec2ffd84dfb3a2266f91', 32, TOP, 760, 400);
toDeneb(P.money, 'ec2ffd84dfb3a2266f91', {
  title: 'Budget vs revenue per film',
  subtitle: 'Log scales · above the dashed line a film earned back its budget · green = profitable, orange = loss · size = votes',
  alt: 'Scatter of budget against revenue per film on log scales, coloured by profit or loss, with a break-even line',
  fields: [col('Movies', 'Title and Year', 'Film'), mea('Budget (USD M)', 'Budget'), mea('Revenue (USD M)', 'Revenue'), mea('Total Votes', 'Votes')],
  spec: {
    layer: [
      { data: { values: [{ b: 0.01, r: 0.01 }, { b: 1000, r: 1000 }] }, mark: { type: 'line', strokeDash: [6, 4], color: MUTED, strokeWidth: 1.5, opacity: 0.8 },
        encoding: { x: Object.assign({}, SX, { field: 'b' }), y: Object.assign({}, SY, { field: 'r' }) } },
      { data: { values: [{ b: 0.01, r: 0.1 }, { b: 500, r: 5000 }] }, mark: { type: 'line', strokeDash: [2, 4], color: GREEN, strokeWidth: 1, opacity: 0.6 },
        encoding: { x: Object.assign({}, SX, { field: 'b' }), y: Object.assign({}, SY, { field: 'r' }) } },
      { data: { values: [{ b: 700, r: 480, t: 'break-even' }, { b: 330, r: 5000, t: '10x' }] }, mark: { type: 'text', align: 'right', fontSize: 11, color: MUTED, dx: -4 },
        encoding: { x: Object.assign({}, SX, { field: 'b' }), y: Object.assign({}, SY, { field: 'r' }), text: { field: 't' } } },
      { transform: [{ filter: 'datum.Budget > 0 && datum.Revenue > 0' }, { calculate: 'datum.Revenue / datum.Budget', as: 'Multiple' },
          { calculate: "datum.Multiple >= 1 ? 'Profitable' : 'Loss'", as: 'Result' }],
        mark: { type: 'circle', opacity: 0.5 },
        encoding: {
          x: Object.assign({}, SX, { field: 'Budget' }), y: Object.assign({}, SY, { field: 'Revenue' }),
          color: { field: 'Result', type: 'nominal', scale: { domain: ['Profitable', 'Loss'], range: [GREEN, ORANGE] }, legend: { orient: 'top-left', direction: 'vertical', fillColor: 'rgba(11,23,48,0.85)', padding: 6, offset: 14 } },
          size: { field: 'Votes', type: 'quantitative', scale: { type: 'sqrt', range: [6, 260] }, legend: null },
          tooltip: [tip('Film', 'Film'), tip('Budget', 'Budget ($M)', ',.1f'), tip('Revenue', 'Revenue ($M)', ',.1f'), tip('Multiple', 'Revenue / budget', '.1f'), tip('Votes', 'Votes', ',.0f')],
        } },
    ],
  },
});

place(P.money, '8665c6921e355658bfad', 32, 804, 368, 244);
toDeneb(P.money, '8665c6921e355658bfad', {
  title: 'Median ROI by budget tier',
  subtitle: 'Median film · label: ROI and hit rate',
  alt: 'Median ROI multiple per budget tier with the share of profitable films',
  fields: [col('Movies', 'Budget Tier', 'Tier'), col('Movies', 'Budget Tier Sort', 'Sort'), mea('Median ROI', 'ROI'), mea('Hit Rate', 'HitRate')],
  spec: {
    transform: [{ joinaggregate: [{ op: 'max', field: 'ROI', as: '_max' }] }, { calculate: 'max(datum.ROI, 0) / datum._max', as: '_p' },
      { calculate: "format(datum.ROI, '.1f') + 'x  ·  ' + format(datum.HitRate, '.0%') + ' hit'", as: '_lbl' }],
    encoding: { y: { field: 'Tier', type: 'nominal', sort: { field: 'Sort' }, axis: { title: null, grid: false, labelColor: TEXT, labelFontSize: 12 } },
      tooltip: [tip('Tier', 'Budget tier'), tip('ROI', 'Median ROI', '.2f'), tip('HitRate', 'Profitable films', '.0%')] },
    layer: [
      { mark: { type: 'bar', height: { band: 0.6 }, cornerRadiusEnd: 4, color: grad('#15803D', GREEN) }, encoding: { x: { field: '_p', type: 'quantitative', axis: null, scale: { domain: [0, 1.75] } } } },
      { mark: { type: 'text', align: 'left', dx: 6, fontSize: 12 }, encoding: { x: { field: '_p', type: 'quantitative' }, text: { field: '_lbl' } } },
    ],
  },
});

place(P.money, 'd8a7280d189dfc0994c2', 424, 804, 368, 244);
toDeneb(P.money, 'd8a7280d189dfc0994c2', {
  title: 'Rating by budget tier',
  subtitle: 'Weighted rating · dashed line: all films',
  alt: 'Weighted rating per budget tier compared with the all-films rating',
  fields: [col('Movies', 'Budget Tier', 'Tier'), col('Movies', 'Budget Tier Sort', 'Sort'), mea('Weighted Rating', 'Rating'), mea('All Films Rating', 'AllRating')],
  spec: {
    encoding: { y: { field: 'Tier', type: 'nominal', sort: { field: 'Sort' }, axis: { title: null, grid: false, labelColor: TEXT, labelFontSize: 12 } },
      tooltip: [tip('Tier', 'Budget tier'), tip('Rating', 'Weighted rating', '.2f'), tip('AllRating', 'All films', '.2f')] },
    layer: [
      { mark: { type: 'rule', strokeDash: [4, 3], color: MUTED, opacity: 0.7 }, encoding: { x: { field: 'AllRating', type: 'quantitative' } } },
      { mark: { type: 'rule', color: VIOLET, strokeWidth: 2, opacity: 0.55 }, encoding: { x: { field: 'AllRating', type: 'quantitative' }, x2: { field: 'Rating' } } },
      { mark: { type: 'circle', size: 150, color: VIOLET, opacity: 1, stroke: CARD, strokeWidth: 2 },
        encoding: { x: { field: 'Rating', type: 'quantitative', scale: { zero: false, padding: 30 }, axis: { title: null, format: '.1f', tickCount: 4 } } } },
      { mark: { type: 'text', align: 'left', dx: 12, fontSize: 12, fontWeight: 'bold' }, encoding: { x: { field: 'Rating', type: 'quantitative' }, text: { field: 'Rating', format: '.2f' } } },
    ],
  },
});

place(P.money, '0e59c7e6cbbbf519f4fd', 816, TOP, 440, BOTTOM - TOP);
toDeneb(P.money, '0e59c7e6cbbbf519f4fd', {
  title: 'Median ROI by genre',
  subtitle: 'Median film vs all genres (dashed) · excl. TV Movie',
  alt: 'Median ROI per genre shown as lollipops around the median of all films; green above, orange below',
  fields: [col('Genres', 'Genre', 'Genre'), mea('Median ROI', 'ROI'), mea('Median ROI All Genres', 'AllROI')],
  spec: {
    transform: [{ calculate: 'datum.ROI >= datum.AllROI', as: 'Above' }],
    encoding: { y: { field: 'Genre', type: 'nominal', sort: { field: 'ROI', order: 'descending' }, axis: { title: null, grid: false, labelColor: TEXT, labelFontSize: 13 } },
      tooltip: [tip('Genre', 'Genre'), tip('ROI', 'Median ROI', '.2f'), tip('AllROI', 'All genres', '.2f')] },
    layer: [
      { mark: { type: 'rule', strokeDash: [4, 3], color: MUTED, opacity: 0.35 }, encoding: { x: { field: 'AllROI', type: 'quantitative' } } },
      { mark: { type: 'rule', strokeWidth: 2.5 }, encoding: { x: { field: 'AllROI', type: 'quantitative' }, x2: { field: 'ROI' },
        color: { condition: { test: 'datum.Above', value: GREEN }, value: ORANGE } } },
      { mark: { type: 'circle', size: 130, opacity: 1, stroke: CARD, strokeWidth: 2 },
        encoding: { x: { field: 'ROI', type: 'quantitative', scale: { zero: true, padding: 24 }, axis: { title: null, labelExpr: "format(datum.value, '.1f') + 'x'", tickCount: 5 } },
          color: { condition: { test: 'datum.Above', value: GREEN }, value: ORANGE } } },
      { mark: { type: 'text', fontSize: 12, align: { expr: "datum.Above ? 'left' : 'right'" }, dx: { expr: 'datum.Above ? 11 : -11' } }, encoding: { x: { field: 'ROI', type: 'quantitative' }, text: { field: 'ROI', format: '.1f' } } },
    ],
  },
});

place(P.money, '20a9e784d02ea52143be', 1280, TOP, 608, BOTTOM - TOP);
toDeneb(P.money, '20a9e784d02ea52143be', {
  title: 'Top 10 ROI multiple (budget $1M+)',
  subtitle: 'Revenue divided by budget · label: budget → revenue',
  alt: 'Ten films with a budget of at least one million dollars and the highest revenue to budget multiple, ranked',
  fields: [col('Movies', 'Title and Year', 'Film'), mea('ROI', 'ROI'), mea('Budget (USD M)', 'Budget'), mea('Revenue (USD M)', 'Revenue')],
  spec: rankedBars({ cat: 'Film', val: 'ROI', color: ['#15803D', GREEN], rank: true, labelLimit: 320, room: 2.1,
    label: "format(datum.ROI, '.0f') + 'x   $' + format(datum.Budget, ',.1f') + 'M → $' + format(datum.Revenue, ',.0f') + 'M'",
    tooltip: [tip('Film', 'Film'), tip('ROI', 'ROI multiple', '.1f'), tip('Budget', 'Budget ($M)', ',.1f'), tip('Revenue', 'Revenue ($M)', ',.1f')] }),
});

// =====================================================================================
// 4. Genre and Country
// =====================================================================================
place(P.genre, '7523e42e8963901b9289', 32, TOP, 560, BOTTOM - TOP);
toDeneb(P.genre, '7523e42e8963901b9289', {
  title: 'Rating by genre vs all films',
  subtitle: 'Weighted rating minus all films · violet above, orange below',
  alt: 'Diverging bars of each genre weighted rating relative to the all-films rating',
  fields: [col('Genres', 'Genre', 'Genre'), mea('Weighted Rating', 'Rating'), mea('All Films Rating', 'AllRating'), mea('Movies', 'Films')],
  spec: {
    transform: [{ calculate: 'datum.Rating - datum.AllRating', as: 'Diff' }],
    encoding: { y: { field: 'Genre', type: 'nominal', sort: { field: 'Diff', order: 'descending' }, axis: { title: null, grid: false, labelColor: TEXT, labelFontSize: 13 } },
      tooltip: [tip('Genre', 'Genre'), tip('Rating', 'Weighted rating', '.2f'), tip('Diff', 'vs all films', '+.2f'), tip('Films', 'Films', ',.0f')] },
    layer: [
      { mark: { type: 'bar', height: { band: 0.62 }, cornerRadius: 3 },
        encoding: { x: { field: 'Diff', type: 'quantitative', scale: { domain: [-1, 0.8] }, axis: { title: null, format: '+.1f', tickCount: 5 } },
          color: { condition: { test: 'datum.Diff >= 0', value: grad('#6D28D9', VIOLET) }, value: grad(ORANGE, '#9A3412') } } },
      { mark: { type: 'rule', color: MUTED }, encoding: { x: { datum: 0 } } },
      { mark: { type: 'text', fontSize: 12, align: { expr: "datum.Diff >= 0 ? 'left' : 'right'" }, dx: { expr: 'datum.Diff >= 0 ? 6 : -6' } },
        encoding: { x: { field: 'Diff', type: 'quantitative' }, text: { field: 'Rating', format: '.2f' } } },
    ],
  },
});

const GX = { field: 'Films', type: 'quantitative', scale: { type: 'log', padding: 30 }, axis: { title: 'Films (log)', format: '~s', values: [500, 1000, 2000, 5000, 10000, 20000] } };
const GY = { field: 'Rating', type: 'quantitative', scale: { zero: false, padding: 30 }, axis: { title: 'Weighted rating', format: '.1f' } };
place(P.genre, '8c3c0e38474f2846aceb', 616, TOP, 640, BOTTOM - TOP);
toDeneb(P.genre, '8c3c0e38474f2846aceb', {
  title: 'Genre landscape: volume vs rating',
  subtitle: 'x: films (log) · y: weighted rating · bubble: avg revenue per film',
  alt: 'Bubble chart of genres by number of films and weighted rating, sized by average revenue per film, split into four quadrants',
  fields: [col('Genres', 'Genre', 'Genre'), mea('Movies', 'Films'), mea('Weighted Rating', 'Rating'), mea('Avg Revenue per Film', 'AvgRevenue'), mea('All Films Rating', 'AllRating')],
  spec: {
    transform: [{ joinaggregate: [{ op: 'median', field: 'Films', as: 'MedFilms' }] }],
    layer: [
      { mark: { type: 'rule', strokeDash: [4, 4], color: MUTED, opacity: 0.6 }, encoding: { x: { field: 'MedFilms', type: 'quantitative' } } },
      { mark: { type: 'rule', strokeDash: [4, 4], color: MUTED, opacity: 0.6 }, encoding: { y: { field: 'AllRating', type: 'quantitative' } } },
      { data: { values: [{ t: 'NICHE · RATED HIGH' }] }, mark: { type: 'text', align: 'left', baseline: 'top', x: 4, y: 2, fontSize: 10, color: DIM }, encoding: { text: { field: 't' } } },
      { data: { values: [{ t: 'BIG · RATED HIGH' }] }, mark: { type: 'text', align: 'right', baseline: 'top', x: { expr: 'width - 4' }, y: 2, fontSize: 10, color: DIM }, encoding: { text: { field: 't' } } },
      { data: { values: [{ t: 'NICHE · RATED LOW' }] }, mark: { type: 'text', align: 'left', baseline: 'bottom', x: 4, y: { expr: 'height - 2' }, fontSize: 10, color: DIM }, encoding: { text: { field: 't' } } },
      { data: { values: [{ t: 'BIG · RATED LOW' }] }, mark: { type: 'text', align: 'right', baseline: 'bottom', x: { expr: 'width - 4' }, y: { expr: 'height - 2' }, fontSize: 10, color: DIM }, encoding: { text: { field: 't' } } },
      { mark: { type: 'circle', opacity: 0.8, stroke: '#EAF2FF', strokeWidth: 0.6, strokeOpacity: 0.5 },
        encoding: { x: GX, y: GY,
          size: { field: 'AvgRevenue', type: 'quantitative', scale: { range: [40, 900] }, legend: null },
          color: { field: 'AvgRevenue', type: 'quantitative', scale: { range: ['#1E3A8A', BLUE, '#93C5FD'] }, legend: null },
          tooltip: [tip('Genre', 'Genre'), tip('Films', 'Films', ',.0f'), tip('Rating', 'Weighted rating', '.2f'), tip('AvgRevenue', 'Avg revenue per film', '$,.0f')],
        } },
      { mark: { type: 'text', fontSize: 10.5, color: TEXT, dy: -12 }, encoding: { x: GX, y: GY, text: { field: 'Genre' } } },
    ],
  },
});

place(P.genre, '7fe10017ea99b3e9c812', 1280, TOP, 608, 344);
toDeneb(P.genre, '7fe10017ea99b3e9c812', {
  title: 'Top 10 production countries',
  subtitle: 'Films · share of selection · right: weighted rating (violet = above average)',
  alt: 'Top ten primary production countries by number of films with share and weighted rating',
  fields: [col('Movies', 'Primary Country', 'Country'), mea('Movies', 'Films'), mea('Country Share', 'Share'), mea('Weighted Rating', 'Rating'), mea('All Films Rating', 'AllRating')],
  spec: rankedBars({ cat: 'Country', val: 'Films', color: ['#0E7490', CYAN],
    label: "format(datum.Films, ',') + '  ·  ' + format(datum.Share, '.0%')",
    right: { field: 'Rating', format: '.2f', color: { condition: { test: 'datum.Rating >= datum.AllRating', value: VIOLET }, value: '#6E6A99' } }, rightTitle: 'RATING',
    tooltip: [tip('Country', 'Country'), tip('Films', 'Films', ',.0f'), tip('Share', 'Share of selection', '.1%'), tip('Rating', 'Weighted rating', '.2f')] }),
});

place(P.genre, '05becfd185686aee6137', 1280, 748, 608, 300);
toDeneb(P.genre, '05becfd185686aee6137', {
  title: 'Rating and output by decade',
  subtitle: 'Violet: weighted rating (best decade marked) · columns: films released (right axis)',
  alt: 'Weighted rating per decade as a line with the best decade highlighted, and the number of films per decade as columns',
  fields: [col('Movies', 'Decade', 'Decade'), col('Movies', 'Decade Sort', 'Sort'), mea('Weighted Rating', 'Rating'), mea('Movies', 'Films')],
  spec: {
    transform: [decadeShort, { joinaggregate: [{ op: 'max', field: 'Rating', as: '_best' }] }, { calculate: 'datum.Rating == datum._best', as: 'Best' }],
    encoding: { x: { field: 'D', type: 'ordinal', sort: { field: 'Sort' }, axis: { title: null, labelAngle: 0, grid: false, labelFontSize: 11 } },
      tooltip: [tip('Decade', 'Decade'), tip('Rating', 'Weighted rating', '.2f'), tip('Films', 'Films', ',.0f')] },
    layer: [
      { mark: { type: 'bar', width: { band: 0.55 }, cornerRadiusEnd: 3, color: 'rgba(34,211,238,0.22)' },
        encoding: { y: { field: 'Films', type: 'quantitative', axis: { orient: 'right', grid: false, title: null, format: '~s', labelColor: CYAN, tickCount: 3 } } } },
      { layer: [
        { mark: { type: 'line', color: VIOLET, strokeWidth: 2.5, interpolate: 'monotone' } },
        { mark: { type: 'circle', opacity: 1, stroke: CARD, strokeWidth: 2 }, encoding: { size: { condition: { test: 'datum.Best', value: 220 }, value: 60 }, color: { condition: { test: 'datum.Best', value: TEAL }, value: VIOLET } } },
        { mark: { type: 'text', dy: -14, fontSize: 11 }, encoding: { text: { field: 'Rating', format: '.2f' }, color: { condition: { test: 'datum.Best', value: TEAL }, value: MUTED } } },
      ], encoding: { y: { field: 'Rating', type: 'quantitative', scale: { zero: false, padding: 20 }, axis: { title: null, format: '.1f', tickCount: 4 } } } },
    ],
    resolve: { scale: { y: 'independent' } },
  },
});

// =====================================================================================
// 5. Title Explorer
// =====================================================================================
place(P.titles, 'd7c28c852d776000e3f8', 32, TOP, 760, 360);
toDeneb(P.titles, 'd7c28c852d776000e3f8', {
  title: 'Top 10 genres by revenue',
  subtitle: 'Total revenue · label: average revenue per film (a film can have several genres)',
  alt: 'Ten genres with the highest total revenue with average revenue per film',
  dropFilters: true,
  fields: [col('Genres', 'Genre', 'Genre'), mea('Total Revenue', 'Revenue'), mea('Avg Revenue per Film', 'PerFilm'), mea('Movies', 'Films')],
  spec: rankedBars({ cat: 'Genre', val: 'Revenue', color: ['#1D4ED8', BLUE], top: 10,
    label: `(${moneyText('Revenue')}) + '  ·  ' + (${moneyText('PerFilm')}) + ' per film'`,
    tooltip: [tip('Genre', 'Genre'), tip('Revenue', 'Total revenue', '$,.0f'), tip('PerFilm', 'Avg revenue per film', '$,.0f'), tip('Films', 'Films', ',.0f')] }),
});

place(P.titles, '7e1898081b563dbd2ceb', 816, TOP, 1072, 360);
toDeneb(P.titles, '7e1898081b563dbd2ceb', {
  title: 'Votes vs rating (1,000 most-voted films)',
  subtitle: 'x: votes (log) · y: weighted rating · dashed: log trend · labelled: most voted and best rated',
  alt: 'Scatter of the thousand most-voted films by votes and weighted rating with a trend line and labels for standout titles',
  fields: [col('Movies', 'Title and Year', 'Film'), mea('Total Votes', 'Votes'), mea('Weighted Rating', 'Rating')],
  spec: {
    transform: [{ filter: 'datum.Votes > 0' },
      { window: [{ op: 'row_number', as: 'rv' }], sort: [{ field: 'Votes', order: 'descending' }] },
      { window: [{ op: 'row_number', as: 'rr' }], sort: [{ field: 'Rating', order: 'descending' }] }],
    encoding: {
      x: { field: 'Votes', type: 'quantitative', scale: { type: 'log', nice: false, padding: 12 }, axis: { title: 'Votes (log)', format: '~s', values: [1000, 2000, 5000, 10000, 15000] } },
      y: { field: 'Rating', type: 'quantitative', scale: { zero: false }, axis: { title: 'Weighted rating', format: '.1f', tickCount: 5 } },
    },
    layer: [
      { mark: { type: 'circle', size: 42, opacity: 0.7 },
        encoding: { color: { field: 'Rating', type: 'quantitative', scale: { range: ['#3B2F7A', VIOLET, '#E9D5FF'] }, legend: null },
          tooltip: [tip('Film', 'Film'), tip('Votes', 'Votes', ',.0f'), tip('Rating', 'Weighted rating', '.2f')] } },
      { transform: [{ regression: 'Rating', on: 'Votes', method: 'log' }], mark: { type: 'line', strokeDash: [6, 4], color: MUTED, strokeWidth: 1.5 } },
      { transform: [{ filter: 'datum.rv <= 3 || datum.rr <= 2' }], mark: { type: 'circle', size: 70, color: TEAL, opacity: 1 } },
      { transform: [{ filter: 'datum.rv <= 3 || datum.rr <= 2' }], mark: { type: 'text', align: 'right', dx: -9, fontSize: 11, color: TEXT, limit: 220, dy: { expr: 'datum.rv == 1 ? 14 : datum.rv == 2 ? -10 : datum.rv == 3 ? 2 : datum.rr == 1 ? -8 : 8' } }, encoding: { text: { field: 'Film' } } },
    ],
  },
});

{ // table sits lower to make room
  const id = 'b58e9ea427ff7e86ef93';
  place(P.titles, id, 32, 764, 1856, 284);
}

// =====================================================================================
// 6. Register Deneb as an AppSource visual
// =====================================================================================
{
  const f = path.join(DEF, 'report.json');
  const r = JSON.parse(fs.readFileSync(f, 'utf8'));
  r.publicCustomVisuals = Array.from(new Set([...(r.publicCustomVisuals || []), DENEB]));
  fs.writeFileSync(f, JSON.stringify(r, null, 2));
}
console.log('report upgraded');
