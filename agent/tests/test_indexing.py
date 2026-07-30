import unittest

from agent.app.domain import SlideInput
from agent.app.indexing import RagIndexer
from agent.app.providers import MockEmbeddingProvider
from agent.app.stores import MemoryGraphStore, MemoryVectorStore


class RagIndexerTests(unittest.TestCase):
    def test_indexes_each_slide_once_and_deduplicates_concepts(self):
        vectors = MemoryVectorStore()
        graphs = MemoryGraphStore()
        indexer = RagIndexer(MockEmbeddingProvider(), vectors, graphs)
        slides = [
            SlideInput(1, "Pull", "Pull-based learning", ["Pull", "Push"]),
            SlideInput(2, "Push", "Push-based learning", ["Push"]),
        ]

        result = indexer.index("jtbd-day-01", "day01", "v1", slides)

        self.assertEqual(2, result.indexed_chunks)
        self.assertEqual(("Pull", "Push"), result.concepts)
        self.assertEqual(2, vectors.count)
        self.assertEqual({"Pull", "Push"}, graphs.concepts)


if __name__ == "__main__":
    unittest.main()
