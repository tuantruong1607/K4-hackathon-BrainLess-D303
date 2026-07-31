import { PrismaClient, Difficulty } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data in correct order (respecting foreign keys)
  console.log("🧹 Cleaning existing data...");
  await prisma.quizResult.deleteMany();
  await prisma.learningProgress.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.slideDocument.deleteMany();
  await prisma.user.deleteMany();
  await prisma.admin.deleteMany();

  // Create admin
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.admin.create({
    data: {
      email: "admin@vlearn.com",
      passwordHash: adminPassword,
      name: "Admin VLearn",
    },
  });
  console.log("✅ Admin created:", admin.email);

  // Create sample users
  const userPassword = await bcrypt.hash("user123", 12);
  const users = [];

  const sampleUsers = [
    { email: "baoanh@vlearn.com", fullname: "Bảo Anh" },
    { email: "minhtu@vlearn.com", fullname: "Minh Tú" },
    { email: "hoangnam@vlearn.com", fullname: "Hoàng Nam" },
  ];

  for (const userData of sampleUsers) {
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        passwordHash: userPassword,
        fullname: userData.fullname,
      },
    });
    users.push(user);
    console.log("✅ User created:", user.email);
  }

  // Create quiz
  const quiz = await prisma.quiz.create({
    data: {
      title: "JTBD Foundations Quiz",
      day: "day01",
      difficulty: Difficulty.MEDIUM,
      isActive: true,
      createdBy: admin.id,
    },
  });
  console.log("✅ Quiz created:", quiz.title);

  // Create questions
  const questions = [
    {
      question: "Trong JTBD, người dùng thực sự 'thuê' sản phẩm để làm gì?",
      optionA: "Sở hữu thêm nhiều tính năng",
      optionB: "Tạo ra một tiến bộ trong hoàn cảnh cụ thể",
      optionC: "So sánh thương hiệu với đối thủ",
      optionD: "Giảm mọi chi phí ngay lập tức",
      correctAnswer: "B",
      difficulty: Difficulty.MEDIUM,
      knowledgeNode: "JTBD_Core",
    },
    {
      question: "Thành phần nào nên xuất hiện trong một job statement?",
      optionA: "Persona, tính năng và giá bán",
      optionB: "Kênh truyền thông, ngân sách và KPI",
      optionC: "Hoàn cảnh, động lực và kết quả mong muốn",
      optionD: "Đối thủ, thị phần và chiến dịch",
      correctAnswer: "C",
      difficulty: Difficulty.MEDIUM,
      knowledgeNode: "Job_Statement",
    },
    {
      question: "Điều gì thường cản người dùng chuyển sang giải pháp mới?",
      optionA: "Thói quen cũ và nỗi lo về giải pháp mới",
      optionB: "Chỉ riêng mức giá",
      optionC: "Thiếu quảng cáo lặp lại",
      optionD: "Không có đủ tính năng nâng cao",
      correctAnswer: "A",
      difficulty: Difficulty.EASY,
      knowledgeNode: "Forces_of_Change",
    },
  ];

  await prisma.quizQuestion.createMany({
    data: questions.map((q) => ({ quizId: quiz.id, ...q })),
  });
  console.log(`✅ ${questions.length} questions created`);

  // Create slide documents
  const slides = [
    { day: "day01", title: "JTBD Foundations", pdfPath: "slides/day01.pdf" },
    {
      day: "day02",
      title: "Phỏng vấn người dùng",
      pdfPath: "slides/day02.pdf",
    },
    { day: "day03", title: "Tổng hợp insight", pdfPath: "slides/day03.pdf" },
  ];

  await prisma.slideDocument.createMany({ data: slides });
  console.log(`✅ ${slides.length} slides created`);

  // Create sample learning progress
  await prisma.learningProgress.create({
    data: {
      userId: users[0].id,
      day: "day01",
      slidePage: 2,
      completed: false,
    },
  });
  console.log("✅ Sample learning progress created");

  // Create sample quiz result
  await prisma.quizResult.create({
    data: {
      userId: users[0].id,
      quizId: quiz.id,
      score: 67,
      correctAnswers: 2,
      wrongAnswers: 1,
      timeSpent: 120,
    },
  });
  console.log("✅ Sample quiz result created");

  console.log("\n🎉 Seeding completed!");
  console.log("\n📋 Login credentials:");
  console.log("   Admin: admin@vlearn.com / admin123");
  console.log("   User:  baoanh@vlearn.com / user123");
  console.log("   User:  minhtu@vlearn.com / user123");
  console.log("   User:  hoangnam@vlearn.com / user123");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
