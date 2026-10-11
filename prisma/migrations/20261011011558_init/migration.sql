-- CreateEnum
CREATE TYPE "Domain" AS ENUM ('CRAFT_AND_STRUCTURE', 'INFORMATION_AND_IDEAS', 'STANDARD_ENGLISH_CONVENTIONS', 'EXPRESSION_OF_IDEAS');

-- CreateEnum
CREATE TYPE "SubSkill" AS ENUM ('WORDS_IN_CONTEXT', 'TEXT_STRUCTURE_AND_PURPOSE', 'CROSS_TEXT_CONNECTIONS', 'CENTRAL_IDEAS_AND_DETAILS', 'COMMAND_OF_EVIDENCE_TEXTUAL', 'COMMAND_OF_EVIDENCE_QUANTITATIVE', 'INFERENCES', 'BOUNDARIES_AND_PUNCTUATION', 'FORM_STRUCTURE_AND_SENSE', 'RHETORICAL_SYNTHESIS', 'TRANSITIONS');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'ABANDONED', 'COMPLETED');

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "domain" "Domain" NOT NULL,
    "subSkill" "SubSkill" NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "passage" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctOption" TEXT NOT NULL,
    "staticRationale" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSession" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "totalQuestions" INTEGER NOT NULL DEFAULT 54,
    "totalTimeMinutes" INTEGER NOT NULL DEFAULT 64,
    "status" "TestStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "currentModule" INTEGER NOT NULL DEFAULT 1,
    "timeRemainingSec" INTEGER NOT NULL DEFAULT 3840,
    "scoreRaw" INTEGER,
    "scoreScaled" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "abandonedAt" TIMESTAMP(3),
    "isAdaptiveFocus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestQuestion" (
    "id" TEXT NOT NULL,
    "testSessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "moduleNumber" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "selectedOption" TEXT,
    "isFlaggedForReview" BOOLEAN NOT NULL DEFAULT false,
    "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
    "eliminatedOptions" TEXT[],
    "isCorrect" BOOLEAN,
    "dynamicAiAnalysis" TEXT,
    "cognitiveMistakeType" TEXT,

    CONSTRAINT "TestQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentDomainProficiency" (
    "id" TEXT NOT NULL,
    "domain" "Domain" NOT NULL,
    "totalAttempted" INTEGER NOT NULL DEFAULT 0,
    "totalCorrect" INTEGER NOT NULL DEFAULT 0,
    "accuracyRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "avgTimeSpentSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentDomainProficiency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentDomainProficiency_domain_key" ON "StudentDomainProficiency"("domain");

-- AddForeignKey
ALTER TABLE "TestQuestion" ADD CONSTRAINT "TestQuestion_testSessionId_fkey" FOREIGN KEY ("testSessionId") REFERENCES "TestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestQuestion" ADD CONSTRAINT "TestQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
