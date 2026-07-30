import unittest
from typing import get_type_hints

from agent.app.domain import RetrievedSlide, SlideInput
from agent.app.indexing import RagIndexer
from agent.app.providers import MockChatProvider, MockEmbeddingProvider
from agent.app.services import RagService
from agent.app.stores import MemoryGraphStore, MemoryVectorStore


class RagServiceTests(unittest.TestCase):
    def test_retrieved_slide_score_contract_is_float(self):
        self.assertIs(float, get_type_hints(RetrievedSlide)["score"])

    def setUp(self):
        self.embedding_provider = MockEmbeddingProvider()
        self.vector_store = MemoryVectorStore()
        self.service = RagService(
            RagIndexer(
                self.embedding_provider,
                self.vector_store,
                MemoryGraphStore(),
            ),
            self.embedding_provider,
            self.vector_store,
            MockChatProvider(),
        )
        self.service.build_graph(
            "jtbd-day-01",
            "day01",
            "v1",
            [
                SlideInput(
                    1,
                    "Jobs To Be Done",
                    "Customers hire products to make progress in a situation.",
                    ["JTBD"],
                ),
                SlideInput(
                    2,
                    "Customer interviews",
                    "Interview customers about the situation and desired progress.",
                    ["Interview"],
                ),
                SlideInput(
                    3,
                    "Push and Pull",
                    "Push forces move customers away from the current solution. "
                    "Pull forces attract them to a new solution.",
                    ["Push", "Pull"],
                ),
            ],
        )

    def test_retrieve_ranks_push_slide_first_with_day_filter(self):
        results = self.service.retrieve("Push", day="day01")

        self.assertEqual(3, results[0].chunk.slide_number)
        self.assertEqual("Push and Pull", results[0].chunk.title)
        self.assertEqual("day01", results[0].chunk.day)
        self.assertGreater(results[0].score, 0)

    def test_mock_chat_cites_and_grounds_answer_in_top_slide(self):
        answer = self.service.chat(
            "Push là gì?",
            user_id=1,
            current_day="day01",
            current_slide=3,
        )

        self.assertEqual("mock", answer.provider)
        self.assertEqual(3, answer.sources[0].chunk.slide_number)
        self.assertIn("Push", answer.answer)
        self.assertIn(answer.sources[0].chunk.content, answer.answer)


if __name__ == "__main__":
    unittest.main()
