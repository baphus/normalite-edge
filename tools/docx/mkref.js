// Build a professionally styled pandoc reference.docx.
// Usage: node mkref.js <extractedRefDir> <outDocx> "<headerLeftText>"
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const [, , SRC, OUT, HEADER_TEXT, PROFILE = 'business'] = process.argv;

// 'legal' renders a formal instrument: serif throughout, black text, justified
// body, no running header. 'business' is the report styling.
const LEGAL = PROFILE === 'legal';

// ── Design tokens ───────────────────────────────────────
const NAVY = LEGAL ? '000000' : '1F3864';   // headings, rules
const BLUE = LEGAL ? '000000' : '2F5496';   // subheadings, links
const SLATE = LEGAL ? '3A3A3A' : '44546A';  // secondary text
const INK = LEGAL ? '000000' : '1A1A1A';    // body
const BORDER = 'C7CDD6';    // table outer
const BORDER_IN = 'DCE0E6'; // table inner
const HEAD_FILL = 'EAEEF3'; // table header row
const CODE_FILL = 'F4F6F8';
const SERIF = 'Cambria';
const SANS = 'Calibri';
const MONO = 'Consolas';

// A4 portrait, 2 cm margins
const PG = '<w:pgSz w:w="11906" w:h="16838" />' +
  '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" ' +
  'w:header="624" w:footer="624" w:gutter="0" />';
const RIGHT_TAB = 9638; // usable width = 11906 - 2*1134

const st = (attrs, body) => `<w:style ${attrs}>${body}</w:style>`;
const rFonts = (f) => `<w:rFonts w:ascii="${f}" w:hAnsi="${f}" w:eastAsia="${f}" w:cs="${f}" />`;

function heading(id, name, outline, font, size, color, before, after, extra = '') {
  return st(`w:type="paragraph" w:styleId="${id}"`,
    `<w:name w:val="${name}" /><w:basedOn w:val="Normal" /><w:next w:val="BodyText" />` +
    `<w:link w:val="${id}Char" /><w:qFormat />` +
    `<w:pPr><w:keepNext /><w:keepLines />` +
    `<w:spacing w:before="${before}" w:after="${after}" w:line="240" w:lineRule="auto" />` +
    `${extra}<w:outlineLvl w:val="${outline}" /></w:pPr>` +
    `<w:rPr>${rFonts(font)}<w:b /><w:color w:val="${color}" />` +
    `<w:sz w:val="${size}" /><w:szCs w:val="${size}" /></w:rPr>`);
}

// H1 gets a hairline rule beneath it.
const H1_BDR = `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="4" w:color="${NAVY}" /></w:pBdr>`;

