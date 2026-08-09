// Build the client delivery package: styled .docx from the versioned markdown sources.
//
//   node tools/docx/build-package.js
//
// Requires pandoc 3.x, unzip, 7z, and Node. Outputs to both the in-repo package
// folder and the send folder alongside the repository.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '../..');
const WORK = path.join(__dirname, '.work');
const OUT_DIRS = [
  path.join(REPO, 'docs/client-package'),
  path.resolve(REPO, '..', 'client-package'), // the folder that goes to CNU
];

fs.mkdirSync(WORK, { recursive: true });

// Pandoc ships the base template; generate it rather than committing a binary.
const BASE = path.join(WORK, 'ref-default.docx');
if (!fs.existsSync(BASE)) {
  fs.writeFileSync(BASE, execFileSync('pandoc',
    ['--print-default-data-file', 'reference.docx'], { maxBuffer: 1 << 24 }));
}

// source markdown → package filename (no ext), running-head text, options.
// The Contract of Service is self-contained and incorporates no annexes; the
// documents that follow it are supporting material delivered alongside.
const DOCS = [
  ['docs/client-package/PACKAGE_CONTENTS_v1.4.0.md',
    '00_Start_Here_Package_Contents', 'Start Here · Package Contents'],
  ['docs/contract/CONTRACT_OF_SERVICE_v2.0.0.md',
    '01_Contract_of_Service_v2.0.0', 'Contract of Service · Normalite EDGE',
    // A formal instrument: no extracted title block, no heading promotion,
    // no table of contents, and the legal typographic profile.
    { profile: 'legal', toc: false, shiftHeadings: false, extractTitle: false }],
  ['docs/contract/PROPOSAL_AND_SOW_v1.2.0.md',
    '02_Proposal_and_Statement_of_Work_v1.2.0',
    'Proposal & Statement of Work'],
  ['docs/contract/DELIVERABLES_REGISTER_v1.1.2.md',
    '03_Deliverables_Register_v1.1.2', 'Deliverables Register'],
  ['docs/contract/MAINTENANCE_AND_SUPPORT_TERMS_v1.0.3.md',
    '04_Maintenance_and_Support_Terms_v1.0.3',
    'Maintenance & Support Terms'],
  ['docs/contract/ADMIN_ORIENTATION_PLAN_v1.0.3.md',
    '05_Administrator_Orientation_Plan_v1.0.3',
    'Administrator Orientation Plan'],
  ['PROJECT_SUMMARY_v2.0.3.md',
    '06_Project_Summary_v2.0.3', 'Project Summary'],
  ['docs/system/SYSTEM_DOCUMENTATION_v1.0.3.md',
    '07_System_Documentation_v1.0.3', 'System Documentation'],
  ['docs/manuals/USER_MANUAL_ADMIN_v1.0.3.md',
    '08_User_Manual_Administrator_v1.0.3', 'Administrator Manual'],
  ['docs/manuals/USER_MANUAL_REVIEWER_v1.0.3.md',
    '09_User_Manual_Reviewer_v1.0.3', 'Reviewer Manual'],
  ['docs/manuals/USER_MANUAL_REVIEWEE_v1.0.0.md',
    '10_User_Manual_Student_v1.0.0', 'Student Guide'],
];

