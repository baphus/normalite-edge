import { Role, UserStatus, ExamStatus, FeedbackMode, Visibility, ApplicableCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '../src/config/db';

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

type SeedQuestion = {
    orderNo: number;
    questionText: string;
    choiceA: string;
    choiceB: string;
    choiceC: string;
    choiceD: string;
    correctChoice: 'A' | 'B' | 'C' | 'D';
    rationalization: string;
};

type SeedSection = {
    orderNo: number;
    title: string;
    instructions?: string;
    questions: SeedQuestion[];
};

type SeedExam = {
    id: string;
    title: string;
    description: string;
    subject: string;
    category: ApplicableCategory;
    programTrack: string;
    timeLimitMinutes: number;
    maxAttempts: number;
    cooldownMinutes: number;
    feedbackMode: FeedbackMode;
    status: ExamStatus;
    trackCodes: string[];
    sections: SeedSection[];
};

type SeedDeckCard = {
    orderNo: number;
    questionText: string;
    answerText: string;
    rationalization: string;
    choiceA?: string;
    choiceB?: string;
    choiceC?: string;
    choiceD?: string;
    correctChoice?: 'A' | 'B' | 'C' | 'D';
};

type SeedDeck = {
    id: string;
    title: string;
    description: string;
    subject: string;
    category: ApplicableCategory;
    trackCodes: string[];
    cards: SeedDeckCard[];
};

const EXAM_SEEDS: SeedExam[] = [
    {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'General Education Mock Exam',
        description: 'Comprehensive baseline exam for language, mathematics, and science readiness.',
        subject: 'General Education',
        category: ApplicableCategory.GENERAL_EDUCATION,
        programTrack: 'BEED',
        timeLimitMinutes: 60,
        maxAttempts: 3,
        cooldownMinutes: 0,
        feedbackMode: FeedbackMode.AFTER_SUBMIT,
        status: ExamStatus.LIVE,
        trackCodes: ['BEED', 'BSED'],
        sections: [
            {
                orderNo: 1,
                title: 'Language and Reading',
                instructions: 'Read each item carefully and choose the best answer.',
                questions: [
                    {
                        orderNo: 1,
                        questionText: 'Which sentence uses correct subject-verb agreement?',
                        choiceA: 'The list of requirements are on the desk.',
                        choiceB: 'The list of requirements is on the desk.',
                        choiceC: 'The lists of requirements is on the desk.',
                        choiceD: 'The list of requirements were on the desk.',
                        correctChoice: 'B',
                        rationalization: 'The subject is singular (list), so it takes the singular verb is.',
                    },
                    {
                        orderNo: 2,
                        questionText: 'What is the main idea of a paragraph?',
                        choiceA: 'The first word in each sentence',
                        choiceB: 'The central thought that all details support',
                        choiceC: 'A random opinion of the reader',
                        choiceD: 'A list of difficult vocabulary words',
                        correctChoice: 'B',
                        rationalization: 'The main idea is the controlling thought around which supporting details are organized.',
                    },
                    {
                        orderNo: 3,
                        questionText: 'Choose the best transitional phrase for showing contrast.',
                        choiceA: 'For example',
                        choiceB: 'In addition',
                        choiceC: 'On the other hand',
                        choiceD: 'As a result',
                        correctChoice: 'C',
                        rationalization: 'On the other hand introduces an opposing or contrasting point.',
                    },
                    {
                        orderNo: 4,
                        questionText: 'In test-taking, skimming is best used to:',
                        choiceA: 'Memorize all details immediately',
                        choiceB: 'Get a quick overview of the text',
                        choiceC: 'Avoid reading headings',
                        choiceD: 'Rewrite the entire passage',
                        correctChoice: 'B',
                        rationalization: 'Skimming helps identify structure and key points quickly before deep reading.',
                    },
                    {
                        orderNo: 5,
                        questionText: 'Which is a context clue strategy?',
                        choiceA: 'Ignore unknown words',
                        choiceB: 'Look at nearby definitions, examples, or synonyms',
                        choiceC: 'Replace all unknown words with pronouns',
                        choiceD: 'Only read the title',
                        correctChoice: 'B',
                        rationalization: 'Context clues often appear around a difficult word and hint at meaning.',
                    },
                ],
            },
            {
                orderNo: 2,
                title: 'Math and Science',
                instructions: 'Compute and analyze each item.',
                questions: [
                    {
                        orderNo: 1,
                        questionText: 'What is 25% of 320?',
                        choiceA: '40',
                        choiceB: '60',
                        choiceC: '80',
                        choiceD: '100',
                        correctChoice: 'C',
                        rationalization: '25% is one-fourth, and one-fourth of 320 is 80.',
                    },
                    {
                        orderNo: 2,
                        questionText: 'If 3x + 5 = 20, what is x?',
                        choiceA: '3',
                        choiceB: '4',
                        choiceC: '5',
                        choiceD: '6',
                        correctChoice: 'C',
                        rationalization: 'Subtract 5 from both sides, then divide by 3: x = 15/3 = 5.',
                    },
                    {
                        orderNo: 3,
                        questionText: 'Which process do plants use to make food?',
                        choiceA: 'Respiration',
                        choiceB: 'Photosynthesis',
                        choiceC: 'Transpiration',
                        choiceD: 'Fermentation',
                        correctChoice: 'B',
                        rationalization: 'Photosynthesis converts light energy, water, and carbon dioxide into glucose.',
                    },
                    {
                        orderNo: 4,
                        questionText: 'What is the SI unit of force?',
                        choiceA: 'Joule',
                        choiceB: 'Watt',
                        choiceC: 'Newton',
                        choiceD: 'Pascal',
                        correctChoice: 'C',
                        rationalization: 'Force is measured in Newtons in the International System of Units.',
                    },
                    {
                        orderNo: 5,
                        questionText: 'Which graph best shows change over time?',
                        choiceA: 'Pie graph',
                        choiceB: 'Line graph',
                        choiceC: 'Pictograph',
                        choiceD: 'Venn diagram',
                        correctChoice: 'B',
                        rationalization: 'Line graphs are designed to display trends and changes across intervals.',
                    },
                ],
            },
        ],
    },
    {
        id: '44444444-4444-4444-4444-444444444444',
        title: 'Professional Education Foundations',
        description: 'Pedagogy, assessment, and classroom management essentials for LET preparation.',
        subject: 'Professional Education',
        category: ApplicableCategory.PROFESSIONAL_EDUCATION,
        programTrack: 'BSED',
        timeLimitMinutes: 75,
        maxAttempts: 2,
        cooldownMinutes: 15,
        feedbackMode: FeedbackMode.AFTER_SUBMIT,
        status: ExamStatus.LIVE,
        trackCodes: ['BSED', 'BEED'],
        sections: [
            {
                orderNo: 1,
                title: 'Learning Theories',
                instructions: 'Identify the best concept or principle that applies.',
                questions: [
                    {
                        orderNo: 1,
                        questionText: 'Who emphasized social interaction in cognitive development?',
                        choiceA: 'B.F. Skinner',
                        choiceB: 'Jean Piaget',
                        choiceC: 'Lev Vygotsky',
                        choiceD: 'Edward Thorndike',
                        correctChoice: 'C',
                        rationalization: 'Vygotsky highlighted the social nature of learning and the Zone of Proximal Development.',
                    },
                    {
                        orderNo: 2,
                        questionText: 'In Bloom\'s taxonomy, which level involves judging based on criteria?',
                        choiceA: 'Remembering',
                        choiceB: 'Understanding',
                        choiceC: 'Applying',
                        choiceD: 'Evaluating',
                        correctChoice: 'D',
                        rationalization: 'Evaluating requires making informed judgments using standards or criteria.',
                    },
                    {
                        orderNo: 3,
                        questionText: 'A reward used to increase behavior is called:',
                        choiceA: 'Negative punishment',
                        choiceB: 'Positive reinforcement',
                        choiceC: 'Extinction',
                        choiceD: 'Generalization',
                        correctChoice: 'B',
                        rationalization: 'Positive reinforcement adds a desirable stimulus to strengthen a behavior.',
                    },
                    {
                        orderNo: 4,
                        questionText: 'Scaffolding is most closely associated with:',
                        choiceA: 'Humanistic learning',
                        choiceB: 'Behaviorism',
                        choiceC: 'Constructivist teaching',
                        choiceD: 'Maturation theory',
                        correctChoice: 'C',
                        rationalization: 'Scaffolding supports learners as they construct understanding and gradually gain independence.',
                    },
                    {
                        orderNo: 5,
                        questionText: 'Mastery learning primarily focuses on:',
                        choiceA: 'Covering all lessons quickly',
                        choiceB: 'Ensuring most learners reach learning targets before moving on',
                        choiceC: 'Ranking learners strictly by speed',
                        choiceD: 'Removing formative checks',
                        correctChoice: 'B',
                        rationalization: 'Mastery learning allows time and corrective instruction until key competencies are achieved.',
                    },
                ],
            },
            {
                orderNo: 2,
                title: 'Assessment and Classroom Practice',
                instructions: 'Select the most pedagogically sound answer.',
                questions: [
                    {
                        orderNo: 1,
                        questionText: 'Which assessment gives ongoing feedback during instruction?',
                        choiceA: 'Summative assessment',
                        choiceB: 'Diagnostic assessment',
                        choiceC: 'Formative assessment',
                        choiceD: 'Placement assessment',
                        correctChoice: 'C',
                        rationalization: 'Formative assessments inform immediate teaching adjustments while learning is in progress.',
                    },
                    {
                        orderNo: 2,
                        questionText: 'A rubric is most useful for:',
                        choiceA: 'Random scoring',
                        choiceB: 'Transparent and consistent performance criteria',
                        choiceC: 'Eliminating feedback',
                        choiceD: 'Only objective tests',
                        correctChoice: 'B',
                        rationalization: 'Rubrics communicate standards and support reliable scoring and feedback.',
                    },
                    {
                        orderNo: 3,
                        questionText: 'Classroom rules are most effective when they are:',
                        choiceA: 'Many and complex',
                        choiceB: 'Unclear and flexible daily',
                        choiceC: 'Few, clear, and consistently implemented',
                        choiceD: 'Announced only at grading time',
                        correctChoice: 'C',
                        rationalization: 'Clear, limited rules with consistent follow-through build positive classroom routines.',
                    },
                    {
                        orderNo: 4,
                        questionText: 'An item analysis after a test helps teachers:',
                        choiceA: 'Ignore difficult questions',
                        choiceB: 'Identify weak items and improve instruction',
                        choiceC: 'Remove all multiple-choice items',
                        choiceD: 'Avoid remediation',
                        correctChoice: 'B',
                        rationalization: 'Item analysis reveals discrimination and difficulty patterns for better test quality.',
                    },
                    {
                        orderNo: 5,
                        questionText: 'Differentiated instruction means:',
                        choiceA: 'Giving the same task to all learners',
                        choiceB: 'Adapting content, process, or product to learner needs',
                        choiceC: 'Lowering standards permanently',
                        choiceD: 'Assessing only once per quarter',
                        correctChoice: 'B',
                        rationalization: 'Differentiation matches instruction to readiness, interests, and learning profiles.',
                    },
                ],
            },
        ],
    },
    {
        id: '55555555-5555-5555-5555-555555555555',
        title: 'Major Specialization: Mathematics',
        description: 'Targeted content for BSED Mathematics reviewees.',
        subject: 'Mathematics',
        category: ApplicableCategory.SPECIALIZATION,
        programTrack: 'BSED-MATH',
        timeLimitMinutes: 90,
        maxAttempts: 2,
        cooldownMinutes: 15,
        feedbackMode: FeedbackMode.AFTER_SUBMIT,
        status: ExamStatus.LIVE,
        trackCodes: ['BSED-MATH'],
        sections: [
            {
                orderNo: 1,
                title: 'Algebra and Functions',
                questions: [
                    {
                        orderNo: 1,
                        questionText: 'If f(x)=2x^2-3x+1, what is f(2)?',
                        choiceA: '1',
                        choiceB: '2',
                        choiceC: '3',
                        choiceD: '4',
                        correctChoice: 'C',
                        rationalization: 'f(2)=2(4)-3(2)+1=8-6+1=3.',
                    },
                    {
                        orderNo: 2,
                        questionText: 'Solve for x: x^2 - 9 = 0.',
                        choiceA: 'x = 3 only',
                        choiceB: 'x = -3 only',
                        choiceC: 'x = plus or minus 3',
                        choiceD: 'x = 0',
                        correctChoice: 'C',
                        rationalization: 'x^2=9 so x can be 3 or -3.',
                    },
                    {
                        orderNo: 3,
                        questionText: 'What is the slope of the line through (1,2) and (5,10)?',
                        choiceA: '1',
                        choiceB: '2',
                        choiceC: '3',
                        choiceD: '4',
                        correctChoice: 'B',
                        rationalization: 'Slope=(10-2)/(5-1)=8/4=2.',
                    },
                    {
                        orderNo: 4,
                        questionText: 'A function is one-to-one if:',
                        choiceA: 'Different inputs can share same output always',
                        choiceB: 'Every output corresponds to exactly one input',
                        choiceC: 'Its graph fails the vertical line test',
                        choiceD: 'It has no inverse',
                        correctChoice: 'B',
                        rationalization: 'One-to-one functions pass the horizontal line test and have unique outputs per input.',
                    },
                    {
                        orderNo: 5,
                        questionText: 'Which is the vertex form of a quadratic function?',
                        choiceA: 'y = ax + b',
                        choiceB: 'y = a(x-h)^2 + k',
                        choiceC: 'y = mx + b',
                        choiceD: 'y = a/b',
                        correctChoice: 'B',
                        rationalization: 'The vertex form y = a(x-h)^2 + k shows the vertex directly as (h,k).',
                    },
                ],
            },
        ],
    },
];

const DECK_SEEDS: SeedDeck[] = [
    {
        id: '22222222-2222-2222-2222-222222222222',
        title: 'GenEd Foundations Flashcards',
        description: 'High-frequency General Education concepts for recall practice.',
        subject: 'General Education',
        category: ApplicableCategory.GENERAL_EDUCATION,
        trackCodes: ['BEED', 'BSED'],
        cards: [
            {
                orderNo: 1,
                questionText: 'What is the main purpose of formative assessment?',
                answerText: 'To monitor learning and improve instruction while teaching is ongoing.',
                choiceA: 'To rank schools based on final exam scores only.',
                choiceB: 'To monitor learning and improve instruction while teaching is ongoing.',
                choiceC: 'To replace all summative assessments permanently.',
                choiceD: 'To assign grades without giving feedback.',
                correctChoice: 'B',
                rationalization: 'Formative checks provide immediate evidence for instructional adjustment.',
            },
            {
                orderNo: 2,
                questionText: 'Which punctuation mark is commonly used to introduce a list?',
                answerText: 'A colon (:).',
                choiceA: 'A semicolon (;)',
                choiceB: 'A comma (,)',
                choiceC: 'A colon (:)',
                choiceD: 'A question mark (?)',
                correctChoice: 'C',
                rationalization: 'A colon signals that an explanation or list follows.',
            },
            {
                orderNo: 3,
                questionText: 'What is 15% of 200?',
                answerText: '30',
                choiceA: '20',
                choiceB: '25',
                choiceC: '30',
                choiceD: '35',
                correctChoice: 'C',
                rationalization: '0.15 multiplied by 200 equals 30.',
            },
            {
                orderNo: 4,
                questionText: 'Which layer of Earth do we live on?',
                answerText: 'The crust.',
                choiceA: 'The mantle',
                choiceB: 'The outer core',
                choiceC: 'The inner core',
                choiceD: 'The crust',
                correctChoice: 'D',
                rationalization: 'The crust is the outermost solid layer where life exists.',
            },
            {
                orderNo: 5,
                questionText: 'What does GDP stand for?',
                answerText: 'Gross Domestic Product.',
                choiceA: 'General Development Plan',
                choiceB: 'Global Domestic Policy',
                choiceC: 'Gross Domestic Product',
                choiceD: 'Government Distribution Program',
                correctChoice: 'C',
                rationalization: 'GDP measures the total value of goods and services produced domestically.',
            },
            {
                orderNo: 6,
                questionText: 'Identify the synonym of diligent.',
                answerText: 'Hardworking.',
                choiceA: 'Careless',
                choiceB: 'Hardworking',
                choiceC: 'Noisy',
                choiceD: 'Uncertain',
                correctChoice: 'B',
                rationalization: 'Diligent describes careful and persistent effort.',
            },
            {
                orderNo: 7,
                questionText: 'Which is a renewable energy source?',
                answerText: 'Solar energy.',
                choiceA: 'Coal',
                choiceB: 'Diesel fuel',
                choiceC: 'Natural gas',
                choiceD: 'Solar energy',
                correctChoice: 'D',
                rationalization: 'Solar energy is replenished naturally by sunlight.',
            },
            {
                orderNo: 8,
                questionText: 'In a simple sentence, how many independent clauses are there?',
                answerText: 'One independent clause.',
                choiceA: 'One independent clause',
                choiceB: 'Two independent clauses',
                choiceC: 'Three independent clauses',
                choiceD: 'No independent clauses',
                correctChoice: 'A',
                rationalization: 'A simple sentence contains one complete thought.',
            },
        ],
    },
    {
        id: '66666666-6666-6666-6666-666666666666',
        title: 'Professional Education Quick Drill',
        description: 'Core pedagogy and assessment terms every reviewee should master.',
        subject: 'Professional Education',
        category: ApplicableCategory.PROFESSIONAL_EDUCATION,
        trackCodes: ['BEED', 'BSED'],
        cards: [
            {
                orderNo: 1,
                questionText: 'Who introduced the concept of Zone of Proximal Development?',
                answerText: 'Lev Vygotsky.',
                choiceA: 'Jean Piaget',
                choiceB: 'B.F. Skinner',
                choiceC: 'Lev Vygotsky',
                choiceD: 'Edward Thorndike',
                correctChoice: 'C',
                rationalization: 'ZPD describes what learners can do with guidance.',
            },
            {
                orderNo: 2,
                questionText: 'A test blueprint primarily ensures what?',
                answerText: 'Content validity and balanced item distribution.',
                choiceA: 'Higher pass rates regardless of mastery',
                choiceB: 'Content validity and balanced item distribution',
                choiceC: 'Faster checking through fewer items',
                choiceD: 'Elimination of classroom assessments',
                correctChoice: 'B',
                rationalization: 'Blueprints align test items with objectives and weightings.',
            },
            {
                orderNo: 3,
                questionText: 'Immediate feedback after each question is what feedback mode?',
                answerText: 'Immediate feedback mode.',
                choiceA: 'Delayed summary mode',
                choiceB: 'Batch release mode',
                choiceC: 'Immediate feedback mode',
                choiceD: 'Anonymous peer mode',
                correctChoice: 'C',
                rationalization: 'Immediate mode returns correctness per item right away.',
            },
            {
                orderNo: 4,
                questionText: 'What is the preferred first response to minor classroom disruption?',
                answerText: 'Use low-key, non-confrontational redirection.',
                choiceA: 'Immediately remove the learner from class',
                choiceB: 'Raise voice to gain quick compliance',
                choiceC: 'Ignore behavior until class ends',
                choiceD: 'Use low-key, non-confrontational redirection',
                correctChoice: 'D',
                rationalization: 'Early, calm intervention prevents escalation and preserves flow.',
            },
            {
                orderNo: 5,
                questionText: 'Which assessment compares performance against standards, not peers?',
                answerText: 'Criterion-referenced assessment.',
                choiceA: 'Norm-referenced assessment',
                choiceB: 'Aptitude screening',
                choiceC: 'Criterion-referenced assessment',
                choiceD: 'Placement ranking',
                correctChoice: 'C',
                rationalization: 'Criterion-referenced tests measure mastery of defined competencies.',
            },
            {
                orderNo: 6,
                questionText: 'State one benefit of cooperative learning.',
                answerText: 'It improves engagement and peer-supported understanding.',
                choiceA: 'It removes the need for teacher facilitation',
                choiceB: 'It guarantees equal scores for all learners',
                choiceC: 'It improves engagement and peer-supported understanding',
                choiceD: 'It works only for high-performing students',
                correctChoice: 'C',
                rationalization: 'Structured collaboration can increase participation and accountability.',
            },
        ],
    },
    {
        id: '77777777-7777-7777-7777-777777777777',
        title: 'Math Major Concept Cards',
        description: 'Specialization flashcards for BSED Mathematics review.',
        subject: 'Mathematics',
        category: ApplicableCategory.SPECIALIZATION,
        trackCodes: ['BSED-MATH'],
        cards: [
            {
                orderNo: 1,
                questionText: 'What is the derivative of x^2?',
                answerText: '2x',
                choiceA: 'x',
                choiceB: '2x',
                choiceC: 'x^2',
                choiceD: '2',
                correctChoice: 'B',
                rationalization: 'By the power rule, d/dx of x^n is n*x^(n-1).',
            },
            {
                orderNo: 2,
                questionText: 'What is the sum of interior angles of a triangle?',
                answerText: '180 degrees.',
                choiceA: '90 degrees',
                choiceB: '120 degrees',
                choiceC: '180 degrees',
                choiceD: '360 degrees',
                correctChoice: 'C',
                rationalization: 'Euclidean triangles always have angle sum 180 degrees.',
            },
            {
                orderNo: 3,
                questionText: 'In probability, what does P(A|B) denote?',
                answerText: 'The probability of A given that B has occurred.',
                choiceA: 'The probability of both A and B occurring independently',
                choiceB: 'The probability of A given that B has occurred',
                choiceC: 'The complement of event A',
                choiceD: 'The probability of B given that A has occurred',
                correctChoice: 'B',
                rationalization: 'This is conditional probability notation.',
            },
            {
                orderNo: 4,
                questionText: 'Which is equivalent to log10(1000)?',
                answerText: '3',
                choiceA: '2',
                choiceB: '2.5',
                choiceC: '3',
                choiceD: '10',
                correctChoice: 'C',
                rationalization: '10 raised to 3 equals 1000.',
            },
            {
                orderNo: 5,
                questionText: 'What does a negative discriminant indicate for a quadratic equation?',
                answerText: 'No real roots (complex conjugate roots).',
                choiceA: 'Two equal real roots',
                choiceB: 'One positive real root only',
                choiceC: 'No real roots (complex conjugate roots)',
                choiceD: 'Infinitely many real roots',
                correctChoice: 'C',
                rationalization: 'If b^2-4ac is negative, square root is imaginary.',
            },
            {
                orderNo: 6,
                questionText: 'State the slope-intercept form of a line.',
                answerText: 'y = mx + b',
                choiceA: 'y = ax^2 + bx + c',
                choiceB: 'x = my + b',
                choiceC: 'y = mx + b',
                choiceD: 'y = a/b',
                correctChoice: 'C',
                rationalization: 'm is slope and b is y-intercept.',
            },
        ],
    },
];

async function upsertExamWithContent(examSeed: SeedExam, reviewerId: string, tracksByCode: Map<string, string>) {
    const exam = await prisma.exam.upsert({
        where: { id: examSeed.id },
        update: {
            title: examSeed.title,
            description: examSeed.description,
            subject: examSeed.subject,
            category: examSeed.category,
            programTrack: examSeed.programTrack,
            timeLimitMinutes: examSeed.timeLimitMinutes,
            maxAttempts: examSeed.maxAttempts,
            cooldownMinutes: examSeed.cooldownMinutes,
            feedbackMode: examSeed.feedbackMode,
            status: examSeed.status,
            createdBy: reviewerId,
        },
        create: {
            id: examSeed.id,
            title: examSeed.title,
            description: examSeed.description,
            subject: examSeed.subject,
            category: examSeed.category,
            programTrack: examSeed.programTrack,
            timeLimitMinutes: examSeed.timeLimitMinutes,
            maxAttempts: examSeed.maxAttempts,
            cooldownMinutes: examSeed.cooldownMinutes,
            feedbackMode: examSeed.feedbackMode,
            status: examSeed.status,
            createdBy: reviewerId,
        },
    });

    for (const trackCode of examSeed.trackCodes) {
        const trackId = tracksByCode.get(trackCode);
        if (!trackId) continue;
        await prisma.examTrack.upsert({
            where: {
                examId_trackId: {
                    examId: exam.id,
                    trackId,
                },
            },
            update: {},
            create: {
                examId: exam.id,
                trackId,
            },
        });
    }

    for (const sectionSeed of examSeed.sections) {
        const section = await prisma.examSection.upsert({
            where: {
                examId_orderNo: {
                    examId: exam.id,
                    orderNo: sectionSeed.orderNo,
                },
            },
            update: {
                title: sectionSeed.title,
                instructions: sectionSeed.instructions || null,
            },
            create: {
                examId: exam.id,
                orderNo: sectionSeed.orderNo,
                title: sectionSeed.title,
                instructions: sectionSeed.instructions || null,
            },
        });

        for (const questionSeed of sectionSeed.questions) {
            await prisma.examQuestion.upsert({
                where: {
                    sectionId_orderNo: {
                        sectionId: section.id,
                        orderNo: questionSeed.orderNo,
                    },
                },
                update: {
                    examId: exam.id,
                    questionText: questionSeed.questionText,
                    choiceA: questionSeed.choiceA,
                    choiceB: questionSeed.choiceB,
                    choiceC: questionSeed.choiceC,
                    choiceD: questionSeed.choiceD,
                    correctChoice: questionSeed.correctChoice,
                    rationalization: questionSeed.rationalization,
                    points: 1,
                },
                create: {
                    examId: exam.id,
                    sectionId: section.id,
                    orderNo: questionSeed.orderNo,
                    questionText: questionSeed.questionText,
                    choiceA: questionSeed.choiceA,
                    choiceB: questionSeed.choiceB,
                    choiceC: questionSeed.choiceC,
                    choiceD: questionSeed.choiceD,
                    correctChoice: questionSeed.correctChoice,
                    rationalization: questionSeed.rationalization,
                    points: 1,
                },
            });
        }
    }

    return exam;
}

async function upsertDeckWithContent(deckSeed: SeedDeck, reviewerId: string, tracksByCode: Map<string, string>) {
    const deck = await prisma.studyDeck.upsert({
        where: { id: deckSeed.id },
        update: {
            title: deckSeed.title,
            description: deckSeed.description,
            subject: deckSeed.subject,
            category: deckSeed.category,
            visibility: Visibility.PUBLISHED,
            createdBy: reviewerId,
        },
        create: {
            id: deckSeed.id,
            title: deckSeed.title,
            description: deckSeed.description,
            subject: deckSeed.subject,
            category: deckSeed.category,
            visibility: Visibility.PUBLISHED,
            createdBy: reviewerId,
        },
    });

    for (const trackCode of deckSeed.trackCodes) {
        const trackId = tracksByCode.get(trackCode);
        if (!trackId) continue;
        await prisma.studyDeckTrack.upsert({
            where: {
                deckId_trackId: {
                    deckId: deck.id,
                    trackId,
                },
            },
            update: {},
            create: {
                deckId: deck.id,
                trackId,
            },
        });
    }

    for (const cardSeed of deckSeed.cards) {
        await prisma.studyDeckQuestion.upsert({
            where: {
                deckId_orderNo: {
                    deckId: deck.id,
                    orderNo: cardSeed.orderNo,
                },
            },
            update: {
                questionText: cardSeed.questionText,
                answerText: cardSeed.answerText,
                rationalization: cardSeed.rationalization,
                choiceA: cardSeed.choiceA || null,
                choiceB: cardSeed.choiceB || null,
                choiceC: cardSeed.choiceC || null,
                choiceD: cardSeed.choiceD || null,
                correctChoice: cardSeed.correctChoice || null,
                points: 1,
            },
            create: {
                deckId: deck.id,
                orderNo: cardSeed.orderNo,
                questionText: cardSeed.questionText,
                answerText: cardSeed.answerText,
                rationalization: cardSeed.rationalization,
                choiceA: cardSeed.choiceA || null,
                choiceB: cardSeed.choiceB || null,
                choiceC: cardSeed.choiceC || null,
                choiceD: cardSeed.choiceD || null,
                correctChoice: cardSeed.correctChoice || null,
                points: 1,
            },
        });
    }

    return deck;
}

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

    const tracksByCode = new Map<string, string>(
        (await prisma.track.findMany({
            where: {
                code: {
                    in: Array.from(
                        new Set([
                            ...EXAM_SEEDS.flatMap((examSeed) => examSeed.trackCodes),
                            ...DECK_SEEDS.flatMap((deckSeed) => deckSeed.trackCodes),
                        ])
                    ),
                },
            },
            select: {
                id: true,
                code: true,
            },
        }))
            .filter((track): track is { id: string; code: string } => Boolean(track.code))
            .map((track) => [track.code, track.id]),
    );

    const seededExams = [] as Array<{ id: string; title: string }>;
    for (const examSeed of EXAM_SEEDS) {
        const seededExam = await upsertExamWithContent(examSeed, reviewer.id, tracksByCode);
        seededExams.push({ id: seededExam.id, title: seededExam.title });
    }

    for (const deckSeed of DECK_SEEDS) {
        await upsertDeckWithContent(deckSeed, reviewer.id, tracksByCode);
    }

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
                message: `${seededExams[0]?.title || 'A new exam'} is now published.`,
                link: '/exams',
                entityType: 'exam',
                entityId: seededExams[0]?.id,
                severity: 'INFO',
            },
            {
                recipientUserId: reviewee.id,
                type: 'STUDY_MATERIAL',
                title: 'New Flashcards Added',
                message: 'Fresh flashcard decks are available in Study Hub.',
                link: '/study',
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
        throw error;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
