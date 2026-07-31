import { env } from "../config/env.js";
import logger from "../utils/logger.js";

export class AgentService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = env.AGENT_BASE_URL;
  }

  async generateQuiz(day: string, difficulty: string, count: number) {
    try {
      const response = await fetch(`${this.baseUrl}/generate-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day, difficulty, count }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Agent generate-quiz failed", {
          status: response.status,
          error: errorText,
        });
        throw Object.assign(
          new Error(`Agent service error: ${response.status}`),
          { statusCode: 502 }
        );
      }

      return response.json();
    } catch (error: any) {
      if (error.statusCode) throw error;
      logger.error("Agent service unreachable", { error: error.message });
      throw Object.assign(
        new Error("Agent service is unavailable"),
        { statusCode: 503 }
      );
    }
  }

  async chat(userId: string, question: string) {
    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, question }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Agent chat failed", {
          status: response.status,
          error: errorText,
        });
        throw Object.assign(
          new Error(`Agent service error: ${response.status}`),
          { statusCode: 502 }
        );
      }

      return response.json();
    } catch (error: any) {
      if (error.statusCode) throw error;
      logger.error("Agent service unreachable", { error: error.message });
      throw Object.assign(
        new Error("Agent service is unavailable"),
        { statusCode: 503 }
      );
    }
  }

  async analyzeLevel(userId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/analyze-level`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!response.ok) {
        throw Object.assign(
          new Error(`Agent service error: ${response.status}`),
          { statusCode: 502 }
        );
      }

      return response.json();
    } catch (error: any) {
      if (error.statusCode) throw error;
      logger.error("Agent service unreachable", { error: error.message });
      throw Object.assign(
        new Error("Agent service is unavailable"),
        { statusCode: 503 }
      );
    }
  }
}

export const agentService = new AgentService();
