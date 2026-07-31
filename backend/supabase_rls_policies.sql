-- SQL Script to enable Row Level Security (RLS) and define access policies for VLearn on Supabase.
-- Copy and run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/gimnlxrzpzpfbpiuobez/sql/new)

--------------------------------------------------
-- 1. Enable RLS on all tables
--------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slide_documents ENABLE ROW LEVEL SECURITY;

--------------------------------------------------
-- 2. Drop existing policies if any to avoid errors
--------------------------------------------------
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins have full access to users" ON public.users;

DROP POLICY IF EXISTS "Users can read own progress" ON public.learning_progress;
DROP POLICY IF EXISTS "Users can modify own progress" ON public.learning_progress;
DROP POLICY IF EXISTS "Admins have full access to progress" ON public.learning_progress;

DROP POLICY IF EXISTS "Users can read own quiz results" ON public.quiz_results;
DROP POLICY IF EXISTS "Users can submit own quiz results" ON public.quiz_results;
DROP POLICY IF EXISTS "Admins have full access to quiz results" ON public.quiz_results;

DROP POLICY IF EXISTS "Anyone can read active quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Admins have full access to quizzes" ON public.quizzes;

DROP POLICY IF EXISTS "Anyone can read questions of active quizzes" ON public.quiz_questions;
DROP POLICY IF EXISTS "Admins have full access to questions" ON public.quiz_questions;

DROP POLICY IF EXISTS "Anyone can read slide documents" ON public.slide_documents;
DROP POLICY IF EXISTS "Admins have full access to slide documents" ON public.slide_documents;

--------------------------------------------------
-- 3. Define policies for Users table
--------------------------------------------------
-- Students can only view their own profile
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (auth.uid()::text = id);

-- Students can only update their own profile fields
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid()::text = id);

-- Admins bypass restrictions (can view and delete any user profile)
CREATE POLICY "Admins have full access to users" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

--------------------------------------------------
-- 4. Define policies for Learning Progress table
--------------------------------------------------
-- Students can only select/insert/update their own learning progress
CREATE POLICY "Users can read own progress" ON public.learning_progress
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can modify own progress" ON public.learning_progress
  FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Admins have full access to progress" ON public.learning_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

--------------------------------------------------
-- 5. Define policies for Quiz Results table
--------------------------------------------------
-- Students can view their own quiz results
CREATE POLICY "Users can read own quiz results" ON public.quiz_results
  FOR SELECT USING (auth.uid()::text = user_id);

-- Students can insert their own quiz result
CREATE POLICY "Users can submit own quiz results" ON public.quiz_results
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Admins have full access to quiz results" ON public.quiz_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

--------------------------------------------------
-- 6. Define policies for Quizzes table
--------------------------------------------------
-- Anyone authenticated can view active quizzes
CREATE POLICY "Anyone can read active quizzes" ON public.quizzes
  FOR SELECT USING (is_active = true OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'ADMIN'
  ));

CREATE POLICY "Admins have full access to quizzes" ON public.quizzes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

--------------------------------------------------
-- 7. Define policies for Quiz Questions table
--------------------------------------------------
-- Anyone authenticated can read questions for active quizzes (correct_answer hidden via API / client select)
CREATE POLICY "Anyone can read questions of active quizzes" ON public.quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quizzes WHERE id = quiz_id AND (is_active = true OR EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'ADMIN'
      ))
    )
  );

CREATE POLICY "Admins have full access to questions" ON public.quiz_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

--------------------------------------------------
-- 8. Define policies for Slide Documents table
--------------------------------------------------
-- Anyone authenticated can read slide documents
CREATE POLICY "Anyone can read slide documents" ON public.slide_documents
  FOR SELECT USING (true);

CREATE POLICY "Admins have full access to slide documents" ON public.slide_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );
