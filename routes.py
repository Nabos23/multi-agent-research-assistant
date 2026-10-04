import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from agents.workflow import assistant  

router = APIRouter()

@router.get("/research")

def research(topic: str):

    def event_stream():
        
        initial_state = {
            "topic": topic,
            "research_questions": [],
            "search_queries": [],
            "search_results": [],
            "key_findings": [],
            "iteration": 0,
            "max_iterations": 2,
            "quality_score": 0.0,
            "final_report": "",
            "status": "initialized"
        }
        
        for chunk in assistant.stream(initial_state):
            for node_name, node_output in chunk.items():
                status = node_output.get("status", node_name)
                payload = {"node": node_name, "status": status}
                yield f"data: {json.dumps(payload)}\n\n"
                
                if "final_report" in node_output:
                    final_report = node_output["final_report"]

        yield f"data: {json.dumps({'done': True, 'report': final_report})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")