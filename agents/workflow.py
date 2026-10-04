import os
from config import llm
from typing import Literal
from langgraph.graph import StateGraph, START, END
from state import ResearchState
from .analyzer.analyzer import analyzer_agent
from .input_processor.input_agen import input_agent
from .question_gen.ques_agen import question_agent
from .report_gen.reporter import reporter_agent
from .search_tool.search_tool import search_tool

def should_continue_research(state: ResearchState) -> Literal["search", "report"]:
    # Check iteration limit
    if state["iteration"] >= state["max_iterations"]:
        return "report"
    # Check quality threshold
    if state["quality_score"] >= 0.8:
        return "report"
    # Check if we have enough findings
    if len(state.get("key_findings", [])) >= 10:
        return "report"
    return "search"


workflow = StateGraph(ResearchState)


analyzer_system       = analyzer_agent(llm=llm)
input_system          = input_agent(llm=llm)
question_system       = question_agent(llm=llm)
reporter_system       = reporter_agent(llm=llm)
search_system         = search_tool(llm=llm) 

workflow.add_node("input_processor", input_system.input_processor_node)
workflow.add_node("question_generator", question_system.question_generator_node)
workflow.add_node("search_tool", search_system.search_tool_node)
workflow.add_node("analyzer", analyzer_system.analyzer_node)
workflow.add_node("report_generator", reporter_system.report_generator_node)


workflow.add_edge(START, "input_processor")
workflow.add_edge("input_processor", "question_generator")
workflow.add_edge("question_generator", "search_tool")
workflow.add_edge("search_tool", "analyzer")
workflow.add_conditional_edges("analyzer", should_continue_research, {"search": "question_generator", "report": "report_generator"})
workflow.add_edge("report_generator", END)


assistant = workflow.compile()