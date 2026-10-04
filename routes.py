import json
from typing import Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agents.workflow import assistant  
import database as db

router = APIRouter()

class CreateSessionRequest(BaseModel):
    topic: Optional[str] = ""

@router.post("/sessions")
def create_session_endpoint(req: CreateSessionRequest = None):
    topic = req.topic if req else ""
    session = db.create_session(topic=topic)
    return session

@router.get("/sessions")
def list_sessions():
    return db.get_all_sessions()

@router.get("/sessions/{session_id}")
def get_session(session_id: str):
    session = db.get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.delete("/sessions/{session_id}")
def delete_session_endpoint(session_id: str):
    db.delete_session(session_id)
    return {"status": "success", "message": "Session deleted"}

@router.get("/research")
def research(topic: str, session_id: Optional[str] = None):
    # Ensure a session exists in SQLite database
    if not session_id or not db.get_session_by_id(session_id):
        session = db.create_session(topic=topic)
        session_id = session["session_id"]
    else:
        db.update_session(session_id, topic=topic, status="running")

    def event_stream():
        final_report = ""
        initial_state = {
            "topic": topic,
            "research_questions": [],
            "search_queries": [],
            "search_results": [],
            "sources": [],
            "key_findings": [],
            "iteration": 0,
            "max_iterations": 2,
            "quality_score": 0.0,
            "final_report": "",
            "status": "initialized"
        }
        
        # Send session_id first event
        yield f"data: {json.dumps({'session_id': session_id, 'status': 'session_started'})}\n\n"
        
        for chunk in assistant.stream(initial_state):
            for node_name, node_output in chunk.items():
                status = node_output.get("status", node_name)
                payload = {"node": node_name, "status": status, "session_id": session_id}
                yield f"data: {json.dumps(payload)}\n\n"
                
                if "final_report" in node_output:
                    final_report = node_output["final_report"]

        # Persist final report and completed status in DB
        db.update_session(session_id, status="completed", final_report=final_report)
        yield f"data: {json.dumps({'done': True, 'session_id': session_id, 'report': final_report})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")