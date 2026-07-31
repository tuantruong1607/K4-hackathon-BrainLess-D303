import { apiFetch } from "./apiClient";

export interface LearningProgress {
  id: string;
  userId: string;
  day: string;
  slidePage: number;
  completed: boolean;
  lastAccess: string;
}

export async function getProgress(): Promise<LearningProgress[]> {
  const res = await apiFetch<LearningProgress[]>("/progress");
  return res.data;
}

export async function updateProgress(
  day: string,
  slidePage: number,
  completed?: boolean,
): Promise<LearningProgress> {
  const res = await apiFetch<LearningProgress>("/progress", {
    method: "POST",
    body: JSON.stringify({ day, slidePage, completed }),
  });
  return res.data;
}