const OVERRIDES = {
  Normal: st('w:type="paragraph" w:default="1" w:styleId="Normal"',
    '<w:name w:val="Normal" /><w:qFormat />' +
    `<w:rPr><w:color w:val="${INK}" /></w:rPr>`),

  BodyText: st('w:type="paragraph" w:styleId="BodyText"',
    '<w:name w:val="Body Text" /><w:basedOn w:val="Normal" />' +
    '<w:link w:val="BodyTextChar" /><w:qFormat />' +
    `<w:pPr><w:spacing w:before="0" w:after="${LEGAL ? 160 : 140}" ` +
    'w:line="276" w:lineRule="auto" />' +
    (LEGAL ? '<w:jc w:val="both" />' : '') + '</w:pPr>'),

  FirstParagraph: st('w:type="paragraph" w:customStyle="1" w:styleId="FirstParagraph"',
    '<w:name w:val="First Paragraph" /><w:basedOn w:val="BodyText" />' +
    '<w:next w:val="BodyText" /><w:qFormat />'),

  // Table cells + tight list items.
  Compact: st('w:type="paragraph" w:customStyle="1" w:styleId="Compact"',
    '<w:name w:val="Compact" /><w:basedOn w:val="BodyText" /><w:qFormat />' +
    '<w:pPr><w:spacing w:before="30" w:after="30" w:line="252" w:lineRule="auto" /></w:pPr>' +
    '<w:rPr><w:sz w:val="19" /><w:szCs w:val="19" /></w:rPr>'),

  Title: st('w:type="paragraph" w:styleId="Title"',
    '<w:name w:val="Title" /><w:basedOn w:val="Normal" /><w:next w:val="BodyText" />' +
    '<w:link w:val="TitleChar" /><w:qFormat />' +
    '<w:pPr><w:spacing w:before="0" w:after="60" w:line="240" w:lineRule="auto" />' +
    '<w:contextualSpacing /><w:jc w:val="left" /></w:pPr>' +
    `<w:rPr>${rFonts(SERIF)}<w:b /><w:color w:val="${NAVY}" />` +
    '<w:sz w:val="40" /><w:szCs w:val="40" /></w:rPr>'),

  Subtitle: st('w:type="paragraph" w:styleId="Subtitle"',
    '<w:name w:val="Subtitle" /><w:basedOn w:val="Normal" /><w:next w:val="BodyText" />' +
    '<w:link w:val="SubtitleChar" /><w:qFormat />' +
    '<w:pPr><w:spacing w:before="0" w:after="200" /><w:jc w:val="left" />' +
    `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="8" w:color="${BORDER}" /></w:pBdr></w:pPr>` +
    `<w:rPr>${rFonts(SERIF)}<w:color w:val="${SLATE}" />` +
    '<w:sz w:val="24" /><w:szCs w:val="24" /></w:rPr>'),

  // Document-control lines under the title.
  Author: st('w:type="paragraph" w:styleId="Author"',
    '<w:name w:val="Author" /><w:basedOn w:val="Normal" /><w:next w:val="BodyText" />' +
    '<w:qFormat /><w:pPr><w:spacing w:before="0" w:after="20" />' +
    '<w:contextualSpacing /><w:jc w:val="left" /></w:pPr>' +
    `<w:rPr><w:color w:val="${SLATE}" /><w:sz w:val="20" /><w:szCs w:val="20" /></w:rPr>`),

  Date: st('w:type="paragraph" w:styleId="Date"',
    '<w:name w:val="Date" /><w:basedOn w:val="Normal" /><w:next w:val="BodyText" />' +
    '<w:qFormat /><w:pPr><w:spacing w:before="0" w:after="320" /><w:jc w:val="left" />' +
    `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="10" w:color="${BORDER}" /></w:pBdr></w:pPr>` +
    `<w:rPr><w:color w:val="${SLATE}" /><w:sz w:val="20" /><w:szCs w:val="20" /></w:rPr>`),

  // In legal mode headings are not shifted, so clauses arrive as Heading2 —
  // both levels are sized to read as clause headings.
  Heading1: LEGAL
    ? heading('Heading1', 'heading 1', 0, SERIF, 26, NAVY, 360, 140)
    : heading('Heading1', 'heading 1', 0, SERIF, 30, NAVY, 400, 160, H1_BDR),
  Heading2: LEGAL
    ? heading('Heading2', 'heading 2', 1, SERIF, 24, NAVY, 320, 140)
    : heading('Heading2', 'heading 2', 1, SERIF, 25, BLUE, 300, 120),
  Heading3: heading('Heading3', 'heading 3', 2, LEGAL ? SERIF : SANS, 22, NAVY, 240, 100),
  Heading4: heading('Heading4', 'heading 4', 3, LEGAL ? SERIF : SANS, 21, SLATE, 200, 80),

  // Blockquotes — used for the callout notes.
  BlockText: st('w:type="paragraph" w:styleId="BlockText"',
    '<w:name w:val="Block Text" /><w:basedOn w:val="Normal" /><w:qFormat />' +
    '<w:pPr><w:spacing w:before="160" w:after="160" w:line="276" w:lineRule="auto" />' +
    '<w:ind w:left="284" w:right="142" />' +
    `<w:pBdr><w:left w:val="single" w:sz="18" w:space="10" w:color="${BLUE}" /></w:pBdr>` +
    `<w:shd w:val="clear" w:color="auto" w:fill="F7F9FC" /></w:pPr>` +
    `<w:rPr><w:color w:val="2B3A4A" /></w:rPr>`),

  VerbatimChar: st('w:type="character" w:customStyle="1" w:styleId="VerbatimChar"',
    '<w:name w:val="Verbatim Char" /><w:basedOn w:val="DefaultParagraphFont" />' +
    `<w:rPr>${rFonts(MONO)}<w:shd w:val="clear" w:color="auto" w:fill="${CODE_FILL}" />` +
    '<w:sz w:val="19" /><w:szCs w:val="19" /></w:rPr>'),

  Hyperlink: st('w:type="character" w:styleId="Hyperlink"',
    '<w:name w:val="Hyperlink" /><w:basedOn w:val="DefaultParagraphFont" />' +
    `<w:rPr><w:color w:val="${BLUE}" /><w:u w:val="single" /></w:rPr>`),

  TOCHeading: st('w:type="paragraph" w:styleId="TOCHeading"',
    '<w:name w:val="TOC Heading" /><w:basedOn w:val="Normal" /><w:next w:val="BodyText" />' +
    '<w:qFormat /><w:pPr><w:keepNext /><w:spacing w:before="0" w:after="200" />' +
    `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="4" w:color="${NAVY}" /></w:pBdr></w:pPr>` +
    `<w:rPr>${rFonts(SERIF)}<w:b /><w:color w:val="${NAVY}" />` +
    '<w:sz w:val="28" /><w:szCs w:val="28" /></w:rPr>'),

  Table: st('w:type="table" w:styleId="Table"',
    '<w:name w:val="Table" /><w:uiPriority w:val="59" /><w:qFormat />' +
    '<w:pPr><w:spacing w:before="30" w:after="30" w:line="252" w:lineRule="auto" /></w:pPr>' +
    '<w:rPr><w:sz w:val="19" /><w:szCs w:val="19" /></w:rPr>' +
    '<w:tblPr>' +
    '<w:tblBorders>' +
    `<w:top w:val="single" w:sz="4" w:space="0" w:color="${BORDER}" />` +
    `<w:left w:val="single" w:sz="4" w:space="0" w:color="${BORDER}" />` +
    `<w:bottom w:val="single" w:sz="4" w:space="0" w:color="${BORDER}" />` +
    `<w:right w:val="single" w:sz="4" w:space="0" w:color="${BORDER}" />` +
    `<w:insideH w:val="single" w:sz="4" w:space="0" w:color="${BORDER_IN}" />` +
    `<w:insideV w:val="single" w:sz="4" w:space="0" w:color="${BORDER_IN}" />` +
    '</w:tblBorders>' +
    '<w:tblCellMar><w:top w:w="72" w:type="dxa" /><w:left w:w="115" w:type="dxa" />' +
    '<w:bottom w:w="72" w:type="dxa" /><w:right w:w="115" w:type="dxa" /></w:tblCellMar>' +
    '</w:tblPr>' +
    '<w:tblStylePr w:type="firstRow">' +
    `<w:rPr><w:b /><w:color w:val="${NAVY}" /></w:rPr>` +
    `<w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="${HEAD_FILL}" />` +
    `<w:tcBorders><w:bottom w:val="single" w:sz="12" w:space="0" w:color="${NAVY}" /></w:tcBorders>` +
    '</w:tcPr></w:tblStylePr>'),
};

