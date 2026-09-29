// Clean KPI cards + new analytic measures for Movie Analysis With AI.
// Writes the measures into _Measures.tmdl (upsert by name) and emits a JSON payload
// that tom-upsert.ps1 can push into a running Power BI Desktop model.
//   node kpi-measures.js [out.json]
const fs = require('fs');
const crypto = require('crypto');

const TMDL = 'X:/AI Dashboard V2/Movie Analysis With AI.SemanticModel/definition/tables/_Measures.tmdl';
const OUT = process.argv[2];

// ---------- palette (Neon HUD) ----------
const ACC = {
  cyan: ['#22D3EE', '34,211,238'], violet: ['#A78BFA', '167,139,250'], blue: ['#3B82F6', '59,130,246'],
  sky: ['#60A5FA', '96,165,250'], teal: ['#2DD4BF', '45,212,191'], green: ['#4ADE80', '74,222,128'],
};
const GOOD = '#34D399', BAD = '#FB923C';

// ---------- DAX text helpers (all FORMAT calls pin en-US so HTML stays valid on any locale) ----------
const q = s => '"' + s.replace(/"/g, '""') + '"';
const num = e => `FORMAT(${e}, "#,##0", "en-US")`;
const dec = (e, p = '0.0') => `FORMAT(${e}, "${p}", "en-US")`;
const pct = (e, p = '0%') => `FORMAT(${e}, "${p}", "en-US")`;
const money = e => `VAR __m = COALESCE(${e}, 0) RETURN IF(__m >= 1000000000, "$" & FORMAT(__m / 1000000000, "#,##0.0", "en-US") & "bn", IF(__m >= 1000000, "$" & FORMAT(__m / 1000000, "#,##0.0", "en-US") & "M", "$" & FORMAT(__m / 1000, "#,##0", "en-US") & "K"))`;
const esc = e => `SUBSTITUTE(SUBSTITUTE(${e}, "&", "&amp;"), "<", "&lt;")`;
const signed = (e, p = '0.00') => `IF(${e} >= 0, "+", "") & FORMAT(${e}, "${p}", "en-US")`;

// ---------- clean KPI card ----------
// Text-first: label, value, one highlighted insight sentence, two quiet supporting facts.
// c: { name, desc, color, label, pre (extra VARs), value, valueSize, hi (DAX text), hiColor (DAX text), text (DAX text), facts: [[label, DAX text]] }
function card(c) {
  const [acc, rgb] = ACC[c.color];
  const fact = ([k], i) => `"<span style='white-space:nowrap'><span style='color:#7F97BD'>${k}</span> <span style='color:#EAF2FF;font-weight:600'>" & __f${i} & "</span></span>"`;
  const expr = `${c.pre || ''}
			VAR __value = ${c.value}
			VAR __hi = ${c.hi}
			VAR __hicol = ${c.hiColor || q(acc)}
			VAR __text = ${c.text}
			${c.facts.map(([, v], i) => `VAR __f${i} = ${v}`).join('\n\t\t\t')}
			RETURN
			"<div style='box-sizing:border-box;height:100vh;width:100%;padding:26px 18px 16px 26px;border-radius:12px;background:linear-gradient(150deg,rgba(${rgb},.13) 0%,rgba(11,23,48,0) 55%);font-family:Segoe UI,sans-serif;position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-start'>" &
			"<div style='position:absolute;left:0;top:18%;height:64%;width:4px;border-radius:0 4px 4px 0;background:${acc};box-shadow:0 0 12px ${acc}'></div>" &
			"<div style='font-size:12px;letter-spacing:2px;color:#9DB4D8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>${c.label}</div>" &
			"<div style='margin-top:4px;font-size:${c.valueSize || 48}px;line-height:1.08;font-weight:700;color:#EAF2FF;font-family:Bahnschrift,Segoe UI,sans-serif;text-shadow:0 0 16px rgba(${rgb},.45);white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>" & __value & "</div>" &
			"<div style='margin-top:8px;font-size:15px;line-height:1.35;color:#C9D7EE;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden'><span style='color:" & __hicol & ";font-weight:700'>" & __hi & "</span> " & __text & "</div>" &
			"<div style='margin-top:12px;padding-top:10px;border-top:1px solid rgba(157,180,216,.16);display:flex;flex-wrap:wrap;column-gap:18px;row-gap:2px;font-size:13px'>" &
				${c.facts.map(fact).join(' &\n\t\t\t\t')} &
			"</div>" &
			"</div>"`;
  return { name: c.name, description: c.desc, displayFolder: 'KPI HTML', expression: expr };
}

// ---------- new analytic measures ----------
const HASFIN = 'Movies[Has Financials] = "Yes"';
const base = [
  ['Median Budget', 'MEDIAN(Movies[Budget])', '$#,0', 'Financials', 'Median budget of films with a known budget; not skewed by blockbusters like the average.'],
  ['Median Revenue', 'MEDIAN(Movies[Revenue])', '$#,0', 'Financials', 'Median worldwide revenue of films with a known revenue.'],
  ['Avg Budget per Film', 'AVERAGE(Movies[Budget])', '$#,0', 'Financials', 'Average budget of films with a known budget.'],
  ['Profit Margin', `DIVIDE([Total Profit], CALCULATE(SUM(Movies[Revenue]), ${HASFIN}))`, '0%', 'Financials', 'Total profit as a share of revenue, for films with both budget and revenue known.'],
  ['Blockbusters', 'CALCULATE(COUNTROWS(Movies), Movies[Revenue] >= 100000000)', '#,0', 'Financials', 'Number of films that grossed $100M or more.'],
  ['Blockbuster Rate', 'DIVIDE([Blockbusters], CALCULATE(COUNTROWS(Movies), NOT ISBLANK(Movies[Revenue])))', '0.0%', 'Financials', 'Share of films with a known revenue that grossed $100M or more.'],
  ['Big Budget Films', 'CALCULATE(COUNTROWS(Movies), Movies[Budget] >= 100000000)', '#,0', 'Financials', 'Number of films with a budget of $100M or more.'],
  ['Franchise Revenue Share', 'DIVIDE(CALCULATE([Total Revenue], Movies[Collection Name] <> ""), [Total Revenue])', '0%', 'Financials', 'Share of revenue earned by films that belong to a collection (franchise).'],
  ['Franchise Film Share', 'DIVIDE(CALCULATE([Movies], Movies[Collection Name] <> ""), [Movies])', '0%', 'Counts', 'Share of films that belong to a collection (franchise).'],
  ['Top 10 Revenue Share', 'DIVIDE(SUMX(TOPN(10, VALUES(Movies[Movie ID]), CALCULATE(SUM(Movies[Revenue]))), CALCULATE(SUM(Movies[Revenue]))), [Total Revenue])', '0.0%', 'Financials', 'Share of revenue earned by the ten highest-grossing films of the selection (concentration).'],
  ['Films per Year', 'DIVIDE([Movies], DISTINCTCOUNT(Movies[Release Year]))', '#,0', 'Counts', 'Average number of films per release year in the selection.'],
  ['Peak Year', 'MAXX(TOPN(1, VALUES(Movies[Release Year]), [Movies], DESC, Movies[Release Year], DESC), Movies[Release Year])', '0', 'Counts', 'Release year with the most films in the selection.'],
  ['Peak Year Films', 'VAR _y = [Peak Year] RETURN CALCULATE([Movies], Movies[Release Year] = _y)', '#,0', 'Counts', 'Films released in the peak year.'],
  ['Output Growth vs 1980s', 'DIVIDE(CALCULATE([Movies], REMOVEFILTERS(Movies[Decade]), Movies[Release Year] >= 2010, Movies[Release Year] <= 2016) / 7, CALCULATE([Movies], REMOVEFILTERS(Movies[Decade]), Movies[Decade] = "1980s") / 10)', '0.0"x"', 'Counts', 'Films per year in 2010-2016 divided by films per year in the 1980s (2017 is partial and left out).'],
  ['Rating Change vs 1980s', 'CALCULATE([Weighted Rating], REMOVEFILTERS(Movies[Decade]), Movies[Decade] = "2010s") - CALCULATE([Weighted Rating], REMOVEFILTERS(Movies[Decade]), Movies[Decade] = "1980s")', '+0.00;-0.00;0.00', 'Ratings', 'Weighted rating of the 2010s minus the 1980s; negative means ratings slipped.'],
  ['Median Runtime', 'MEDIAN(Movies[Runtime])', '0', 'Runtime', 'Median runtime in minutes.'],
  ['% Over 2 Hours', 'DIVIDE(CALCULATE(COUNTROWS(Movies), Movies[Runtime] > 120), CALCULATE(COUNTROWS(Movies), NOT ISBLANK(Movies[Runtime])))', '0%', 'Runtime', 'Share of films with a known runtime longer than 120 minutes.'],
  ['Avg Votes per Film', 'DIVIDE([Total Votes], [Movies])', '#,0', 'Ratings', 'Average number of TMDB votes per film.'],
  ['Genre Share', 'DIVIDE([Movies], CALCULATE([Movies], REMOVEFILTERS(Genres), REMOVEFILTERS(MovieGenres)))', '0.0%', 'Counts', 'Films of the genre as a share of all films in the selection (a film can have several genres).'],
  ['Films 5y Avg', 'VAR _y = MAX(Movies[Release Year]) RETURN IF(ISINSCOPE(Movies[Release Year]), DIVIDE(CALCULATE([Movies], REMOVEFILTERS(Movies[Release Year]), Movies[Release Year] > _y - 5, Movies[Release Year] <= _y), 5))', '#,0', 'Counts', 'Five-year trailing average of films released per year (use with Release Year on the axis).'],
  ['Language Share', 'DIVIDE([Movies], CALCULATE([Movies], REMOVEFILTERS(Movies[Language])))', '0.0%', 'Counts', 'Films in the language as a share of all films in the selection.'],
  ['Country Share', 'DIVIDE([Movies], CALCULATE([Movies], REMOVEFILTERS(Movies[Primary Country])))', '0.0%', 'Counts', 'Films from the primary production country as a share of all films in the selection.'],
  ['Median ROI All Genres', 'CALCULATE([Median ROI], REMOVEFILTERS(Genres), REMOVEFILTERS(MovieGenres))', '0.0"x"', 'Reference', 'Median ROI of the selection ignoring the genre on the axis; the reference line for genre ROI charts.'],
  ['Profit (USD M)','DIVIDE([Total Profit], 1000000)', '$#,0.#"M"', 'Financials', 'Total profit in millions of USD, for axes.'],
].map(([name, expression, formatString, displayFolder, description]) => ({ name, expression, formatString, displayFolder, description }));

// ---------- cards ----------
const minFin = 'COALESCE([Movies with Financials], 0) >= 30';
const genreTop = (by) => `
			VAR _t = TOPN(1, FILTER(VALUES(Genres[Genre]), [Movies] >= 30), ${by}, DESC)
			VAR _g = MAXX(_t, Genres[Genre])`;
const inGenre = e => `CALCULATE(${e}, KEEPFILTERS(Genres[Genre] = _g))`;
const topTitle = by => `
			VAR _t = TOPN(1, VALUES(Movies[Title and Year]), ${by}, DESC)
			VAR _f = MAXX(_t, Movies[Title and Year])`;
const ofTitle = e => `CALCULATE(${e}, Movies[Title and Year] = _f)`;

const up = e => `IF(${e} >= 0, "&#9650; ", "&#9660; ")`;
const upColor = e => `IF(${e} >= 0, "${GOOD}", "${BAD}")`;
const cards = [
  // ----- Overview -----
  card({ name: 'KPI Films HTML', color: 'cyan', label: 'FILMS IN SELECTION',
    desc: 'KPI card: film count, output growth vs the 1980s, peak year and share of the catalogue.',
    pre: '\n\t\t\tVAR _g = COALESCE([Output Growth vs 1980s], 0)',
    value: num('COALESCE([Movies], 0)'),
    hi: `${up('_g - 1')} & ${dec('_g')} & "x"`, hiColor: upColor('_g - 1'), text: '"films per year vs 1980s"',
    facts: [['Peak year', `COALESCE(FORMAT([Peak Year], "0", "en-US"), "-") & " (" & ${num('COALESCE([Peak Year Films], 0)')} & ")"`],
            ['Catalogue', pct('COALESCE([Share of All Films], 0)')]] }),
  card({ name: 'KPI Rating HTML', color: 'violet', label: 'WEIGHTED RATING',
    desc: 'KPI card: weighted rating, change from the 1980s to the 2010s, share rated 7+ and difference vs all films.',
    pre: '\n\t\t\tVAR _c = COALESCE([Rating Change vs 1980s], 0)',
    value: dec('COALESCE([Weighted Rating], 0)', '0.00') + ' & "<span style=\'font-size:22px;color:#9DB4D8\'> / 10</span>"',
    hi: `${up('_c')} & ${dec('ABS(_c)', '0.00')}`, hiColor: upColor('_c'), text: '"in the 2010s vs the 1980s"',
    facts: [['Rated 7+', pct('COALESCE([% Rated 7+], 0)')], ['vs all films', signed('COALESCE([Rating vs All Films], 0)')]] }),
  card({ name: 'KPI Revenue HTML', color: 'blue', label: 'TOTAL REVENUE',
    desc: 'KPI card: total revenue, share earned by franchise films, profit margin and top-10 concentration.',
    value: `(${money('[Total Revenue]')})`,
    hi: pct('COALESCE([Franchise Revenue Share], 0)'), text: '"earned by franchise films"',
    facts: [['Margin', pct('COALESCE([Profit Margin], 0)')], ['Top 10 films', pct('COALESCE([Top 10 Revenue Share], 0)', '0.0%')]] }),
  card({ name: 'KPI Budget HTML', color: 'sky', label: 'TOTAL BUDGET',
    desc: 'KPI card: total budget, budget as a share of revenue, median budget and number of $100M+ productions.',
    pre: `\n\t\t\tVAR _ratio = COALESCE(DIVIDE(CALCULATE(SUM(Movies[Budget]), ${HASFIN}), CALCULATE(SUM(Movies[Revenue]), ${HASFIN})), 0)`,
    value: `(${money('[Total Budget]')})`,
    hi: pct('_ratio'), text: '"of revenue went into budgets"',
    facts: [['Median', `(${money('[Median Budget]')})`], ['$100M+ budgets', num('COALESCE([Big Budget Films], 0)')]] }),
  card({ name: 'KPI Runtime HTML', color: 'teal', label: 'AVERAGE RUNTIME',
    desc: 'KPI card: average runtime, share of films over two hours, median runtime and difference vs all films.',
    value: dec('COALESCE([Avg Runtime], 0)', '0') + ' & "<span style=\'font-size:22px;color:#9DB4D8\'> min</span>"',
    hi: pct('COALESCE([% Over 2 Hours], 0)'), text: '"of films run over 2 hours"',
    facts: [['Median', `${dec('COALESCE([Median Runtime], 0)', '0')} & " min"`], ['vs all films', `${signed('COALESCE([Runtime vs All Films], 0)', '0')} & " min"`]] }),
  card({ name: 'KPI Hit Rate HTML', color: 'green', label: 'PROFITABLE FILMS',
    desc: 'KPI card: share of films with known financials that made a profit, median ROI and $100M+ grossers.',
    value: pct('COALESCE([Hit Rate], 0)'),
    hi: num('COALESCE([Movies with Financials], 0)'), text: '"films with known financials"',
    hiColor: '"#EAF2FF"',
    facts: [['Median ROI', `${dec('COALESCE([Median ROI], 0)')} & "x"`], ['$100M+ grossers', num('COALESCE([Blockbusters], 0)')]] }),

  // ----- Money and Success -----
  card({ name: 'KPI Median ROI HTML', color: 'green', label: 'MEDIAN ROI',
    desc: 'KPI card: median ROI multiple as profit per dollar, hit rate and total profit.',
    value: `${dec('COALESCE([Median ROI], 0)')} & "x"`,
    hi: `"$" & ${dec('COALESCE([Median ROI], 0)', '0.00')}`, text: '"profit per $1 of budget for the median film"',
    facts: [['Hit rate', pct('COALESCE([Hit Rate], 0)')], ['Total profit', `(${money('[Total Profit]')})`]] }),
  card({ name: 'KPI Avg Budget HTML', color: 'sky', label: 'AVERAGE BUDGET PER FILM',
    desc: 'KPI card: average budget, how far blockbusters pull it above the median, and $100M+ budgets.',
    pre: '\n\t\t\tVAR _skew = DIVIDE([Avg Budget per Film], [Median Budget], 0)',
    value: `(${money('[Avg Budget per Film]')})`,
    hi: `${dec('_skew')} & "x"`, text: '"the median, pulled up by big productions"',
    facts: [['Median', `(${money('[Median Budget]')})`], ['$100M+ budgets', num('COALESCE([Big Budget Films], 0)')]] }),
  card({ name: 'KPI Avg Revenue HTML', color: 'blue', label: 'AVERAGE REVENUE PER FILM',
    desc: 'KPI card: average revenue, revenue as a multiple of the average budget, median revenue and blockbuster rate.',
    value: `(${money('[Avg Revenue per Film]')})`,
    hi: `${dec('COALESCE(DIVIDE([Avg Revenue per Film], [Avg Budget per Film]), 0)')} & "x"`, text: '"the average budget"',
    facts: [['Median', `(${money('[Median Revenue]')})`], ['Grossed $100M+', pct('COALESCE([Blockbuster Rate], 0)', '0.0%')]] }),
  card({ name: 'KPI Profit Rate HTML', color: 'teal', label: 'PROFIT MARGIN',
    desc: 'KPI card: profit margin, total profit, franchise revenue share and top-10 concentration.',
    value: pct('COALESCE([Profit Margin], 0)'),
    hi: `(${money('[Total Profit]')})`, text: '"total profit on known budgets"',
    facts: [['Franchise revenue', pct('COALESCE([Franchise Revenue Share], 0)')], ['Top 10 films', pct('COALESCE([Top 10 Revenue Share], 0)', '0.0%')]] }),

  // ----- Genre and Country -----
  card({ name: 'KPI Most Films Genre HTML', color: 'cyan', label: 'GENRE WITH MOST FILMS',
    desc: 'KPI card: largest genre (30+ films), its share of films, film count and rating vs all films.',
    pre: genreTop('[Movies]'), value: `COALESCE(_g, "-")`,
    hi: pct(`COALESCE(${inGenre('[Genre Share]')}, 0)`), text: '"of all films carry this genre"',
    facts: [['Films', num(`COALESCE(${inGenre('[Movies]')}, 0)`)], ['Rating vs all', signed(`COALESCE(${inGenre('[Rating vs All Films]')}, 0)`)]] }),
  card({ name: 'KPI Best Genre HTML', color: 'violet', label: 'BEST RATED GENRE',
    desc: 'KPI card: best rated genre (30+ films), its lead over all films, score and share rated 7+.',
    pre: genreTop('[Weighted Rating]') + `\n\t\t\tVAR _d = COALESCE(${inGenre('[Rating vs All Films]')}, 0)`,
    value: `COALESCE(_g, "-")`,
    hi: `${up('_d')} & ${signed('_d')}`, hiColor: upColor('_d'), text: '"rating points above all films"',
    facts: [['Score', dec(`COALESCE(${inGenre('[Weighted Rating]')}, 0)`, '0.00')], ['Rated 7+', pct(`COALESCE(${inGenre('[% Rated 7+]')}, 0)`)]] }),
  card({ name: 'KPI Top Earner Genre HTML', color: 'blue', label: 'TOP EARNING GENRE',
    desc: 'KPI card: genre with the highest revenue per film (30+ films), multiple of the average, revenue per film and median ROI.',
    pre: genreTop('[Avg Revenue per Film]') + `
			VAR _mult = DIVIDE(${inGenre('[Avg Revenue per Film]')}, CALCULATE([Avg Revenue per Film], REMOVEFILTERS(Genres), REMOVEFILTERS(MovieGenres)), 0)`,
    value: `COALESCE(_g, "-")`,
    hi: `${dec('_mult')} & "x"`, text: '"the average revenue per film"',
    facts: [['Per film', `(${money(inGenre('[Avg Revenue per Film]'))})`], ['Median ROI', `${dec(`COALESCE(${inGenre('[Median ROI]')}, 0)`)} & "x"`]] }),
  card({ name: 'KPI Best Decade HTML', color: 'teal', label: 'BEST RATED DECADE',
    desc: 'KPI card: best rated decade (100+ films), its lead over all films, score and film count.',
    pre: `
			VAR _t = TOPN(1, FILTER(VALUES(Movies[Decade]), [Movies] >= 100), [Weighted Rating], DESC)
			VAR _dname = MAXX(_t, Movies[Decade])
			VAR _r = MAXX(_t, [Weighted Rating])
			VAR _d = COALESCE(_r - [All Films Rating], 0)`,
    value: `COALESCE(_dname, "-")`,
    hi: `${up('_d')} & ${signed('_d')}`, hiColor: upColor('_d'), text: '"rating points above all films"',
    facts: [['Score', dec('COALESCE(_r, 0)', '0.00')], ['Films', num(`COALESCE(CALCULATE([Movies], Movies[Decade] = _dname), 0)`)]] }),

  // ----- Title Explorer -----
  card({ name: 'KPI Top Grossing HTML', color: 'blue', label: 'HIGHEST GROSSING FILM', valueSize: 30,
    desc: 'KPI card: highest-grossing film, its revenue and ROI, and its share of the selection revenue.',
    pre: topTitle('[Total Revenue]'), value: esc('COALESCE(_f, "-")'),
    hi: `(${money(ofTitle('[Total Revenue]'))})`, text: '"worldwide revenue"',
    facts: [['ROI', `${dec(`COALESCE(${ofTitle('[ROI]')}, 0)`)} & "x budget"`], ['Share', pct(`COALESCE(DIVIDE(${ofTitle('[Total Revenue]')}, [Total Revenue]), 0)`, '0.0%')]] }),
  card({ name: 'KPI Top Rated HTML', color: 'violet', label: 'HIGHEST RATED FILM', valueSize: 30,
    desc: 'KPI card: highest weighted-rating film, its score, votes and lead over all films.',
    pre: topTitle('[Weighted Rating]'), value: esc('COALESCE(_f, "-")'),
    hi: dec(`COALESCE(${ofTitle('[Weighted Rating]')}, 0)`, '0.00'), text: '"vote-weighted score out of 10"',
    facts: [['Votes', num(`COALESCE(${ofTitle('[Total Votes]')}, 0)`)], ['vs all films', signed(`COALESCE(${ofTitle('[Rating vs All Films]')}, 0)`)]] }),
  card({ name: 'KPI Most Voted HTML', color: 'cyan', label: 'MOST VOTED FILM', valueSize: 30,
    desc: 'KPI card: most-voted film, its votes, rating and share of all votes.',
    pre: topTitle('[Total Votes]'), value: esc('COALESCE(_f, "-")'),
    hi: num(`COALESCE(${ofTitle('[Total Votes]')}, 0)`), text: '"votes on TMDB"',
    facts: [['Rating', dec(`COALESCE(${ofTitle('[Weighted Rating]')}, 0)`, '0.00')], ['Share of votes', pct(`COALESCE(DIVIDE(${ofTitle('[Total Votes]')}, [Total Votes]), 0)`, '0.0%')]] }),
  card({ name: 'KPI Films Shown HTML', color: 'green', label: 'FILMS IN SELECTION',
    desc: 'KPI card: film count, share with a reliable rating (10+ votes), average votes and franchise share.',
    value: num('COALESCE([Movies], 0)'),
    hi: pct('COALESCE(DIVIDE([Rated Movies], [Movies]), 0)'), text: '"have 10+ votes and a reliable rating"',
    facts: [['Avg votes', num('COALESCE([Avg Votes per Film], 0)')], ['Franchise films', pct('COALESCE([Franchise Film Share], 0)', '0.0%')]] }),
];

// ---------- active filter summary (header of every page) ----------
// One chip per directly filtered field; long selections collapse to "first, second +n".
const chip = (label, col, sortExpr) => `
			VAR _n${label} = COUNTROWS(VALUES(${col}))
			VAR _v${label} = IF(ISFILTERED(${col}),
				"<span style='display:inline-block;margin-left:8px;padding:5px 12px;border-radius:14px;background:rgba(34,211,238,.10);border:1px solid rgba(34,211,238,.4);white-space:nowrap'><span style='color:#7DE3F4'>${label}</span> " &
				${esc(`IF(_n${label} <= 2, CONCATENATEX(VALUES(${col}), ${col}, ", ", ${sortExpr}, ASC), CONCATENATEX(TOPN(2, VALUES(${col}), ${sortExpr}, ASC), ${col}, ", ", ${sortExpr}, ASC) & " +" & (_n${label} - 2))`)} & "</span>")`;
const summary = {
  name: 'Filter Summary HTML', displayFolder: 'KPI HTML',
  description: 'Header chips listing the fields filtered by slicers (Decade, Genre, Language, Budget tier) and the number of films shown.',
  expression: `${chip('Decade', 'Movies[Decade]', 'CALCULATE(MIN(Movies[Decade Sort]))')}${chip('Genre', 'Genres[Genre]', 'Genres[Genre]')}${chip('Language', 'Movies[Language]', 'Movies[Language]')}${chip('Tier', 'Movies[Budget Tier]', 'CALCULATE(MIN(Movies[Budget Tier Sort]))')}
			VAR _chips = _vDecade & _vGenre & _vLanguage & _vTier
			VAR _films = ${num('COALESCE([Movies], 0)')}
			RETURN
			"<div style='box-sizing:border-box;height:100vh;width:100%;display:flex;align-items:center;justify-content:flex-end;font-family:Segoe UI,sans-serif;font-size:13px;color:#EAF2FF;overflow:hidden'>" &
			IF(_chips = "", "<span style='color:#7F97BD'>No filters applied</span>", "<span style='color:#7F97BD'>Filtered by</span>" & _chips) &
			"<span style='margin-left:14px;color:#7F97BD;white-space:nowrap'><span style='color:#EAF2FF;font-weight:600'>" & _films & "</span> films</span>" &
			"</div>"`,
};

const all = [...base, ...cards, summary];
if (OUT) fs.writeFileSync(OUT, JSON.stringify(all, null, 1));

// ---------- TMDL upsert ----------
let tm = fs.readFileSync(TMDL, 'utf8').replace(/\r\n/g, '\n');
const lines = tm.split('\n');
function findBlock(name) {
  const re = new RegExp(`^\\tmeasure (${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|'${name.replace(/'/g, "''").replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}') =`);
  const i = lines.findIndex(l => re.test(l));
  if (i < 0) return null;
  let s = i; while (s > 0 && lines[s - 1].startsWith('\t///')) s--;
  let e = i + 1; while (e < lines.length && !/^\t(\/\/\/|measure |column |partition |annotation |hierarchy )/.test(lines[e])) e++;
  while (e > i + 1 && lines[e - 1].trim() === '') e--;
  return { s, e };
}
function tmdlBlock(m, lineageTag) {
  const quoted = /^[A-Za-z_][A-Za-z0-9_]*$/.test(m.name) ? m.name : `'${m.name.replace(/'/g, "''")}'`;
  const exprLines = m.expression.replace(/^\n+/, '').split('\n').map(l => l.replace(/^\t*/, '')).filter(l => l.trim() !== '');
  const out = [];
  if (m.description) out.push(`\t/// ${m.description}`);
  if (exprLines.length === 1) out.push(`\tmeasure ${quoted} = ${exprLines[0]}`);
  else { out.push(`\tmeasure ${quoted} =`); exprLines.forEach(l => out.push(`\t\t\t${l}`)); }
  if (m.formatString) out.push(`\t\tformatString: ${m.formatString}`);
  out.push(`\t\tdisplayFolder: ${m.displayFolder}`);
  out.push(`\t\tlineageTag: ${lineageTag}`);
  return out;
}
let added = 0, updated = 0;
for (const m of all) {
  const b = findBlock(m.name);
  if (b) {
    const old = lines.slice(b.s, b.e).join('\n');
    const tag = (old.match(/lineageTag: (\S+)/) || [])[1] || crypto.randomUUID();
    lines.splice(b.s, b.e - b.s, ...tmdlBlock(m, tag)); updated++;
  } else {
    const at = lines.findIndex(l => /^\tcolumn Placeholder/.test(l));
    lines.splice(at, 0, ...tmdlBlock(m, crypto.randomUUID()), ''); added++;
  }
}
fs.writeFileSync(TMDL, lines.join('\r\n'));
console.log(`measures: ${all.length} (added ${added}, updated ${updated})`);
