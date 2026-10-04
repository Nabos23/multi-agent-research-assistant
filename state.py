import os
from typing import TypedDict, List, Literal


class ResearchState(TypedDict):
    topic: str
    research_questions: List[str]
    search_queries: List[str]
    search_results: List[str]
    key_findings: List[str]
    iteration: int
    max_iterations: int
    quality_score: float
    final_report: str
    status: str