// Named styles addressed from markdown via `::: {custom-style="..."}`.
// Pandoc matches on w:name, not on w:styleId.
const centred = (id, name, font, size, bold, before, after, extra = '') =>
  st(`w:type="paragraph" w:customStyle="1" w:styleId="${id}"`,
    `<w:name w:val="${name}" /><w:basedOn w:val="Normal" /><w:qFormat />` +
    `<w:pPr><w:keepNext /><w:spacing w:before="${before}" w:after="${after}" ` +
    `w:line="240" w:lineRule="auto" /><w:jc w:val="center" />${extra}</w:pPr>` +
    `<w:rPr>${rFonts(font)}${bold ? '<w:b />' : ''}` +
    `<w:color w:val="${INK}" /><w:sz w:val="${size}" /><w:szCs w:val="${size}" /></w:rPr>`);

const ADDITIONS = [
  centred('Masthead', 'Masthead', SERIF, 24, true, 0, 20),
  centred('MastheadSub', 'MastheadSub', SERIF, 20, false, 0, 200),
  centred('ContractTitle', 'ContractTitle', SERIF, 32, true, 200, 320,
    `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="8" w:color="${INK}" /></w:pBdr>`),
  centred('Centered', 'Centered', SERIF, 22, false, 200, 200),

  st('w:type="paragraph" w:customStyle="1" w:styleId="SourceCode"',
    '<w:name w:val="Source Code" /><w:basedOn w:val="Normal" /><w:qFormat />' +
    '<w:pPr><w:spacing w:before="120" w:after="120" w:line="240" w:lineRule="auto" />' +
    `<w:shd w:val="clear" w:color="auto" w:fill="${CODE_FILL}" />` +
    `<w:pBdr><w:left w:val="single" w:sz="12" w:space="8" w:color="${BORDER}" /></w:pBdr>` +
    '<w:ind w:left="142" /></w:pPr>' +
    `<w:rPr>${rFonts(MONO)}<w:sz w:val="17" /><w:szCs w:val="17" /></w:rPr>`),

  st('w:type="paragraph" w:styleId="Header"',
    '<w:name w:val="header" /><w:basedOn w:val="Normal" />' +
    `<w:pPr><w:tabs><w:tab w:val="right" w:pos="${RIGHT_TAB}" /></w:tabs>` +
    '<w:spacing w:before="0" w:after="0" />' +
    `<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="4" w:color="${BORDER}" /></w:pBdr></w:pPr>` +
    `<w:rPr><w:color w:val="${SLATE}" /><w:sz w:val="16" /><w:szCs w:val="16" /></w:rPr>`),

  st('w:type="paragraph" w:styleId="Footer"',
    '<w:name w:val="footer" /><w:basedOn w:val="Normal" />' +
    `<w:pPr><w:tabs><w:tab w:val="right" w:pos="${RIGHT_TAB}" /></w:tabs>` +
    '<w:spacing w:before="0" w:after="0" />' +
    `<w:pBdr><w:top w:val="single" w:sz="4" w:space="6" w:color="${BORDER}" /></w:pBdr></w:pPr>` +
    `<w:rPr><w:color w:val="${SLATE}" /><w:sz w:val="16" /><w:szCs w:val="16" /></w:rPr>`),

  ...[1, 2, 3].map((n) => st(`w:type="paragraph" w:styleId="TOC${n}"`,
    `<w:name w:val="toc ${n}" /><w:basedOn w:val="Normal" /><w:next w:val="Normal" />` +
    '<w:uiPriority w:val="39" />' +
    `<w:pPr><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="${RIGHT_TAB}" /></w:tabs>` +
    `<w:spacing w:before="${n === 1 ? 100 : 20}" w:after="20" />` +
    `<w:ind w:left="${(n - 1) * 240}" w:right="0" /></w:pPr>` +
    `<w:rPr><w:sz w:val="20" /><w:szCs w:val="20" />${n === 1 ? '<w:b />' : ''}</w:rPr>`)),
];

