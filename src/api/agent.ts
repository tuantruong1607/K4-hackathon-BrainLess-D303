import { apiFetch, ApiError } from "./apiClient";

export interface AgentResponse {
  answer?: string;
  response?: string;
  [key: string]: unknown;
}

/**
 * Fallback replies when the AI agent service is unavailable.
 * Mirrors the original hardcoded replyFor() behavior.
 */
function fallbackReply(question: string): string {
  const normalized = question.toLocaleLowerCase("vi");
  if (normalized.includes("push") || normalized.includes("pull")) {
    return "Push là áp lực khiến cách cũ không còn ổn. Pull là sức hút của giải pháp mới. Người dùng đổi khi hai lực này mạnh hơn thói quen và nỗi lo.";
  }
  if (normalized.includes("ví dụ")) {
    return "Ví dụ: một người không thuê ứng dụng ghi chú chỉ để lưu chữ. Họ thuê nó để lấy lại cảm giác kiểm soát khi công việc trở nên quá tải.";
  }
  if (normalized.includes("tóm tắt")) {
    return "Hãy nghiên cứu tiến bộ người dùng muốn đạt được trong một hoàn cảnh cụ thể, thay vì chỉ hỏi họ muốn thêm tính năng gì.";
  }
  return "Mình hiểu câu hỏi của bạn. Hãy thử nối nó với ba ý: hoàn cảnh hiện tại, động lực thay đổi và kết quả người dùng mong muốn.";
}

/**
 * Ask the AI tutor. Falls back to local heuristic replies when the
 * agent backend (port 8300) is unavailable.
 */
export async function askTutor(question: string): Promise<string> {
  try {
    const res = await apiFetch<AgentResponse>("/agent/ask", {
      method: "POST",
      body: JSON.stringify({ question }),
    });
    return res.data.answer || res.data.response || fallbackReply(question);
  } catch (error) {
    // 503 / 502 = agent service down → use fallback
    if (error instanceof ApiError && (error.statusCode === 503 || error.statusCode === 502)) {
      return fallbackReply(question);
    }
    // 401 = not logged in (guest) → use fallback
    if (error instanceof ApiError && error.statusCode === 401) {
      return fallbackReply(question);
    }
    return fallbackReply(question);
  }
}
