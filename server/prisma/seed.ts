import { PrismaClient, Role, UserStatus, ExamStatus, FeedbackMode, Visibility, ApplicableCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TRACK_SEEDS: Array<{ name: string; code: string }> = [
    { name: 'Bachelor of Elementary Education', code: 'BEED' },
    { name: 'Bachelor of Secondary Education', code: 'BSED' },
    { name: 'Bachelor of Physical Education', code: 'BPED' },
    { name: 'Bachelor of Culture & Arts Education', code: 'BCAED' },
    { name: 'Bachelor of Early Childhood Education', code: 'BECED' },
    { name: 'Bachelor of Special Needs Education', code: 'BSNED' },
    { name: 'Bachelor of Secondary Education – Mathematics', code: 'BSED-MATH' },
    { name: 'Bachelor of Secondary Education – Science', code: 'BSED-SCI' },
    { name: 'Bachelor of Secondary Education – English', code: 'BSED-ENG' },
    { name: 'Bachelor of Secondary Education – Filipino', code: 'BSED-FIL' },
    { name: 'Bachelor of Secondary Education – Social Studies', code: 'BSED-SOC' },
    { name: 'Bachelor of Technology and Livelihood Education – Home Economics', code: 'BTLED-HE' },
    { name: 'Diploma in Professional Education', code: 'DPE' },
];

const CAMPUS_SEEDS: Array<{ name: string; code: string }> = [
    { name: 'Cebu Normal University - Main Campus', code: 'CNU-MAIN' },
    { name: 'Cebu Normal University - Balamban Campus', code: 'CNU-BALAMBAN' },
    { name: 'Cebu Normal University - Medellin Campus', code: 'CNU-MEDELLIN' },
];

async function seed() {
    console.log('🌱 Seeding database...');

    const passwordHash = await bcrypt.hash('password123', 10);

    for (const track of TRACK_SEEDS) {
        await prisma.track.upsert({
            where: { code: track.code },
            update: {
                name: track.name,
                isActive: true,
            },
            create: {
                name: track.name,
                code: track.code,
                isActive: true,
            },
        });
    }

    for (const campus of CAMPUS_SEEDS) {
        await prisma.campus.upsert({
            where: { code: campus.code },
            update: {
                name: campus.name,
                isActive: true,
            },
            create: {
                name: campus.name,
                code: campus.code,
                isActive: true,
            },
        });
    }

    const bsedTrack = await prisma.track.findUniqueOrThrow({ where: { code: 'BSED' } });
    const beedTrack = await prisma.track.findUniqueOrThrow({ where: { code: 'BEED' } });
    const mainCampus = await prisma.campus.findUniqueOrThrow({ where: { code: 'CNU-MAIN' } });

    const admin = await prisma.user.upsert({
        where: { email: 'admin@cnu.edu.ph' },
        update: {
            firstName: 'Admin',
            lastName: 'User',
            middleInitial: 'A',
            suffix: 'Sr.',
        },
        create: {
            firstName: 'Admin',
            lastName: 'User',
            middleInitial: 'A',
            suffix: 'Sr.',
            email: 'admin@cnu.edu.ph',
            passwordHash,
            role: Role.ADMIN,
            status: UserStatus.ACTIVE,
            createdByAdmin: true,
        },
    });

    const reviewer = await prisma.user.upsert({
        where: { email: 'reviewer@cnu.edu.ph' },
        update: {
            firstName: 'Maria',
            lastName: 'Santos',
            middleInitial: 'L',
            suffix: 'Jr.',
            trackId: bsedTrack.id,
            campusId: mainCampus.id,
            programTrack: bsedTrack.name,
        },
        create: {
            firstName: 'Maria',
            lastName: 'Santos',
            middleInitial: 'L',
            suffix: 'Jr.',
            email: 'reviewer@cnu.edu.ph',
            passwordHash,
            role: Role.REVIEWER,
            status: UserStatus.ACTIVE,
            trackId: bsedTrack.id,
            campusId: mainCampus.id,
            programTrack: bsedTrack.name,
            createdByAdmin: true,
        },
    });

    const reviewee = await prisma.user.upsert({
        where: { email: 'reviewee@cnu.edu.ph' },
        update: {
            firstName: 'Juan',
            lastName: 'Dela Cruz',
            middleInitial: 'R',
            suffix: 'III',
            trackId: beedTrack.id,
            campusId: mainCampus.id,
            programTrack: beedTrack.name,
        },
        create: {
            firstName: 'Juan',
            lastName: 'Dela Cruz',
            middleInitial: 'R',
            suffix: 'III',
            email: 'reviewee@cnu.edu.ph',
            passwordHash,
            role: Role.REVIEWEE,
            status: UserStatus.ACTIVE,
            trackId: beedTrack.id,
            campusId: mainCampus.id,
            programTrack: beedTrack.name,
            createdByAdmin: true,
        },
    });

    const exam = await prisma.exam.upsert({
        where: { id: '11111111-1111-1111-1111-111111111111' },
        update: {},
        create: {
            id: '11111111-1111-1111-1111-111111111111',
            title: 'General Education Mock Exam',
            description: 'Baseline seeded exam for backend smoke tests',
            subject: 'General Education',
            category: ApplicableCategory.GENERAL_EDUCATION,
            programTrack: 'BEED',
            timeLimitMinutes: 60,
            maxAttempts: 3,
            cooldownMinutes: 0,
            feedbackMode: FeedbackMode.AFTER_SUBMIT,
            status: ExamStatus.LIVE,
            createdBy: reviewer.id,
        },
    });

    const section = await prisma.examSection.upsert({
        where: {
            examId_orderNo: {
                examId: exam.id,
                orderNo: 1,
            },
        },
        update: {},
        create: {
            examId: exam.id,
            title: 'Section A',
            orderNo: 1,
        },
    });

    const existingQuestions = await prisma.examQuestion.count({ where: { examId: exam.id } });
    if (existingQuestions === 0) {
        await prisma.examQuestion.createMany({
            data: [
                {
                    examId: exam.id,
                    sectionId: section.id,
                    orderNo: 1,
                    questionText: 'Who is the national hero of the Philippines?',
                    choiceA: 'Andres Bonifacio',
                    choiceB: 'Jose Rizal',
                    choiceC: 'Emilio Aguinaldo',
                    choiceD: 'Apolinario Mabini',
                    correctChoice: 'B',
                },
                {
                    examId: exam.id,
                    sectionId: section.id,
                    orderNo: 2,
                    questionText: 'What is the largest planet in our solar system?',
                    choiceA: 'Saturn',
                    choiceB: 'Jupiter',
                    choiceC: 'Neptune',
                    choiceD: 'Uranus',
                    correctChoice: 'B',
                },
            ],
        });
    }

    const seededDeck = await prisma.studyDeck.upsert({
        where: { id: '22222222-2222-2222-2222-222222222222' },
        update: {},
        create: {
            id: '22222222-2222-2222-2222-222222222222',
            title: 'GenEd Seed Deck',
            description: 'Seeded study deck for BEED track',
            subject: 'General Education',
            category: ApplicableCategory.GENERAL_EDUCATION,
            visibility: Visibility.PUBLISHED,
            createdBy: reviewer.id,
        },
    });

    await prisma.studyDeckTrack.upsert({
        where: {
            deckId_trackId: {
                deckId: seededDeck.id,
                trackId: beedTrack.id,
            },
        },
        update: {},
        create: {
            deckId: seededDeck.id,
            trackId: beedTrack.id,
        },
    });

    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    await prisma.conference.upsert({
        where: { id: '33333333-3333-3333-3333-333333333333' },
        update: {},
        create: {
            id: '33333333-3333-3333-3333-333333333333',
            title: 'Weekly Review Session',
            description: 'Seeded live conference',
            startAt: now,
            endAt: oneHourLater,
            meetingLink: 'https://example.com/meeting',
            hostId: reviewer.id,
            programTrack: 'BEED',
        },
    });

    await prisma.notification.createMany({
        data: [
            {
                recipientUserId: reviewee.id,
                type: 'INFO',
                title: 'Welcome to Normalite EDGE',
                message: 'Your account is active and ready to use.',
                link: '/dashboard',
                severity: 'INFO',
            },
            {
                recipientUserId: reviewee.id,
                type: 'EXAM',
                title: 'New Mock Exam Available',
                message: 'General Education Mock Exam is now published.',
                link: '/exams',
                entityType: 'exam',
                entityId: exam.id,
                severity: 'INFO',
            },
        ],
        skipDuplicates: true,
    });

    console.log('✅ Seed completed successfully');
    console.log('Test accounts (password: password123):');
    console.log(' - admin@cnu.edu.ph');
    console.log(' - reviewer@cnu.edu.ph');
    console.log(' - reviewee@cnu.edu.ph');
}

seed()
    .catch((error) => {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
