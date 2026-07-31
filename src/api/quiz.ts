import { apiFetch } from "./apiClient";

export interface QuizQuestion {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
}

export interface Quiz {
  id: string;
  title: string;
  day: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  isActive: boolean;
  startTime: string | null;
  endTime: string | null;
  questions?: QuizQuestion[];
  _count?: { questions: number; results: number };
}

export interface QuizResult {
  id: string;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  timeSpent: number;
  quiz: { id: string; title: string; day: string };
}

export async function getActiveQuizzes(day?: string): Promise<Quiz[]> {
  const params = new URLSearchParams({ isActive: "true", limit: "50" });
  if (day) params.set("day", day);
  const res = await apiFetch<Quiz[]>(`/quiz?${params}`);
  return res.data;
}

/** Quizzes uploaded by the admin and available for learners to choose. */
export async function getQuizzes(day?: string): Promise<Quiz[]> {
  const params = new URLSearchParams({ limit: "100" });
  if (day) params.set("day", day);
  const res = await apiFetch<Quiz[]>(`/quiz?${params}`);
  return res.data;
}

export async function getQuizById(id: string): Promise<Quiz> {
  const res = await apiFetch<Quiz>(`/quiz/${id}`);
  return res.data;
}

export interface SubmitAnswer {
  questionId: string;
  selectedAnswer: string; // "A" | "B" | "C" | "D"
}

export async function submitQuiz(
  quizId: string,
  answers: SubmitAnswer[],
  timeSpent: number,
): Promise<QuizResult> {
  const res = await apiFetch<QuizResult>("/quiz/submit", {
    method: "POST",
    body: JSON.stringify({ quizId, answers, timeSpent }),
  });
  return res.data;
}

export async function activateQuiz(id: string): Promise<Quiz> {
  const res = await apiFetch<Quiz>(`/quiz/${id}/activate`, { method: "POST" });
  return res.data;
}

export async function deactivateQuiz(id: string): Promise<Quiz> {
  const res = await apiFetch<Quiz>(`/quiz/${id}/deactivate`, { method: "POST" });
  return res.data;
}
