import os
from typing import TypedDict, List, Literal, Optional


class ResearchState(TypedDict):
    topic: str
    research_questions: List[str]
    search_queries: List[str]
    search_results: List[str]       # Raw text snippets
    sources: List[dict]             # Full source records: {title, url, body, query}
    key_findings: List[str]
    iteration: int
    max_iterations: int
    quality_score: float
    final_report: str
    status: str