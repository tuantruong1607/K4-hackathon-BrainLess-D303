import unittest

from agent.app.domain import SlideInput
from agent.app.retrieval import build_slide_chunks, rank_chunks


class RetrievalTests(unittest.TestCase):
    def test_filters_by_day_and_ranks_case_insensitive_content_and_concepts(self):
        chunks = build_slide_chunks(
            "course-deck",
            "2026-07-30",
            "v1",
            [
                SlideInput(2, "Prompting", "Write useful prompts", ["guidance"]),
                SlideInput(1, "Retrieval", "Find relevant material", ["semantic search"]),
            ],
        ) + build_slide_chunks(
            "course-deck",
            "2026-07-31",
            "v1",
            [SlideInput(3, "Future", "Semantic search roadmap", ["search"])],
        )

        results = rank_chunks("SEMANTIC search", chunks, day="2026-07-30")

        self.assertEqual([1, 2], [result.chunk.slide_number for result in results])
        self.assertEqual(["2026-07-30", "2026-07-30"], [result.chunk.day for result in results])
        self.assertGreater(results[0].score, 0)

    def test_orders_equal_scores_by_ascending_slide_number_and_respects_limit(self):
        chunks = build_slide_chunks(
            "course-deck",
            "2026-07-30",
            "v1",
            [
                SlideInput(4, "Four", "Alpha", []),
                SlideInput(2, "Two", "Alpha", []),
                SlideInput(3, "Three", "Alpha", []),
            ],
        )

        results = rank_chunks("alpha", chunks, limit=2)

        self.assertEqual([2, 3], [result.chunk.slide_number for result in results])


if __name__ == "__main__":
    unittest.main()
