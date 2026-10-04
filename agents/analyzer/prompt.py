ANALYZER_PROMPT = """You are a research analyst. Analyze the following search results about the topic: '{topic}'.

Search Results:
{results_text}

Your task:
1. Extract the 5 most important, specific, and factual findings from these search results.
2. Each finding should be a clear, concise statement of fact or insight, directly supported by the search content.
3. Preserve specific numbers, dates, percentages, and named entities wherever present.
4. Do NOT include vague or generic statements. Be precise.

Return exactly 5 findings, one per line, without numbering or bullet points:"""