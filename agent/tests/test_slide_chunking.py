import unittest

from agent.app.domain import SlideInput
from agent.app.retrieval import build_slide_chunks


class SlideChunkingTests(unittest.TestCase):
    def test_builds_one_chunk_for_each_source_slide_without_merging(self):
        slides = [
            SlideInput(1, "Introduction", "Welcome to the course", ["welcome"]),
            SlideInput(2, "Retrieval", "Search relevant slides", ["search"]),
        ]

        chunks = build_slide_chunks("course-deck", "2026-07-30", "v1", slides)

        self.assertEqual(2, len(chunks))
        self.assertEqual([1, 2], [chunk.slide_number for chunk in chunks])
        self.assertEqual(["Introduction", "Retrieval"], [chunk.title for chunk in chunks])
        self.assertEqual(["course-deck", "course-deck"], [chunk.document_id for chunk in chunks])
        self.assertEqual(["2026-07-30", "2026-07-30"], [chunk.day for chunk in chunks])
        self.assertEqual(["v1", "v1"], [chunk.version for chunk in chunks])

    def test_derives_a_stable_id_from_document_version_and_slide_number(self):
        slide = SlideInput(3, "Agenda", "Topics", ["overview"])

        first, = build_slide_chunks("course-deck", "2026-07-30", "v2", [slide])
        second, = build_slide_chunks("course-deck", "2026-07-31", "v2", [slide])

        self.assertEqual(first.id, second.id)
        self.assertEqual("course-deck:v2:3", first.id)


if __name__ == "__main__":
    unittest.main()