// ── Patch styles.xml ────────────────────────────────────
const stylesPath = path.join(SRC, 'word/styles.xml');
let styles = fs.readFileSync(stylesPath, 'utf8');

styles = styles.replace(/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/,
  '<w:docDefaults><w:rPrDefault><w:rPr>' +
  rFonts(LEGAL ? SERIF : SANS) +
  `<w:color w:val="${INK}" /><w:sz w:val="${LEGAL ? 22 : 21}" />` +
  `<w:szCs w:val="${LEGAL ? 22 : 21}" />` +
  '<w:lang w:val="en-PH" w:eastAsia="en-US" w:bidi="ar-SA" />' +
  '</w:rPr></w:rPrDefault><w:pPrDefault><w:pPr>' +
  '<w:spacing w:before="0" w:after="140" w:line="276" w:lineRule="auto" />' +
  '<w:widowControl /></w:pPr></w:pPrDefault></w:docDefaults>');

// The lookahead matters: without it, `<w:style` also matches the `<w:styles`
// root element and the replacement eats the opening tag.
let replaced = 0;
styles = styles.replace(/<w:style(?=[\s>])[\s\S]*?<\/w:style>/g, (block) => {
  const id = (block.match(/w:styleId="([^"]+)"/) || [])[1];
  if (id && OVERRIDES[id]) { replaced++; return OVERRIDES[id]; }
  return block;
});
styles = styles.replace('</w:styles>', ADDITIONS.join('') + '</w:styles>');

// Guard against the class of breakage above: the root must survive, and every
// style element must be balanced.
const opens = (styles.match(/<w:style(?=[\s>])/g) || []).length;
const closes = (styles.match(/<\/w:style>/g) || []).length;
if (!/^<\?xml[^>]*\?>\s*<w:styles[\s>]/.test(styles)) {
  throw new Error('styles.xml root element damaged');
}
if (opens !== closes) {
  throw new Error(`styles.xml unbalanced: ${opens} <w:style> vs ${closes} </w:style>`);
}
if ((styles.match(/<\/w:styles>/g) || []).length !== 1) {
  throw new Error('styles.xml must have exactly one closing root tag');
}
fs.writeFileSync(stylesPath, styles);

