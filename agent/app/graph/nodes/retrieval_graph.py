from dataclasses import dataclass, field

from app.errors import DependencyUnavailableError
from app.retrieval import HybridRetriever


@dataclass
class RetrievedContext:
    slide_chunks: list[dict] = field(default_factory=list)
    graph_nodes: list[dict] = field(default_factory=list)
    related_nodes: list[dict] = field(default_factory=list)


def retrieval_graph(
    question: str,
    day: str | None = None,
    *,
    document_id: str | None = None,
    limit: int = 5,
    retriever: HybridRetriever | None = None,
) -> RetrievedContext:
    """Compatibility adapter over the runtime-injected canonical retriever."""
    if retriever is None:
        raise DependencyUnavailableError(
            "retrieval_graph requires the Runtime HybridRetriever dependency"
        )
    result = retriever.retrieve(
        question,
        day=day,
        document_id=document_id,
        limit=limit,
    )
    return RetrievedContext(
        slide_chunks=[
            hit.chunk.to_dict()
            | {
                "text": hit.chunk.content,
                "source": hit.chunk.document_id,
                "score": hit.score,
            }
            for hit in result.slides
        ],
        graph_nodes=[
            {"name": concept.name, "slide_ids": list(concept.slide_ids)}
            for concept in result.concepts
        ],
        related_nodes=[],
    )


def format_context(context: RetrievedContext) -> str:
    parts: list[str] = []
    if context.slide_chunks:
        chunks_text = "\n\n".join(
            f"[Nguồn: {chunk.get('source', chunk.get('document_id', ''))}]\n"
            f"{chunk.get('text', chunk.get('content', ''))}"
            for chunk in context.slide_chunks
        )
        parts.append(f"Nội dung slide liên quan:\n{chunks_text}")

    concepts = context.graph_nodes + context.related_nodes
    if concepts:
        concepts_text = "\n".join(
            f"- {node['name']}: {node.get('description', '')}"
            for node in concepts
        )
        parts.append(f"Khái niệm liên quan trong Knowledge Graph:\n{concepts_text}")

    if not parts:
        return "(Không tìm thấy nội dung liên quan trong bài giảng.)"
    return "\n\n".join(parts)
