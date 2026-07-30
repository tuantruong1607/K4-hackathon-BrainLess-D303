from dataclasses import dataclass


@dataclass
class SlideInput:
    slide_number: int
    title: str
    content: str
    concepts: list[str]


@dataclass
class SlideChunk:
    document_id: str
    day: str
    version: str
    slide_number: int
    title: str
    content: str
    concepts: list[str]

    @property
    def id(self) -> str:
        return f"{self.document_id}:{self.version}:{self.slide_number}"


@dataclass
class RetrievedSlide:
    chunk: SlideChunk
    score: int
