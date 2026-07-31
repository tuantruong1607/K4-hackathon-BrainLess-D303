from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class SlideInput:
    document_id: str
    version: str
    day: str
    slide_number: int
    title: str
    content: str
    concepts: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @property
    def text(self) -> str:
        return self.content

    @property
    def source(self) -> str:
        return self.document_id

    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> "SlideInput":
        return cls(**value)


@dataclass
class SlideChunk:
    document_id: str
    day: str
    version: str
    slide_number: int
    title: str
    content: str
    concepts: list[str] = field(default_factory=list)

    @property
    def id(self) -> str:
        return f"{self.document_id}:{self.version}:{self.slide_number}"

    @property
    def citation(self) -> dict[str, str | int]:
        return {
            "document_id": self.document_id,
            "version": self.version,
            "day": self.day,
            "slide_number": self.slide_number,
            "title": self.title,
        }

    @property
    def text(self) -> str:
        return self.content

    @property
    def source(self) -> str:
        return self.document_id

    @property
    def chunk_index(self) -> int:
        return self.slide_number - 1

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> "SlideChunk":
        return cls(**value)


@dataclass
class RetrievedSlide:
    chunk: SlideChunk
    score: float

    @property
    def citation(self) -> dict[str, str | int]:
        return self.chunk.citation


@dataclass(frozen=True)
class GraphConcept:
    name: str
    slide_ids: tuple[str, ...] = ()


@dataclass(frozen=True)
class RetrievalResult:
    slides: tuple[RetrievedSlide, ...]
    concepts: tuple[GraphConcept, ...]
