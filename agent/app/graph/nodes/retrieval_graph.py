from dataclasses import dataclass, field

from app.knowledge import neo4j_client, vector_store


@dataclass
class RetrievedContext:
    slide_chunks: list[dict] = field(default_factory=list)
    graph_nodes: list[dict] = field(default_factory=list)
    related_nodes: list[dict] = field(default_factory=list)


def retrieval_graph(question: str, day: str | None = None) -> RetrievedContext:
    slide_chunks = vector_store.search(question, day=day)

    graph_nodes = neo4j_client.find_nodes_by_keyword(question)
    related_nodes: list[dict] = []
    seen_names = {node["name"] for node in graph_nodes}
    for node in graph_nodes:
        for related in neo4j_client.get_related(node["name"]):
            if related["name"] not in seen_names:
                related_nodes.append(related)
                seen_names.add(related["name"])

    return RetrievedContext(
        slide_chunks=slide_chunks,
        graph_nodes=graph_nodes,
        related_nodes=related_nodes,
    )


def format_context(context: RetrievedContext) -> str:
    parts: list[str] = []

    if context.slide_chunks:
        chunks_text = "\n\n".join(
            f"[Nguồn: {chunk['source']}]\n{chunk['text']}" for chunk in context.slide_chunks
        )
        parts.append(f"Nội dung slide liên quan:\n{chunks_text}")

    concepts = context.graph_nodes + context.related_nodes
    if concepts:
        concepts_text = "\n".join(f"- {node['name']}: {node['description']}" for node in concepts)
        parts.append(f"Khái niệm liên quan trong Knowledge Graph:\n{concepts_text}")

    if not parts:
        return "(Không tìm thấy nội dung liên quan trong bài giảng.)"

    return "\n\n".join(parts)
