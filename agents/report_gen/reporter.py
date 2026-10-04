import os
from state import ResearchState
from .prompt import REPORT_GENERATOR_PROMPT


class reporter_agent:

    def __init__(self, llm):
        self.llm = llm

    def report_generator_node(self, state: ResearchState):

        print(f"\n📝 Report Generator Node")
        print(f"   Topic: {state['topic']}")
        print(f"   Research questions: {len(state['research_questions'])}")
        print(f"   Key findings: {len(state['key_findings'])}")
        print(f"   Search results: {len(state['search_results'])}")
        print(f"   Sources tracked: {len(state.get('sources', []))}")

        # Format research questions
        questions_text = "\n".join(
            f"- {q}" for q in state['research_questions']
        )

        # Format key findings
        findings_text = "\n".join(
            f"- {f}" for f in state['key_findings']
        )

        # Format sources for both reference list and context
        sources = state.get("sources", [])
        if sources:
            # Deduplicate by URL
            seen_urls = set()
            unique_sources = []
            for s in sources:
                url = s.get("url", "")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    unique_sources.append(s)
                elif not url:
                    unique_sources.append(s)

            sources_text = "\n".join(
                f"{i+1}. [{s.get('title', 'Untitled')}]({s.get('url', 'No URL')})\n   Query: {s.get('query', '')}\n   Excerpt: {s.get('body', '')[:200]}..."
                for i, s in enumerate(unique_sources)
            )
            print(f"   Unique sources for citations: {len(unique_sources)}")
        else:
            sources_text = "No sources were collected during search (search may have failed)."
            print("   ⚠️  No structured sources available for citations!")

        prompt = REPORT_GENERATOR_PROMPT.format(
            topic=state['topic'],
            questions_text=questions_text,
            findings_text=findings_text,
            sources_text=sources_text,
            sources_count=len(sources)
        )

        print(f"   Invoking LLM to generate full report...")
        response = self.llm.invoke(prompt)
        report = response.content

        print(f"   ✅ Report generated | {len(report)} characters")

        return {
            "final_report": report,
            "status": "report_completed"
        }