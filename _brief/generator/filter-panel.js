// Hidden filter panel for every page of Movie Analysis With AI (2026-09-29).
// Header: active-filter chips (HTML Content, measure "Filter Summary HTML") + "Filters" button.
// Panel: a hidden visual group with background, title, close button, the page's slicers and "Clear all filters".
// Two bookmarks per page (show / hide) toggle only the panel group and leave data and page untouched.
//   node filter-panel.js            (idempotent: re-running rewrites the same objects)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEF = 'X:/AI Dashboard V2/Movie Analysis With AI.Report/definition';
const SCHEMA_VISUAL = 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.9.0/schema.json';
const SCHEMA_BOOKMARK = 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/bookmark/2.1.0/schema.json';
const SCHEMA_BOOKMARKS = 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/bookmarksMetadata/1.0.0/schema.json';
const HTML = 'htmlContent443BE3AD55E043BF878BED274D3A6855';

const CYAN = '#22D3EE', TEXT = '#EAF2FF', MUTED = '#9DB4D8', PANEL = '#0B1730', FIELD = '#10203F', BORDER = '#1F4A80';

// ---------- helpers ----------
const lit = v => ({ expr: { Literal: { Value: v } } });
const S = s => lit("'" + String(s).replace(/'/g, "''") + "'");
const B = b => lit(b ? 'true' : 'false');
const D = n => lit(n + 'D');
const L = n => lit(n + 'L');
const C = hex => ({ solid: { color: S(hex) } });
const id = (page, key) => crypto.createHash('sha1').update(page + '|' + key).digest('hex').slice(0, 20);
const vdir = (page, vid) => path.join(DEF, 'pages', page, 'visuals', vid);
const load = (page, vid) => JSON.parse(fs.readFileSync(path.join(vdir(page, vid), 'visual.json'), 'utf8'));
function save(page, vid, v) {
  fs.mkdirSync(vdir(page, vid), { recursive: true });
  fs.writeFileSync(path.join(vdir(page, vid), 'visual.json'), JSON.stringify(v, null, 2));
}
const noChrome = () => ({
  title: [{ properties: { show: B(false) } }], background: [{ properties: { show: B(false) } }],
  border: [{ properties: { show: B(false) } }], dropShadow: [{ properties: { show: B(false) } }],
  visualHeader: [{ properties: { show: B(false) } }],
  padding: [{ properties: { top: D(0), bottom: D(0), left: D(0), right: D(0) } }],
});
// actionButton formatting needs a static entry plus an id-selector entry per state
const states = (props, hover) => [{ properties: props }, { properties: props, selector: { id: 'default' } }, ...(hover ? [{ properties: Object.assign({}, props, hover), selector: { id: 'hover' } }] : [])];

function button(page, vid, pos, { label, link, fontSize = 14, bold = true, outline = true, altText }) {
  const v = {
    $schema: SCHEMA_VISUAL, name: vid, position: pos,
    visual: {
      visualType: 'actionButton',
      objects: {
        icon: states({ show: B(false) }),
        text: states({ show: B(true), text: S(label), fontColor: C(TEXT), fontSize: D(fontSize), bold: B(bold), fontFamily: S('Segoe UI'), horizontalAlignment: S('center'), verticalAlignment: S('middle') }),
        fill: states({ show: B(true), fillColor: C(outline ? PANEL : FIELD), transparency: D(0) }, { fillColor: C('#133058') }),
        outline: states({ show: B(outline), lineColor: C(CYAN), transparency: D(outline ? 20 : 100), weight: D(1.5) }, { transparency: D(0) }),
        shape: [{ properties: { tileShape: S('rectangleRoundedByPixel'), roundEdge: L(10) } }],
        glow: states({ show: B(outline), color: C(CYAN), transparency: D(75), shadowBlur: D(10) }),
      },
      visualContainerObjects: Object.assign(noChrome(), {
        visualLink: [{ properties: Object.assign({ show: B(true), type: S(link.type) }, link.bookmark ? { bookmark: S(link.bookmark) } : {}, { tooltip: S(link.tooltip) }) }],
        general: [{ properties: { altText: S(altText) } }],
      }),
      drillFilterOtherVisuals: true,
    },
    howCreated: 'InsertVisualButton',
  };
  save(page, vid, v);
}

// ---------- pages ----------
const PAGES = [
  { page: 'a1d8add3de18ace488d7', name: 'Overview', text: ['bcbf922d125ff3074dd4', 'db1cf0d931307242a1f6'],
    slicers: ['24208dce6df5fab359e0', 'ba1a8c6e90a71ae6958f', 'f59136b5e43ccd6ebdb6'] },
  { page: 'c288367fb6b6659150fc', name: 'Money and Success', text: ['39b7158e6736ff337ad8', '5a6190d12ef66ed7a6b6'],
    slicers: ['1b09dd86c2ec982a1c9b', 'd3471a76331965e09e50', '95c138741a18ce6782dc', '6f22d8c87fe9af3ba7cf'] },
  { page: '4215b814ac44384df309', name: 'Genre and Country', text: ['5c54e9db9b26810e6c01', '5d6c93bd8f5f568a26c1'],
    slicers: ['c03761d4fc23558083ad', '9ed57e0a5ea883ae6760'] },
  { page: '36d04fef1908cd91b0ac', name: 'Title Explorer', text: ['e314e5b08cf0dd32e9c2', '47dddc36e77efa27cf57'],
    slicers: ['3219cf191b09602d4813', 'd94eb0fb242fd309c732', 'add1cdbe1b5233210186'] },
];

const PX = 1464, PW = 424, PY = 112, SL_H = 76, SL_GAP = 12, Z = 50000;
const bookmarks = [];
// children of a visual group are positioned relative to the group

for (const P of PAGES) {
  const { page } = P;
  const gid = id(page, 'filterPanel');
  const showBm = 'Bookmark' + id(page, 'showFilters');
  const hideBm = 'Bookmark' + id(page, 'hideFilters');

  // 1. title block stays left of the header controls
  for (const t of P.text) { const v = load(page, t); v.position.width = Math.min(v.position.width, 1060); save(page, t, v); }

  // 2. header: active filter chips + Filters button
  save(page, id(page, 'filterSummary'), {
    $schema: SCHEMA_VISUAL, name: id(page, 'filterSummary'),
    position: { x: 1000, y: 34, z: 9000, width: 704, height: 44, tabOrder: 9000 },
    visual: {
      visualType: HTML,
      query: { queryState: { content: { projections: [{ field: { Measure: { Expression: { SourceRef: { Entity: '_Measures' } }, Property: 'Filter Summary HTML' } }, queryRef: '_Measures.Filter Summary HTML', nativeQueryRef: 'Filter Summary HTML' }] } } },
      visualContainerObjects: Object.assign(noChrome(), { general: [{ properties: { altText: S('Active filters and number of films shown') } }] }),
      drillFilterOtherVisuals: true,
    },
  });
  button(page, id(page, 'filterButton'), { x: 1728, y: 32, z: 9100, width: 160, height: 48, tabOrder: 9100 },
    { label: '☰   FILTERS', link: { type: 'Bookmark', bookmark: showBm, tooltip: 'Open the filter panel' }, altText: 'Open the filter panel' });

  // 3. panel group (hidden by default)
  const n = P.slicers.length;
  const slTop = PY + 72;
  const clearY = slTop + n * (SL_H + SL_GAP) + 8;
  const PH = clearY + 48 + 20 - PY;
  save(page, gid, {
    $schema: SCHEMA_VISUAL, name: gid,
    position: { x: PX, y: PY, z: Z, width: PW, height: PH, tabOrder: Z },
    visualGroup: { displayName: 'Filter panel', groupMode: 'ScaleMode', objects: { background: [{ properties: { show: B(false) } }] } },
    isHidden: true,
  });
  const child = (key, pos, extra) => Object.assign({ $schema: SCHEMA_VISUAL, name: id(page, key), position: pos, parentGroupName: gid }, extra);

  // background card
  save(page, id(page, 'panelBg'), child('panelBg', { x: 0, y: 0, z: Z + 1, width: PW, height: PH, tabOrder: Z + 1 }, {
    visual: {
      visualType: 'shape',
      objects: {
        shape: [{ properties: { tileShape: S('rectangleRoundedByPixel'), roundEdge: L(14) }, selector: { id: 'default' } }],
        fill: [{ properties: { show: B(true), fillColor: C(PANEL), transparency: D(0) }, selector: { id: 'default' } }],
        outline: [{ properties: { show: B(true), lineColor: C(CYAN), transparency: D(35), weight: D(1.5) }, selector: { id: 'default' } }],
        glow: [{ properties: { show: B(true), color: C(CYAN), transparency: D(70), shadowBlur: D(22) } }],
      },
      visualContainerObjects: Object.assign(noChrome(), { general: [{ properties: { altText: S('Filter panel background') } }] }),
    },
  }));
  // title
  save(page, id(page, 'panelTitle'), child('panelTitle', { x: 24, y: 22, z: Z + 2, width: 260, height: 32, tabOrder: Z + 2 }, {
    visual: {
      visualType: 'textbox',
      objects: { general: [{ properties: { paragraphs: [{ textRuns: [
        { value: 'FILTERS', textStyle: { fontFamily: 'Bahnschrift SemiBold', fontSize: '20px', color: TEXT } },
        { value: '   ' + P.name.toUpperCase(), textStyle: { fontFamily: 'Consolas', fontSize: '12px', color: CYAN } },
      ], horizontalTextAlignment: 'left' }] } }] },
      visualContainerObjects: noChrome(),
    },
  }));
  // close
  button(page, id(page, 'panelClose'), { x: PW - 60, y: 16, z: Z + 3, width: 40, height: 40, tabOrder: Z + 3 },
    { label: '✕', fontSize: 16, outline: false, link: { type: 'Bookmark', bookmark: hideBm, tooltip: 'Close the filter panel' }, altText: 'Close the filter panel' });
  fs.readdirSync(path.join(DEF, 'pages', page, 'visuals')); // ensure dir exists
  const closeV = load(page, id(page, 'panelClose')); closeV.parentGroupName = gid; save(page, id(page, 'panelClose'), closeV);

  // slicers: moved into the panel, flat (no tile chrome of their own)
  P.slicers.forEach((sid, i) => {
    const v = load(page, sid);
    v.position = Object.assign(v.position, { x: 24, y: slTop - PY + i * (SL_H + SL_GAP), z: Z + 10 + i, width: PW - 48, height: SL_H, tabOrder: Z + 10 + i });
    v.parentGroupName = gid;
    const vco = v.visual.visualContainerObjects || (v.visual.visualContainerObjects = {});
    vco.background = [{ properties: { show: B(false) } }];
    vco.border = [{ properties: { show: B(false) } }];
    vco.dropShadow = [{ properties: { show: B(false) } }];
    vco.padding = [{ properties: { top: D(4), bottom: D(4), left: D(0), right: D(0) } }];
    save(page, sid, v);
  });

  // clear all
  button(page, id(page, 'panelClear'), { x: 24, y: clearY - PY, z: Z + 30, width: PW - 48, height: 44, tabOrder: Z + 30 },
    { label: 'CLEAR ALL FILTERS', fontSize: 13, link: { type: 'ClearAllSlicers', tooltip: 'Reset every slicer on this page' }, altText: 'Clear all filters on this page' });
  const clearV = load(page, id(page, 'panelClear')); clearV.parentGroupName = gid; save(page, id(page, 'panelClear'), clearV);

  // 4. bookmarks: only the panel group's visibility, no data, no page change
  for (const [bm, hidden, label] of [[showBm, false, 'Show filters'], [hideBm, true, 'Hide filters']]) {
    bookmarks.push(bm);
    fs.mkdirSync(path.join(DEF, 'bookmarks'), { recursive: true });
    fs.writeFileSync(path.join(DEF, 'bookmarks', bm + '.bookmark.json'), JSON.stringify({
      $schema: SCHEMA_BOOKMARK,
      displayName: `${P.name} · ${label}`,
      name: bm,
      options: { targetVisualNames: [gid], applyOnlyToTargetVisuals: true, suppressData: true, suppressActiveSection: true },
      explorationState: {
        version: '1.3',
        activeSection: page,
        sections: { [page]: { visualContainers: {}, visualContainerGroups: { [gid]: { isHidden: hidden } } } },
      },
    }, null, 2));
  }
}

fs.writeFileSync(path.join(DEF, 'bookmarks', 'bookmarks.json'), JSON.stringify({
  $schema: SCHEMA_BOOKMARKS,
  items: [{ name: 'BookmarkGroup' + crypto.createHash('sha1').update('filterPanels').digest('hex').slice(0, 20), displayName: 'Filter panel', children: bookmarks }],
}, null, 2));
console.log('filter panel written for', PAGES.length, 'pages;', bookmarks.length, 'bookmarks');
