import os
from state import ResearchState
import json
from ddgs import DDGS


class search_tool:
    
    def __init__(self, llm=None):
        self.llm = llm
        pass

    def search_tool_node(self, state: ResearchState):
    
        search_results = state.get("search_results", [])
        search_queries = state.get("search_queries", [])
    
        # Search for each question
        for question in state["research_questions"]:
            if question not in search_queries:
            
                try:
                    ddgs = DDGS()
                    results = ddgs.text(question, max_results=2)
                
                    for result in results:
                        title = result.get('title', '')
                        body = result.get('body', '')
                        search_results.append(f"{title}: {body}")
                
                    search_queries.append(question)
                
                except Exception as e:
                    print(f"  Search error: {e}")
    
        print(f"   Total results: {len(search_results)}")
    
        return {
            "search_results": search_results,
            "search_queries": search_queries,
            "iteration": state["iteration"] + 1,
            "status": "search_completed"
        }

