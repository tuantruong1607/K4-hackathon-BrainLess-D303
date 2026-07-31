import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminLayout from "@/layouts/AdminLayout";
import AdminDashboard from "@/pages/AdminDashboard";
import UserManagement from "@/pages/UserManagement";
import QuizManagement from "@/pages/QuizManagement";
import SlideManagement from "@/pages/SlideManagement";

// Configure TanStack Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Redirect bare "/" to "/admin" */}
          <Route path="/" element={<Navigate to="/admin" replace />} />

          {/* Admin shell */}
          <Route path="/admin" element={<AdminLayout />}>
            {/* /admin → Dashboard */}
            <Route index element={<AdminDashboard />} />

            {/* /admin/users */}
            <Route path="users" element={<UserManagement />} />

            {/* /admin/quizzes */}
            <Route path="quizzes" element={<QuizManagement />} />

            {/* /admin/slides */}
            <Route path="slides" element={<SlideManagement />} />
          </Route>

          {/* Catch-all → admin */}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
