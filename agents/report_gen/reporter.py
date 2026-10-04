
import os
from state import ResearchState
import json
from .prompt import REPORT_GENERATOR_PROMPT

class reporter_agent:
    
    def __init__(self, llm):

        self.llm = llm

    def report_generator_node(self, state: ResearchState):

        print(f"\n Report Generator Node")
    

        questions_text = "\n".join(state['research_questions'])
        findings_text = "\n".join(state['key_findings'])

        prompt = REPORT_GENERATOR_PROMPT.format(
            **state,
            questions_text=questions_text,
            findings_text=findings_text,
            sources_count=len(state['search_results'])
        )
    
        response = self.llm.invoke(prompt)
        report = response.content
    
    
        return {
            "final_report": report,
            "status": "report_completed"
        }