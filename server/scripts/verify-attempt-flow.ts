import prisma from '../src/config/db';
import { attemptService } from '../src/services/attempt.service';

async function main() {
  const stamp = Date.now();
  let reviewerId: string | null = null;
  let revieweeId: string | null = null;
  let examId: string | null = null;

  try {
    const reviewer = await prisma.user.create({
      data: {
        firstName: 'Flow',
        lastName: 'Owner',
        email: `flow-owner-${stamp}@example.com`,
        passwordHash: 'x',
        role: 'REVIEWER',
        status: 'ACTIVE',
        createdByAdmin: true,
        isExternalEmail: true,
      },
    });
    reviewerId = reviewer.id;

    const reviewee = await prisma.user.create({
      data: {
        firstName: 'Flow',
        lastName: 'Student',
        email: `flow-student-${stamp}@example.com`,
        passwordHash: 'x',
        role: 'REVIEWEE',
        status: 'ACTIVE',
        createdByAdmin: true,
        isExternalEmail: true,
      },
    });
    revieweeId = reviewee.id;

    const exam = await prisma.exam.create({
      data: {
        title: `Flow Exam ${stamp}`,
        subject: 'Integration',
        timeLimitMinutes: 15,
        maxAttempts: 2,
        cooldownMinutes: 0,
        feedbackMode: 'AFTER_SUBMIT',
        status: 'LIVE',
        closeOnDeadline: false,
        createdBy: reviewer.id,
      },
    });
    examId = exam.id;

    const section = await prisma.examSection.create({
      data: {
        examId: exam.id,
        title: 'Main',
        orderNo: 1,
      },
    });

    await prisma.examQuestion.createMany({
      data: [
        {
          examId: exam.id,
          sectionId: section.id,
          orderNo: 1,
          questionText: 'Q1',
          choiceA: 'A1',
          choiceB: 'B1',
          choiceC: 'C1',
          choiceD: 'D1',
          correctChoice: 'A',
          points: 1,
        },
        {
          examId: exam.id,
          sectionId: section.id,
          orderNo: 2,
          questionText: 'Q2',
          choiceA: 'A2',
          choiceB: 'B2',
          choiceC: 'C2',
          choiceD: 'D2',
          correctChoice: 'B',
          points: 1,
        },
      ],
    });

    const examWithQuestions = await prisma.exam.findUniqueOrThrow({
      where: { id: exam.id },
      include: { questions: { orderBy: { orderNo: 'asc' } } },
    });

    const q1 = examWithQuestions.questions[0]!;
    const q2 = examWithQuestions.questions[1]!;

    const started = await attemptService.startAttempt(reviewee.id, exam.id);
    console.log('START', {
      status: started.status,
      currentQuestionIndex: (started as any).currentQuestionIndex,
      hasEndsAt: Boolean((started as any).endsAt),
      remainingSeconds: started.remainingSeconds,
    });

    const saved = await attemptService.saveAttempt(started.id, reviewee.id, {
      currentQuestionIndex: 1,
      answers: {
        [q1.id]: 'A',
      },
      answerMeta: {
        [q1.id]: {
          viewedAt: new Date().toISOString(),
          answeredAt: new Date().toISOString(),
          elapsedSeconds: 13,
        },
        [q2.id]: {
          viewedAt: new Date().toISOString(),
          elapsedSeconds: 5,
        },
      },
    });

    const savedMeta = (saved as any).answerMeta || {};
    console.log('SAVE', {
      status: saved.status,
      currentQuestionIndex: (saved as any).currentQuestionIndex,
      q1Answered: saved.answers?.[q1.id],
      q1Elapsed: savedMeta[q1.id]?.elapsedSeconds,
      q1ViewedAt: Boolean(savedMeta[q1.id]?.viewedAt),
    });

    const resumed = await attemptService.startAttempt(reviewee.id, exam.id);
    console.log('RESUME', {
      sameAttemptId: resumed.id === started.id,
      currentQuestionIndex: (resumed as any).currentQuestionIndex,
      q1Answer: resumed.answers?.[q1.id],
      remainingSeconds: resumed.remainingSeconds,
    });

    await prisma.attempt.update({
      where: { id: started.id },
      data: {
        endsAt: new Date(Date.now() - 1000),
        status: 'IN_PROGRESS',
      },
    });

    const postExpiry = await attemptService.startAttempt(reviewee.id, exam.id);
    console.log('EXPIRE_TOUCH', {
      status: postExpiry.status,
      submissionType: (postExpiry as any).submissionType,
      remainingSeconds: postExpiry.remainingSeconds,
    });

    const reloaded = await prisma.attempt.findUnique({
      where: { id: started.id },
      include: { answers: true },
    });

    console.log('DB_STATE', {
      attemptStatus: reloaded?.status,
      hasEndsAt: Boolean(reloaded?.endsAt),
      currentQuestionIndex: reloaded?.currentQuestionIndex,
      lastActivityAt: Boolean(reloaded?.lastActivityAt),
      answerCount: reloaded?.answers.length,
      q1ViewedAt: Boolean(reloaded?.answers.find((a) => a.questionId === q1.id)?.viewedAt),
      q1Elapsed: reloaded?.answers.find((a) => a.questionId === q1.id)?.elapsedSeconds ?? null,
    });
  } finally {
    if (examId) {
      await prisma.attempt.deleteMany({ where: { examId } });
      await prisma.exam.deleteMany({ where: { id: examId } });
    }

    if (revieweeId) {
      await prisma.user.deleteMany({ where: { id: revieweeId } });
    }

    if (reviewerId) {
      await prisma.user.deleteMany({ where: { id: reviewerId } });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
