import { apiFetch } from "./apiClient";

export interface AgentCitation {
  document_id: string;
  version: string;
  day: string;
  slide_number: number;
  title: string;
  content: string;
  concepts: string[];
  score: number;
}

export interface AgentResponse {
  answer: string;
  level: "beginner" | "intermediate" | "advanced";
  provider: string;
  sources: AgentCitation[];
}

export interface AgentHealth {
  status: string;
  provider: string;
  vector_store: string;
  graph_store: string;
  user_context_provider: string;
}

export interface TutorContext {
  currentDay: string;
  currentSlide: number;
}

export async function askTutor(
  question: string,
  context: TutorContext,
): Promise<AgentResponse> {
  const res = await apiFetch<AgentResponse>("/agent/ask", {
    method: "POST",
    body: JSON.stringify({ question, ...context }),
  });
  return res.data;
}

export async function getAgentHealth(): Promise<AgentHealth> {
  const res = await apiFetch<AgentHealth>("/agent/health");
  return res.data;
}
