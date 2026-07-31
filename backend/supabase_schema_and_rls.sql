-- ==========================================================================
-- 0. Drop Existing Tables and Types (Clean Reset)
-- ==========================================================================
DROP TABLE IF EXISTS public.learning_progress CASCADE;
DROP TABLE IF EXISTS public.quiz_results CASCADE;
DROP TABLE IF EXISTS public.quiz_questions CASCADE;
DROP TABLE IF EXISTS public.quizzes CASCADE;
DROP TABLE IF EXISTS public.slide_documents CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP TYPE IF EXISTS "Role" CASCADE;
DROP TYPE IF EXISTS "Level" CASCADE;
DROP TYPE IF EXISTS "Difficulty" CASCADE;

-- ==========================================================================
-- 1. Create Enums and Types
-- ==========================================================================
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADMIN');
CREATE TYPE "Level" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- ==========================================================================
-- 2. Create Tables
-- ==========================================================================

-- Users Profile Table (linked to auth.users)
CREATE TABLE public.users (
    id TEXT PRIMARY KEY, -- matches auth.users.id
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL DEFAULT '',
    fullname TEXT NOT NULL,
    role "Role" NOT NULL DEFAULT 'STUDENT',
    level "Level" NOT NULL DEFAULT 'BEGINNER',
    is_banned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Quizzes Table
CREATE TABLE public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    day TEXT NOT NULL,
    difficulty "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    is_active BOOLEAN NOT NULL DEFAULT false,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    created_by TEXT NOT NULL, -- references auth.users.id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Quiz Questions Table
CREATE TABLE public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    difficulty "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    knowledge_node TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Quiz Results Table
CREATE TABLE public.quiz_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    wrong_answers INTEGER NOT NULL,
    time_spent INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Learning Progress Table
CREATE TABLE public.learning_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    day TEXT NOT NULL,
    slide_page INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT false,
    last_access TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, day)
);

-- Slide Documents Table
CREATE TABLE public.slide_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day TEXT NOT NULL,
    title TEXT NOT NULL,
    pdf_path TEXT NOT NULL,
    preview_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================================================
-- 3. Enable Row Level Security (RLS)
-- ==========================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slide_documents ENABLE ROW LEVEL SECURITY;

-- ==========================================================================
-- 4. Define Policies
-- ==========================================================================

-- Profile policies
CREATE POLICY "Users can read own profile" ON public.users FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid()::text = id);
CREATE POLICY "Admins have full access to profiles" ON public.users FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
);

-- Progress policies
CREATE POLICY "Users can read own progress" ON public.learning_progress FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can modify own progress" ON public.learning_progress FOR ALL USING (auth.uid()::text = user_id);
CREATE POLICY "Admins have full access to progress" ON public.learning_progress FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
);

-- Quiz results policies
CREATE POLICY "Users can read own quiz results" ON public.quiz_results FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can submit own quiz results" ON public.quiz_results FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Admins have full access to quiz results" ON public.quiz_results FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
);

-- Quizzes policies
CREATE POLICY "Anyone can read active quizzes" ON public.quizzes FOR SELECT USING (is_active = true OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN');
CREATE POLICY "Admins have full access to quizzes" ON public.quizzes FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
);

-- Quiz questions policies
CREATE POLICY "Anyone can read questions of active quizzes" ON public.quiz_questions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.quizzes WHERE id = quiz_id AND (is_active = true OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN')
    )
);
CREATE POLICY "Admins have full access to questions" ON public.quiz_questions FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
);

-- Slide documents policies
CREATE POLICY "Anyone can read slide documents" ON public.slide_documents FOR SELECT USING (true);
CREATE POLICY "Admins have full access to slide documents" ON public.slide_documents FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
);

-- Enable pgcrypto extension to allow gen_salt and crypt password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================================================
-- 5. Seed Content (Users, Slides, Quizzes, Questions)
-- ==========================================================================

-- Delete mock users from auth.users if they exist (by email to prevent unique constraint violation)
DELETE FROM auth.users WHERE email IN ('admin@vlearn.com', 'baoanh@vlearn.com');

-- A. Insert Mock Admin User into auth.users (password: admin123)
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, recovery_sent_at, last_sign_in_at, 
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
    confirmation_token, email_change, email_change_token_new, recovery_token
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'd0000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'admin@vlearn.com',
    crypt('admin123', gen_salt('bf', 10)),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"fullname":"Admin VLearn","role":"ADMIN"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- B. Insert Mock Student User into auth.users (password: user123)
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, recovery_sent_at, last_sign_in_at, 
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
    confirmation_token, email_change, email_change_token_new, recovery_token
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'd0000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'baoanh@vlearn.com',
    crypt('user123', gen_salt('bf', 10)),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"fullname":"Bảo Anh","role":"STUDENT"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- C. Insert profiles into public.users corresponding to auth.users
INSERT INTO public.users (id, email, password_hash, fullname, role, level, is_banned) VALUES
('d0000000-0000-0000-0000-000000000001', 'admin@vlearn.com', '', 'Admin VLearn', 'ADMIN', 'BEGINNER', false),
('d0000000-0000-0000-0000-000000000002', 'baoanh@vlearn.com', '', 'Bảo Anh', 'STUDENT', 'BEGINNER', false);

-- Insert slides
INSERT INTO public.slide_documents (day, title, pdf_path) VALUES
('day01', 'Nền tảng JTBD', 'slides/day01.pdf'),
('day02', 'Phỏng vấn người dùng', 'slides/day02.pdf'),
('day03', 'Tổng hợp insight', 'slides/day03.pdf');

-- Insert dummy quiz (owned by dummy admin account 'admin_system')
INSERT INTO public.quizzes (id, title, day, difficulty, is_active, created_by) VALUES
('a0000000-0000-0000-0000-000000000001', 'JTBD Foundations Quiz', 'day01', 'MEDIUM', true, 'd0000000-0000-0000-0000-000000000001');

-- Insert quiz questions
INSERT INTO public.quiz_questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer, difficulty, knowledge_node) VALUES
('a0000000-0000-0000-0000-000000000001', 'Trong JTBD, người dùng thực sự ''thuê'' sản phẩm để làm gì?', 'Sở hữu thêm nhiều tính năng', 'Tạo ra một tiến bộ trong hoàn cảnh cụ thể', 'So sánh thương hiệu với đối thủ', 'Giảm mọi chi phí ngay lập tức', 'B', 'MEDIUM', 'JTBD_Core'),
('a0000000-0000-0000-0000-000000000001', 'Thành phần nào nên xuất hiện trong một job statement?', 'Persona, tính năng và giá bán', 'Kênh truyền thông, ngân sách và KPI', 'Hoàn cảnh, động lực và kết quả mong muốn', 'Đối thủ, thị phần và chiến dịch', 'C', 'MEDIUM', 'Job_Statement'),
('a0000000-0000-0000-0000-000000000001', 'Điều gì thường cản người dùng chuyển sang giải pháp mới?', 'Thói quen cũ và nỗi lo về giải pháp mới', 'Chỉ riêng mức giá', 'Thiếu quảng cáo lặp lại', 'Không có đủ tính năng nâng cao', 'A', 'EASY', 'Forces_of_Change');
