import os
from state import ResearchState
import json
from .prompt import ANALYZER_PROMPT

class analyzer_agent:
    
    def __init__(self, llm):

        self.llm = llm

    def analyzer_node(self, state: ResearchState):

        print(f"\n Analyzer Node")
    
        if not state["search_results"]:
            return {"key_findings": ["No search results to analyze"], "quality_score": 0.0}
    

        results_text = "\n".join(state["search_results"][:10])  # Limit to prevent token overflow
    
        prompt = ANALYZER_PROMPT.format(**state, results_text=results_text)
    
        response = self.llm.invoke(prompt)
        findings = response.content.strip().split('\n')
        findings = [f.strip() for f in findings if f.strip()][:5]
    
        all_findings = state.get("key_findings", []) + findings
        quality = min(len(all_findings) * 0.2, 1.0)
    
        return {
            "key_findings": all_findings,
            "quality_score": quality,
            "status": "analysis_completed"
        }
















