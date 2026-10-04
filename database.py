# database.py
import sqlite3
import uuid
from datetime import datetime
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "research_sessions.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        # Create sessions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                topic TEXT NOT NULL,
                status TEXT DEFAULT 'created',
                final_report TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Create messages table for memory tracking
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(session_id) REFERENCES sessions(session_id)
            )
        """)
        conn.commit()

def create_session(topic: str = "") -> dict:
    session_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO sessions (session_id, topic, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (session_id, topic, "created", now, now)
        )
        if topic:
            cursor.execute(
                "INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
                (session_id, "user", topic, now)
            )
        conn.commit()
    return {
        "session_id": session_id,
        "topic": topic,
        "status": "created",
        "created_at": now
    }

def get_all_sessions():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT session_id, topic, status, final_report, created_at, updated_at
            FROM sessions
            ORDER BY datetime(created_at) DESC
        """)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

def get_session_by_id(session_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sessions WHERE session_id = ?", (session_id,))
        session_row = cursor.fetchone()
        if not session_row:
            return None
        
        cursor.execute("SELECT role, content, created_at FROM messages WHERE session_id = ? ORDER BY id ASC", (session_id,))
        message_rows = cursor.fetchall()
        
        result = dict(session_row)
        result["messages"] = [dict(m) for m in message_rows]
        return result

def update_session(session_id: str, topic: str = None, status: str = None, final_report: str = None):
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        
        if topic is not None:
            cursor.execute("UPDATE sessions SET topic = ?, updated_at = ? WHERE session_id = ?", (topic, now, session_id))
            cursor.execute("INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)", (session_id, "user", topic, now))
            
        if status is not None:
            cursor.execute("UPDATE sessions SET status = ?, updated_at = ? WHERE session_id = ?", (status, now, session_id))
            
        if final_report is not None:
            cursor.execute("UPDATE sessions SET final_report = ?, updated_at = ? WHERE session_id = ?", (final_report, now, session_id))
            cursor.execute("INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)", (session_id, "assistant", final_report, now))
            
        conn.commit()

def delete_session(session_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        cursor.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
        conn.commit()

# Initialize DB tables on import
init_db()
