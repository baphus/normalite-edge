// Throwaway verification script: renders the exam report PDF headlessly.
// Run with `node __verify_export.mjs` from client/.
import { createServer } from 'vite';
import { writeFileSync } from 'node:fs';

const summary = {
  total: 42, submitted: 38, inProgress: 4, uniqueStudents: 33,
  averageScore: 78.4, highestScore: 100, lowestScore: 22,
};
const distribution = [
  { label: '0-49', count: 3 }, { label: '50-59', count: 5 }, { label: '60-69', count: 6 },
  { label: '70-79', count: 9 }, { label: '80-89', count: 10 }, { label: '90-100', count: 5 },
];
const topPrograms = [
  { program: 'Bachelor of Science in Nursing', count: 14, averageScore: 82.1 },
  { program: 'Bachelor of Elementary Education', count: 9, averageScore: 74.6 },
];
const rows = Array.from({ length: 40 }, (_, i) => ({
  rowNo: i + 1,
  studentName: `Student Name ${i + 1}`,
  studentEmail: `long.student.email.address.${i + 1}@cnu.edu.ph`,
  program: 'Bachelor of Science in Information Technology',
  campus: 'Main Campus',
  yearLevel: '3rd Year',
  section: 'B',
  attemptNo: (i % 3) + 1,
  status: i % 5 === 4 ? 'In progress' : 'Submitted',
  rawScore: i % 5 === 4 ? '-' : `${Math.round(20 + ((i * 7) % 40))}/${50}`,
  percentage: i % 5 === 4 ? '-' : `${Math.round(40 + ((i * 11) % 60))}%`,
  timeSpent: i % 5 === 4 ? '-' : `${Math.round(10 + ((i * 13) % 50))} min`,
  startedAt: '2026-07-28 08:15 AM',
  submittedAt: i % 5 === 4 ? '-' : '2026-07-28 09:02 AM',
}));
const questionRows = Array.from({ length: 8 }, (_, i) => ({
  globalQuestionNo: i + 1,
  sectionTitle: 'Multiple Choice',
  questionText:
    'Which of the following best describes the primary function of the mitochondria in eukaryotic cells?',
  choices: ['A. Protein synthesis\nB. ATP production\nC. DNA replication\nD. Lipid storage'],
  correctChoice: 'B',
  rationalization:
    "The mitochondria is known as the powerhouse of the cell because it generates most of the cell's supply of adenosine triphosphate (ATP), which is used as a source of chemical energy throughout the body.",
}));

const input = {
  exam: {
    title: 'Preliminary Examination in Anatomy and Physiology',
    status: 'PUBLISHED',
    category: 'Prelim',
    tracks: [
      { name: 'BS Nursing', code: 'BSN' },
      { name: 'BS Midwifery', code: 'BSM' },
    ],
    program_track: null,
    creator: { name: 'Dr. Maria Santos' },
    timeLimit: 60,
    description:
      'This examination covers the first three weeks of lectures on human anatomy and physiology, including cellular structure, tissues, and the skeletal system.',
  },
  questionCount: 50,
  deadline: '2026-08-10 11:59 PM',
  summary,
  distribution,
  topPrograms,
  questionRows,
  rows,
  columnKeys: [
    'rowNo', 'studentName', 'studentEmail', 'program', 'campus', 'yearLevel', 'section',
    'attemptNo', 'status', 'rawScore', 'percentage', 'timeSpent', 'startedAt', 'submittedAt',
  ],
  scope: 'FILTERED',
};

const server = await createServer({
  root: process.cwd(),
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
try {
  const mod = await server.ssrLoadModule('/src/lib/examReportExport.ts');
  const jspdfMod = await import('jspdf');
  const { jsPDF: JsPDF } = jspdfMod;
  const GState = jspdfMod.GState ?? JsPDF.GState ?? null;
  console.log(
    `GState branch: ${jspdfMod.GState ? 'module.GState' : (JsPDF.GState ? 'JsPDF.GState' : 'none')}`,
  );
  const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  mod.setWatermarkGState(GState);
  mod.renderExamReportToPdf(doc, input);
  const buf = Buffer.from(doc.output('arraybuffer'));
  writeFileSync('C:/Users/JKsars/AppData/Local/Temp/opencode/exam-report-verify.pdf', buf);
  console.log(`OK pages=${doc.getNumberOfPages()} bytes=${buf.length}`);
} finally {
  await server.close();
}