// ── Header & footer parts ───────────────────────────────
const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fld = (instr) => `<w:fldSimple w:instr=" ${instr} " w:dirty="true">` +
  '<w:r><w:t>1</w:t></w:r></w:fldSimple>';

fs.writeFileSync(path.join(SRC, 'word/header1.xml'),
  `<?xml version="1.0" encoding="UTF-8"?><w:hdr ${NS}><w:p>` +
  '<w:pPr><w:pStyle w:val="Header" /></w:pPr>' +
  `<w:r><w:t xml:space="preserve">${esc(HEADER_TEXT)}</w:t></w:r>` +
  '<w:r><w:tab /><w:t xml:space="preserve">Normalite EDGE · Cebu Normal University</w:t></w:r>' +
  '</w:p></w:hdr>');

fs.writeFileSync(path.join(SRC, 'word/footer1.xml'),
  `<?xml version="1.0" encoding="UTF-8"?><w:ftr ${NS}><w:p>` +
  '<w:pPr><w:pStyle w:val="Footer" /></w:pPr>' +
  `<w:r><w:t xml:space="preserve">${esc(LEGAL ? HEADER_TEXT
    : 'Josephus Kim L. Sarsonas · Independent Software Developer')}</w:t></w:r>` +
  '<w:r><w:tab /><w:t xml:space="preserve">Page </w:t></w:r>' + fld('PAGE') +
  '<w:r><w:t xml:space="preserve"> of </w:t></w:r>' + fld('NUMPAGES') +
  '</w:p></w:ftr>');

// ── Wire them up ────────────────────────────────────────
const ctPath = path.join(SRC, '[Content_Types].xml');
let ct = fs.readFileSync(ctPath, 'utf8');
const wml = 'application/vnd.openxmlformats-officedocument.wordprocessingml';
for (const [part, type] of [['header1', 'header'], ['footer1', 'footer']]) {
  if (!ct.includes(`/word/${part}.xml`)) {
    ct = ct.replace('</Types>',
      `<Override PartName="/word/${part}.xml" ContentType="${wml}.${type}+xml" /></Types>`);
  }
}
fs.writeFileSync(ctPath, ct);

const relsPath = path.join(SRC, 'word/_rels/document.xml.rels');
let rels = fs.readFileSync(relsPath, 'utf8');
const used = [...rels.matchAll(/Id="rId(\d+)"/g)].map((m) => +m[1]);
let next = (used.length ? Math.max(...used) : 0) + 1;
const HDR_ID = `rId${next++}`, FTR_ID = `rId${next++}`;
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
rels = rels.replace('</Relationships>',
  `<Relationship Id="${HDR_ID}" Type="${REL_NS}/header" Target="header1.xml" />` +
  `<Relationship Id="${FTR_ID}" Type="${REL_NS}/footer" Target="footer1.xml" />` +
  '</Relationships>');
fs.writeFileSync(relsPath, rels);

// sectPr: page geometry + header/footer references
const docPath = path.join(SRC, 'word/document.xml');
let doc = fs.readFileSync(docPath, 'utf8');
// A formal instrument carries no running header — page numbers only.
doc = doc.replace(/<w:sectPr>[\s\S]*?<\/w:sectPr>/,
  '<w:sectPr>' +
  (LEGAL ? '' : `<w:headerReference w:type="default" r:id="${HDR_ID}" />`) +
  `<w:footerReference w:type="default" r:id="${FTR_ID}" />` +
  '<w:footnotePr><w:numRestart w:val="eachSect" /></w:footnotePr>' +
  PG + '<w:cols w:space="708" /><w:docGrid w:linePitch="360" />' +
  '</w:sectPr>');
fs.writeFileSync(docPath, doc);

// ── Repackage ───────────────────────────────────────────
if (fs.existsSync(OUT)) fs.unlinkSync(OUT);
execFileSync('7z', ['a', '-tzip', '-mx=5', '-bso0', '-bsp0', path.resolve(OUT), '.'],
  { cwd: SRC });

console.log(`reference built: ${path.basename(OUT)} (${replaced} styles overridden, ` +
  `${ADDITIONS.length} added)`);
