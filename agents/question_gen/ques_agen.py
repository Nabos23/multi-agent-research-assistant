import os
from state import ResearchState
import json
from .prompt import QUESTION_GENERATOR_PROMPT

class question_agent:
    
    def __init__(self, llm):

        self.llm = llm

    def question_generator_node(self, state: ResearchState):
    
        prompt = QUESTION_GENERATOR_PROMPT.format(**state)
        response = self.llm.invoke(prompt)
        questions = response.content.strip().split('\n')
        questions = [q.strip() for q in questions if q.strip()][:3]
    
        all_questions = state.get("research_questions", []) + questions
    
        return {
            "research_questions": all_questions,
            "status": "questions_generated"
        }    