// basename.md → package .docx, so cross-document links keep working,
// plus a human-readable name to use when the link text is just a filename.
const LINKMAP = {};
const NAMES = {};
for (const [src, out, name] of DOCS) {
  LINKMAP[path.basename(src)] = out + '.docx';
  NAMES[path.basename(src)] = name;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

// Symbols that may not resolve in the client's font stack.
const SUBS = [
  [/✅/g, 'DONE'], [/🔄/g, 'ONGOING'], [/⬜/g, 'SCHEDULED'],
  [/⚠️/g, 'VERIFY'], [/⚠/g, 'VERIFY'], [/☐/g, '[    ]'],
];

function prepare(mdPath, opts) {
  let md = fs.readFileSync(path.join(REPO, mdPath), 'utf8').replace(/\r\n/g, '\n');
  const lines = md.split('\n');
  let title = null; const authors = []; let date = '';

  if (opts.extractTitle !== false) {
    // 1. leading H1 → title metadata
    let i = 0;
    while (i < lines.length && !lines[i].startsWith('# ')) i++;
    title = lines[i].replace(/^#\s+/, '').trim();
    lines.splice(i, 1);

    // 2. the contiguous "**Key:** value" control block → author lines
    while (i < lines.length && lines[i].trim() === '') lines.splice(i, 1);
    while (i < lines.length && /^\*\*[^*]+:\*\*/.test(lines[i])) {
      const line = lines.splice(i, 1)[0].replace(/\*\*/g, '').trim();
      const m = line.match(/^Date:\s*(\d{4})-(\d{2})-(\d{2})/);
      if (m) date = `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}`;
      else authors.push(line);
    }
  }

  let body = lines.join('\n').replace(/^\n+/, '');
  for (const [re, to] of SUBS) body = body.replace(re, to);

  // 3. Drop any hand-written "## Contents" list — pandoc's TOC replaces it and
  //    carries page numbers, which a markdown anchor list cannot.
  if (opts.toc !== false) body = body.replace(/^## Contents\n[\s\S]*?\n---\n/m, '');

  // 4. Rewrite links. Anchor-only links are left alone so pandoc resolves them
  //    to internal bookmarks; mapped documents point at their .docx counterpart;
  //    anything else becomes readable text with a normalised repo path.
  body = body.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (all, text, target) => {
    if (/^(https?:|mailto:|#)/.test(target)) return all;
    const base = path.basename(target.split('#')[0]);
    if (LINKMAP[base]) {
      // A filename as link text is noise in a printed document.
      const label = /\.md$/.test(text.trim()) ? NAMES[base] : text;
      return `[${label}](${LINKMAP[base]})`;
    }
    const clean = target.replace(/^(\.\.\/)+/, '').replace(/^\.\//, '');
    return text.replace(/`/g, '') === clean ? `\`${clean}\`` : `${text} (\`${clean}\`)`;
  });

  return { title, authors, date, body };
}

function buildReference(headerText, outName, profile) {
  const dir = path.join(WORK, 'ref_' + outName);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  execFileSync('unzip', ['-o', '-q', BASE], { cwd: dir });
  const ref = path.join(WORK, outName + '.reference.docx');
  execFileSync('node',
    [path.join(__dirname, 'mkref.js'), dir, ref, headerText, profile],
    { stdio: 'pipe' });
  return ref;
}

for (const d of OUT_DIRS) fs.mkdirSync(d, { recursive: true });
fs.mkdirSync(path.join(WORK, 'out'), { recursive: true });

const yamlStr = (s) => JSON.stringify(s);
const results = [];

for (const [src, outName, headerText, opts = {}] of DOCS) {
  const { title, authors, date, body } = prepare(src, opts);

  const meta = title === null ? '' : ['---', `title: ${yamlStr(title)}`, 'author:',
    ...authors.map((a) => `  - ${yamlStr(a)}`),
    `date: ${yamlStr(date)}`, 'lang: en-PH', '---', ''].join('\n');

  const mdFile = path.join(WORK, outName + '.md');
  fs.writeFileSync(mdFile, meta + body, 'utf8');

  const ref = buildReference(headerText, outName, opts.profile || 'business');
  // Build to staging, then copy into place — a document open in Word is locked
  // on Windows, and one locked file must not fail the whole run.
  const staged = path.join(WORK, 'out', outName + '.docx');

  const args = [
    mdFile, '-o', staged,
    '--from', 'markdown+pipe_tables+backtick_code_blocks+fenced_divs+smart',
    '--reference-doc', ref,
    '--standalone',
  ];
  // The document's own H1 became the title, so promote everything one level:
  // "## 1. Parties" should render as Heading 1, not Heading 2.
  if (opts.shiftHeadings !== false) args.push('--shift-heading-level-by=-1');
  if (opts.toc !== false) args.push('--toc', '--toc-depth=2');

  execFileSync('pandoc', args, { stdio: 'pipe' });

  const kb = (fs.statSync(staged).size / 1024).toFixed(0);
  const locked = [];
  for (const dir of OUT_DIRS) {
    try {
      fs.copyFileSync(staged, path.join(dir, outName + '.docx'));
    } catch {
      locked.push(path.basename(dir));
    }
  }
  results.push({ outName, kb, locked });
  console.log(`  ${locked.length ? '!' : ' '} ${outName}.docx  ${kb} KB` +
    (opts.profile === 'legal' ? '  [legal]' : '') +
    (locked.length ? `  << locked in: ${locked.join(', ')}` : ''));
}

const stuck = results.filter((r) => r.locked.length);
console.log(`\n${results.length - stuck.length}/${results.length} written to:`);
for (const d of OUT_DIRS) console.log(`  ${d}`);
if (stuck.length) {
  console.log(`\n${stuck.length} file(s) locked — close them in Word and re-run.`);
  console.log(`Staged copies: ${path.join(WORK, 'out')}`);
}
