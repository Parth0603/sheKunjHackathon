export type ExamId = "JEE Advanced" | "GATE" | "NEET" | "UPSC";

export type ExamConfig = {
  durationMinutes: number;
  numberOfQuestions: number;
  marking: {
    correct: number;
    negative: number;
  };
  subjects: string[];
};

export const EXAM_CONFIGS: Record<ExamId, ExamConfig> = {
  "JEE Advanced": {
    durationMinutes: 180,
    numberOfQuestions: 30,
    marking: { correct: 4, negative: 1 },
    subjects: ["Physics", "Chemistry", "Mathematics"],
  },
  GATE: {
    durationMinutes: 180,
    numberOfQuestions: 30,
    marking: { correct: 2, negative: 0.67 },
    subjects: ["Computer Science", "Electrical", "Mechanical"],
  },
  NEET: {
    durationMinutes: 200,
    numberOfQuestions: 30,
    marking: { correct: 4, negative: 1 },
    subjects: ["Physics", "Chemistry", "Biology"],
  },
  UPSC: {
    durationMinutes: 120,
    numberOfQuestions: 30,
    marking: { correct: 2, negative: 0.67 },
    subjects: ["History", "Geography", "Polity", "Economy"],
  },
};
