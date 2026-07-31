import { supabaseAdmin } from "../config/supabase.js";
import { agentService } from "./agent.service.js";
import type {
  CreateQuestionInput,
  UpdateQuestionInput,
  ImportQuestionsInput,
  GenerateQuestionsInput,
  QuestionQueryInput,
} from "../validators/question.validator.js";

export class QuestionService {
  async findAll(query: QuestionQueryInput) {
    const { page, limit, quizId, difficulty } = query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let dbQuery = supabaseAdmin
      .from("quiz_questions")
      .select("id, quiz_id, question, option_a, option_b, option_c, option_d, correct_answer, difficulty, knowledge_node, quiz:quizzes(id, title)", { count: "exact" });

    if (quizId) dbQuery = dbQuery.eq("quiz_id", quizId);
    if (difficulty) dbQuery = dbQuery.eq("difficulty", difficulty);

    const { data: questions, count, error } = await dbQuery
      .order("question", { ascending: true })
      .range(from, to);

    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    const formatted = (questions || []).map((q: any) => ({
      id: q.id,
      quizId: q.quiz_id,
      question: q.question,
      optionA: q.option_a,
      optionB: q.option_b,
      optionC: q.option_c,
      optionD: q.option_d,
      correctAnswer: q.correct_answer,
      difficulty: q.difficulty,
      knowledgeNode: q.knowledge_node,
      quiz: q.quiz ? { id: q.quiz.id, title: q.quiz.title } : null,
    }));

    return { questions: formatted, total: count || 0, page, limit };
  }

  async create(data: CreateQuestionInput) {
    // Verify quiz exists
    const { data: quiz, error: quizError } = await supabaseAdmin
      .from("quizzes")
      .select("id")
      .eq("id", data.quizId)
      .single();

    if (quizError || !quiz) {
      throw Object.assign(new Error("Quiz not found"), { statusCode: 404 });
    }

    const { data: question, error } = await supabaseAdmin
      .from("quiz_questions")
      .insert({
        quiz_id: data.quizId,
        question: data.question,
        option_a: data.optionA,
        option_b: data.optionB,
        option_c: data.optionC,
        option_d: data.optionD,
        correct_answer: data.correctAnswer,
        difficulty: data.difficulty,
        knowledge_node: data.knowledgeNode || null,
      })
      .select()
      .single();

    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    return {
      id: question.id,
      quizId: question.quiz_id,
      question: question.question,
      optionA: question.option_a,
      optionB: question.option_b,
      optionC: question.option_c,
      optionD: question.option_d,
      correctAnswer: question.correct_answer,
      difficulty: question.difficulty,
      knowledgeNode: question.knowledge_node,
    };
  }

  async update(id: string, data: UpdateQuestionInput) {
    const updateData: any = {};
    if (data.question !== undefined) updateData.question = data.question;
    if (data.optionA !== undefined) updateData.option_a = data.optionA;
    if (data.optionB !== undefined) updateData.option_b = data.optionB;
    if (data.optionC !== undefined) updateData.option_c = data.optionC;
    if (data.optionD !== undefined) updateData.option_d = data.optionD;
    if (data.correctAnswer !== undefined) updateData.correct_answer = data.correctAnswer;
    if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
    if (data.knowledgeNode !== undefined) updateData.knowledge_node = data.knowledgeNode;

    const { data: question, error } = await supabaseAdmin
      .from("quiz_questions")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error || !question) {
      throw Object.assign(new Error("Question not found"), { statusCode: 404 });
    }

    return {
      id: question.id,
      quizId: question.quiz_id,
      question: question.question,
      optionA: question.option_a,
      optionB: question.option_b,
      optionC: question.option_c,
      optionD: question.option_d,
      correctAnswer: question.correct_answer,
      difficulty: question.difficulty,
      knowledgeNode: question.knowledge_node,
    };
  }

  async delete(id: string) {
    const { error } = await supabaseAdmin
      .from("quiz_questions")
      .delete()
      .eq("id", id);

    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 404 });
    }
  }

  async importQuestions(data: ImportQuestionsInput) {
    // Verify quiz exists
    const { data: quiz, error: quizError } = await supabaseAdmin
      .from("quizzes")
      .select("id")
      .eq("id", data.quizId)
      .single();

    if (quizError || !quiz) {
      throw Object.assign(new Error("Quiz not found"), { statusCode: 404 });
    }

    if (data.questions.length === 0) {
      return { count: 0 };
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("quiz_questions")
      .insert(
        data.questions.map((q) => ({
          quiz_id: data.quizId,
          question: q.question,
          option_a: q.optionA,
          option_b: q.optionB,
          option_c: q.optionC,
          option_d: q.optionD,
          correct_answer: q.correctAnswer,
          difficulty: q.difficulty,
          knowledge_node: q.knowledgeNode ?? null,
        }))
      )
      .select();

    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    return { count: inserted?.length || 0 };
  }

  async exportQuestions(quizId: string) {
    const { data: quiz, error } = await supabaseAdmin
      .from("quizzes")
      .select(`
        id, title, day,
        questions:quiz_questions(
          question, option_a, option_b, option_c, option_d, correct_answer, difficulty, knowledge_node
        )
      `)
      .eq("id", quizId)
      .single();

    if (error || !quiz) {
      throw Object.assign(new Error("Quiz not found"), { statusCode: 404 });
    }

    const questions = (quiz.questions || []).map((q: any) => ({
      question: q.question,
      optionA: q.option_a,
      optionB: q.option_b,
      optionC: q.option_c,
      optionD: q.option_d,
      correctAnswer: q.correct_answer,
      difficulty: q.difficulty,
      knowledgeNode: q.knowledge_node,
    }));

    return {
      quiz: { id: quiz.id, title: quiz.title, day: quiz.day },
      questions,
    };
  }

  async generateFromAI(data: GenerateQuestionsInput) {
    // Verify quiz exists before calling Agent
    const { data: quiz, error: quizError } = await supabaseAdmin
      .from("quizzes")
      .select("id")
      .eq("id", data.quizId)
      .single();

    if (quizError || !quiz) {
      throw Object.assign(new Error("Quiz not found"), { statusCode: 404 });
    }

    // Call Agent service to generate questions
    const generated = await agentService.generateQuiz(
      data.day,
      data.difficulty.toLowerCase(),
      data.count
    );

    if (!generated.questions || !Array.isArray(generated.questions) || generated.questions.length === 0) {
      throw Object.assign(new Error("AI failed to generate questions"), { statusCode: 502 });
    }

    // Save generated questions to the quiz
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("quiz_questions")
      .insert(
        generated.questions.map((q: any) => ({
          quiz_id: data.quizId,
          question: q.question || q.Question || "",
          option_a: q.optionA || q.option_a || q.options?.[0] || "",
          option_b: q.optionB || q.option_b || q.options?.[1] || "",
          option_c: q.optionC || q.option_c || q.options?.[2] || "",
          option_d: q.optionD || q.option_d || q.options?.[3] || "",
          correct_answer: q.correctAnswer || q.correct_answer || q.answer || "",
          difficulty: data.difficulty,
          knowledge_node: q.knowledgeNode || q.knowledge_node || null,
        }))
      )
      .select();

    if (insertError) {
      throw Object.assign(new Error(insertError.message), { statusCode: 400 });
    }

    return { count: inserted?.length || 0, questions: generated.questions };
  }
}

export const questionService = new QuestionService();
