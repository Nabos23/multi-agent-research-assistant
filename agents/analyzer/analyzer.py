import os
from state import ResearchState
from .prompt import ANALYZER_PROMPT


class analyzer_agent:

    def __init__(self, llm):
        self.llm = llm

    def analyzer_node(self, state: ResearchState):

        print(f"\n📊 Analyzer Node | Iteration {state['iteration']}")

        if not state["search_results"]:
            print("   ⚠️  No search results available to analyze. Returning zero quality.")
            return {
                "key_findings": ["No search results to analyze"],
                "quality_score": 0.0,
                "status": "analysis_completed"
            }

        # Use up to 12 most recent snippets to keep prompt manageable
        snippets = state["search_results"][-12:]
        results_text = "\n\n---\n\n".join(snippets)
        print(f"   Analyzing {len(snippets)} search snippets (of {len(state['search_results'])} total)...")

        prompt = ANALYZER_PROMPT.format(topic=state["topic"], results_text=results_text)

        response = self.llm.invoke(prompt)
        raw_findings = response.content.strip().split('\n')
        findings = [f.strip() for f in raw_findings if f.strip()][:5]

        all_findings = state.get("key_findings", []) + findings
        quality = min(len(all_findings) * 0.15, 1.0)

        print(f"   ✅ Extracted {len(findings)} new findings | Total: {len(all_findings)} | Quality score: {quality:.2f}")
        for f in findings:
            print(f"      • {f[:100]}")

        return {
            "key_findings": all_findings,
            "quality_score": quality,
            "status": "analysis_completed"
        }
