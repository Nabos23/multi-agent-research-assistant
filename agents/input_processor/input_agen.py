import os
from state import ResearchState
import json
from langchain_core.messages import HumanMessage, AIMessage
from .prompt import INPUT_PROCESSOR_PROMPT

class input_agent:
    
    def __init__(self, llm):

        self.llm = llm

    def input_processor_node(self, state: ResearchState):

        prompt = INPUT_PROCESSOR_PROMPT.format(**state)
        
        response = self.llm.invoke(prompt)
        enhanced_topic = response.content.strip()

        new_history = state.get("conversation_history", []) + [
            HumanMessage(content=prompt),
            AIMessage(content=enhanced_topic),
        ]
        
        return {
            "topic": enhanced_topic,
            "status": "topic_processed",
            "conversation_history": new_history,
        }