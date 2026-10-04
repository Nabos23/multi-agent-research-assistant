import os
from state import ResearchState
from ddgs import DDGS


class search_tool:

    def __init__(self, llm=None):
        self.llm = llm

    def search_tool_node(self, state: ResearchState):

        search_results = list(state.get("search_results", []))
        search_queries = list(state.get("search_queries", []))
        sources = list(state.get("sources", []))

        questions = state["research_questions"]
        print(f"\n🔍 Search Tool Node | {len(questions)} research questions to process")

        new_questions = [q for q in questions if q not in search_queries]
        print(f"   → {len(new_questions)} new queries to run (skipping {len(questions) - len(new_questions)} already searched)")

        for question in new_questions:
            print(f"   🔎 Searching: '{question[:80]}{'...' if len(question) > 80 else ''}'")
            try:
                ddgs = DDGS()
                results = list(ddgs.text(question, max_results=4))

                if not results:
                    print(f"      ⚠️  No results returned for this query")
                else:
                    print(f"      ✅ Got {len(results)} results")

                for result in results:
                    title = result.get('title', '').strip()
                    body = result.get('body', '').strip()
                    url = result.get('href', result.get('url', '')).strip()

                    # Add to text snippets for downstream LLM consumption
                    snippet = f"[{title}] ({url})\n{body}"
                    search_results.append(snippet)

                    # Add to structured sources list for citation in final report
                    sources.append({
                        "title": title,
                        "url": url,
                        "body": body[:500],
                        "query": question
                    })
                    print(f"         • {title[:70]} | {url[:60]}")

                search_queries.append(question)

            except Exception as e:
                print(f"      ❌ Search error for '{question[:60]}': {e}")

        print(f"\n   📦 Total search snippets collected: {len(search_results)}")
        print(f"   📚 Total unique sources tracked: {len(sources)}")

        return {
            "search_results": search_results,
            "search_queries": search_queries,
            "sources": sources,
            "iteration": state["iteration"] + 1,
            "status": "search_completed"
        }
