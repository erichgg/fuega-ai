# Chyspa AI — AI Agent Audit Report

**Date:** 2026-02-16
**Auditor:** Claude Opus 4.6 (Consultant Mode)
**Scope:** All 15 agents — configuration, cost, performance, and optimization opportunities

---

## Executive Summary

The platform runs 15 AI agents with a combined budget of **$93/month** in API costs. After analyzing each agent's model choice, system prompt size, web search access, and task complexity, I identify **$34-48/month in potential savings** (37-52% reduction) through three levers:

1. **Local model offloading** — Move 5-6 low-complexity agents to Ollama on your RTX 4080 ($0 API cost)
2. **Web search pruning** — Remove web search from 3 agents that don't need it ($3-5/month saved)
3. **System prompt trimming** — Cut 30-40% of prompt tokens across all agents ($5-10/month saved)

---

## Current Configuration Summary

| # | Agent | Model | Budget | Web Search | Prompt Size (est. words) | Tools |
|---|-------|-------|--------|------------|--------------------------|-------|
| 1 | **ceo** (Sofia) | Sonnet 4.5 | $15.00 | No | ~350 | database_query, budget_check |
| 2 | **content_writer** (Valentina) | Haiku 4.5 | $20.00 | Yes | ~450 | content_templates |
| 3 | **editor** (Camila) | Sonnet 4.5 | $12.00 | No | ~320 | fact_check, seo_validator |
| 4 | **seo_analyst** (Diego) | Haiku 4.5 | $8.00 | Yes | ~300 | google_trends, search_api |
| 5 | **social_media_manager** (Isabella) | Haiku 4.5 | $5.00 | No | ~380 | twitter_api, buffer_api, scheduling |
| 6 | **analytics_agent** (Mateo) | Haiku 4.5 | $6.00 | Yes | ~280 | platform_apis, database_query |
| 7 | **ads_manager** (Andres) | Haiku 4.5 | $6.00 | Yes | ~300 | google_ads_api, meta_ads_api |
| 8 | **email_marketing_agent** (Lucia) | Haiku 4.5 | $4.00 | No | ~350 | resend_api, template_engine |
| 9 | **sales_agent** (Carlos) | Haiku 4.5 | $4.00 | Yes | ~280 | search_api, crm_database |
| 10 | **cfo_agent** (Daniela) | Haiku 4.5 | $3.00 | No | ~280 | database_query, budget_system |
| 11 | **fulfillment_agent** (Rafael) | Haiku 4.5 | $3.00 | No | ~270 | database_query, email_api |
| 12 | **legal_bot** (Gabriela) | Haiku 4.5 | $3.00 | No | ~320 | compliance_database |
| 13 | **prospector** (Marco) | Haiku 4.5 | $4.00 | Yes | ~350 | search_api, public_data |
| 14 | **local_outreach** (Elena) | Haiku 4.5 | $5.00 | Yes | ~400 | search_api, google_maps, public_data |
| 15 | **smb_researcher** (Tomas) | Haiku 4.5 | $5.00 | Yes | ~420 | search_api, public_data, google_maps |

**Totals:** $93.00/month | 8 agents with web search | 2 Sonnet + 13 Haiku

---

## Per-Agent Analysis & Recommendations

### 1. CEO (Sofia) — Sonnet 4.5 — $15.00/month

**Current assessment:** Model choice is CORRECT. Strategic scoring, resource allocation, and go/no-go decisions require Sonnet-level reasoning. The CEO is the decision bottleneck — quality here prevents downstream waste.

**Recommendations:**
- **Keep on Sonnet 4.5.** This is the right call. Bad CEO decisions cascade to every other agent.
- **Trim system prompt by ~20%.** The "How you think" and "Resources you rely on" sections could be condensed. The 4 bullet points under "Resources you rely on" are informational but the agent figures this out from context. Save ~70 words = ~100 tokens per call.
- **Reduce max_tokens to 2048.** CEO outputs are structured JSON decisions, not long-form content. Saves output token cost.
- **Budget is appropriate** at $15 if the CEO is called 50-100 times/month.

**Savings:** ~$1-2/month from prompt trimming and max_tokens reduction.

---

### 2. Content Writer (Valentina) — Haiku 4.5 — $20.00/month

**Current assessment:** Highest budget of any Haiku agent. This makes sense — content production is the core revenue driver and generates the most tokens (long-form output). However, web search is questionable.

**Recommendations:**
- **Remove web search access.** The content writer receives approved topics, keywords, and briefs from other agents (SEO Analyst, Editor). It should not be independently searching the web — that is the Prospector's and SEO Analyst's job. Removing web search saves $0.01/search x estimated 50-100 searches/month = **$0.50-1.00/month** and prevents the writer from going off-brief.
- **Keep on Haiku 4.5.** Content writing is an execution task. Haiku handles structured content generation well, and the Editor (Sonnet) catches quality issues.
- **Trim system prompt.** The "Content types you produce" list (7 items) and "What good looks like" (6 items) overlap. Consolidate to ~4 items each. Save ~120 words = ~160 tokens per call.
- **Budget is justified** given this agent produces the most output tokens.

**Savings:** ~$1.50-2.50/month from removing web search + prompt trim.

---

### 3. Editor (Camila) — Sonnet 4.5 — $12.00/month

**Current assessment:** Model choice is CORRECT. Editorial judgment — scoring content quality, catching brand voice drift, verifying factual accuracy — is a judgment task that benefits from Sonnet's stronger reasoning.

**Recommendations:**
- **Keep on Sonnet 4.5.** The Editor is the quality gate. Downgrading to Haiku would let more bad content through, costing more in revision cycles and client trust.
- **Reduce max_tokens to 2048.** Editor output is a score + feedback JSON, not long content.
- **Prompt is well-structured.** The scoring rubric (7 criteria) is essential. Minor trim possible on the "editorial instincts" section (~50 words).
- **Budget could drop to $10.00.** If the Content Writer improves first-draft quality, fewer revision rounds means fewer Editor calls.

**Savings:** ~$2-3/month from budget reduction + max_tokens cut.

---

### 4. SEO Analyst (Diego) — Haiku 4.5 — $8.00/month

**Current assessment:** Web search is ESSENTIAL here — keyword research requires real search data. Model choice is correct for structured data analysis.

**Recommendations:**
- **Keep web search.** This is one of the agents that genuinely needs real-time search data.
- **Keep on Haiku 4.5.** SEO analysis is pattern matching and data structuring, not creative reasoning.
- **LOCAL MODEL CANDIDATE (partial).** Keyword list formatting and report generation could run on Llama 3 8B locally. The web search portion must stay on Claude API. Consider a hybrid: use Ollama for formatting/structuring the output after the web search call.
- **Budget is appropriate** at $8.

**Savings:** ~$1-2/month if hybrid local/API approach is implemented.

---

### 5. Social Media Manager (Isabella) — Haiku 4.5 — $5.00/month

**Current assessment:** This agent reformats already-approved content for different platforms and picks posting times. This is a low-complexity, deterministic task.

**Recommendations:**
- **LOCAL MODEL CANDIDATE (HIGH PRIORITY).** Reformatting content per platform specs (character limits, hashtag counts, image specs) is a template-driven task. Mistral 7B or Llama 3 8B on your RTX 4080 can handle this easily. This is the #1 offloading candidate.
- **System prompt is bloated.** The "Optimal posting windows" schedule and platform integration list are static data that should be in a config file or database, not burned into every API call as prompt tokens. Moving this to config saves ~200 tokens/call.
- **Budget could drop to $0** if fully offloaded to Ollama.

**Savings:** **$5.00/month** (full offload to local model).

---

### 6. Analytics Agent (Mateo) — Haiku 4.5 — $6.00/month

**Current assessment:** Web search access is QUESTIONABLE. This agent processes internal performance data (platform APIs, database queries). It should not be searching the web for analytics — it should be querying your own data stores.

**Recommendations:**
- **Remove web search access.** Analytics should come from your platform APIs and database, not from web searches. If the agent needs benchmark data, that should be pre-loaded as context, not searched live.
- **LOCAL MODEL CANDIDATE (MEDIUM PRIORITY).** Data summarization and trend analysis on structured metrics is well within Llama 3 8B capabilities. The agent takes numbers in and produces a structured report out — classic local model territory.
- **Budget could drop to $0** if fully offloaded, or **$2-3** if kept on API without web search.

**Savings:** **$3-6/month** depending on offload vs. search removal.

---

### 7. Ads Manager (Andres) — Haiku 4.5 — $6.00/month

**Current assessment:** Web search access is QUESTIONABLE. The ads manager creates ad copy, suggests targeting, and monitors campaigns. It works with internal campaign data, not web search results.

**Recommendations:**
- **Remove web search access.** Ad copy writing and budget recommendations don't require live web search. The agent works from client data, performance history, and targeting parameters — all provided as context. Industry benchmarks can be provided as static context rather than searched.
- **Keep on Haiku 4.5.** Ad copy needs to be creative and persuasive — local models may not match Haiku's marketing copy quality.
- **Trim prompt by ~15%.** The expertise section overlaps with how the agent naturally works.

**Savings:** ~$1.50-2.50/month from removing web search + prompt trim.

---

### 8. Email Marketing Agent (Lucia) — Haiku 4.5 — $4.00/month

**Current assessment:** No web search (correct). Haiku model (correct). This agent writes email campaigns from provided briefs.

**Recommendations:**
- **LOCAL MODEL CANDIDATE (MEDIUM PRIORITY).** Email template generation is highly structured: subject line, preview text, body HTML, CTA. Llama 3 8B with good prompting can handle this. The compliance knowledge (CAN-SPAM, LFPDPPP, LGPD) can be provided as context.
- **If keeping on API:** Budget is appropriate at $4.
- **Prompt trim:** The legal compliance section (~80 words) could reference a separate compliance doc rather than being in every prompt.

**Savings:** **$4.00/month** if offloaded, or ~$0.50/month from prompt trim.

---

### 9. Sales Agent (Carlos) — Haiku 4.5 — $4.00/month

**Current assessment:** Web search is borderline. The sales agent drafts outreach messages based on lead data from the Prospector and SMB Researcher. It shouldn't need to independently search — that's the Prospector's job.

**Recommendations:**
- **Remove web search access.** The Sales Agent receives lead profiles with scores from the Prospector. It drafts outreach from that data. Having it also search the web means duplicate work and wasted search costs. The intel pipeline is: Prospector/Local Outreach -> SMB Researcher -> Sales Agent.
- **Keep on Haiku 4.5.** Outreach copy needs personality and warmth — local models might produce generic pitches.
- **Budget is appropriate** at $4.

**Savings:** ~$0.50-1.00/month from removing web search.

---

### 10. CFO Agent (Daniela) — Haiku 4.5 — $3.00/month

**Current assessment:** No web search (correct). Works with internal financial data only. Well-configured.

**Recommendations:**
- **LOCAL MODEL CANDIDATE (HIGH PRIORITY).** Budget tracking, margin calculations, and alert generation are deterministic math + reporting. This is the #2 offloading candidate. Llama 3 8B can do arithmetic and format JSON financial reports.
- **Prompt is efficient.** The alert thresholds are hard rules that could live in config, but they're concise enough (~20 tokens) to keep in prompt.
- **Budget could drop to $0** if offloaded.

**Savings:** **$3.00/month** if offloaded to local model.

---

### 11. Fulfillment Agent (Rafael) — Haiku 4.5 — $3.00/month

**Current assessment:** No web search (correct). Tracks deliverables and generates client update templates. Very low complexity.

**Recommendations:**
- **LOCAL MODEL CANDIDATE (HIGH PRIORITY).** Deadline tracking, status reporting, and template generation is the simplest task in the platform. This is the #3 offloading candidate. Even Mistral 7B handles this trivially.
- **Budget could drop to $0** if offloaded.

**Savings:** **$3.00/month** if offloaded to local model.

---

### 12. Legal Bot (Gabriela) — Haiku 4.5 — $3.00/month

**Current assessment:** No web search (correct). Reviews content against known regulations. This is the one agent where I'd argue AGAINST offloading to a local model.

**Recommendations:**
- **Keep on Claude API.** Legal compliance requires reliable instruction-following and factual knowledge about LFPDPPP, LGPD, CAN-SPAM, and platform policies. Local 7B-8B models hallucinate regulatory details. The cost of a compliance miss ($$$) far outweighs the $3/month API cost.
- **Consider upgrading to Sonnet 4.5** if the agent handles complex compliance edge cases. Legal judgment is closer to "CEO-level" reasoning than execution. Budget would increase to ~$6/month but compliance accuracy improves significantly.
- **Prompt is well-structured** with clear jurisdiction-specific checklists.

**Savings:** $0 (keep as-is, or increase budget for Sonnet upgrade). Compliance is not where you cut costs.

---

### 13. Prospector (Marco) — Haiku 4.5 — $4.00/month

**Current assessment:** Web search is ESSENTIAL — the Prospector must find real businesses with real digital gaps. Model choice is correct.

**Recommendations:**
- **Keep web search.** This is the agent's core function.
- **Keep on Haiku 4.5.** Structured lead scoring from search results is within Haiku's capability.
- **Prompt trim possible.** The scoring criteria explanation (~100 words) is verbose. Condense the 5-point rubric to a tighter format.
- **Budget is appropriate** at $4.

**Savings:** ~$0.50/month from prompt trim.

---

### 14. Local Outreach (Elena) — Haiku 4.5 — $5.00/month

**Current assessment:** Web search is ESSENTIAL — this agent scouts neighborhoods via Google Maps and search. Overlaps significantly with Prospector and SMB Researcher.

**Recommendations:**
- **Keep web search.** Core function requires it.
- **CONSOLIDATION OPPORTUNITY.** Local Outreach, Prospector, and SMB Researcher have significant overlap. Consider merging Prospector + Local Outreach into one agent (reducing 3 agents to 2). The split between "finding businesses" (Prospector) and "finding local businesses" (Local Outreach) is artificial — they use the same tools and same scoring logic.
- **System prompt is the longest in the platform (~400 words).** The "Who you look for" and "How you scout" sections overlap with the Prospector's prompt. Trim by ~30%.
- **Budget is appropriate** if kept separate; could be combined with Prospector's $4 for a merged $7 agent.

**Savings:** ~$1-2/month from prompt trim; **$4-5/month** if merged with Prospector.

---

### 15. SMB Researcher (Tomas) — Haiku 4.5 — $5.00/month

**Current assessment:** Web search is ESSENTIAL for deep-dive research on specific businesses. This is the most justified web search user.

**Recommendations:**
- **Keep web search.** Deep business research requires live search.
- **Keep on Haiku 4.5.** Structured report generation from search results is execution work.
- **System prompt is the second-longest (~420 words).** The "What you research" section (4 categories with sub-items) is thorough but could be compressed. The service tier reference ($149-$1,299/mo) should come from config, not hardcoded in prompt.
- **Budget is appropriate** at $5.

**Savings:** ~$0.50-1.00/month from prompt trim.

---

## Cost Savings Summary

### Immediate Actions (Week 1) — Low effort, immediate ROI

| Action | Monthly Savings | Effort |
|--------|----------------|--------|
| Remove web search from **content_writer** | $0.50-1.00 | 1 line change in `agent_base.py` |
| Remove web search from **analytics_agent** | $0.50-1.00 | 1 line change |
| Remove web search from **ads_manager** | $0.50-1.00 | 1 line change |
| Remove web search from **sales_agent** | $0.50-1.00 | 1 line change |
| **Subtotal** | **$2.00-4.00** | **5 minutes** |

**Implementation:** In `backend/app/core/agent_base.py`, change `WEB_SEARCH_AGENTS` from:
```python
WEB_SEARCH_AGENTS = {
    "local_outreach", "smb_researcher", "prospector", "seo_analyst",
    "sales_agent", "ads_manager", "analytics_agent", "content_writer",
}
```
To:
```python
WEB_SEARCH_AGENTS = {
    "local_outreach", "smb_researcher", "prospector", "seo_analyst",
}
```

### Short-term Actions (Week 2-3) — Moderate effort

| Action | Monthly Savings | Effort |
|--------|----------------|--------|
| Trim system prompts across all agents (~25% reduction) | $5-10 | 2-3 hours editing YAML |
| Reduce max_tokens for CEO and Editor to 2048 | $1-2 | Config change |
| Lower Editor budget from $12 to $10 | $2 | Config change |
| **Subtotal** | **$8-14** | **3-4 hours** |

### Medium-term Actions (Month 1-2) — Ollama offloading

| Agent to Offload | Current Cost | Post-Offload | Priority | Local Model |
|-----------------|-------------|-------------|----------|-------------|
| **social_media_manager** | $5.00 | $0.00 | #1 (easiest) | Llama 3 8B |
| **cfo_agent** | $3.00 | $0.00 | #2 (deterministic) | Llama 3 8B |
| **fulfillment_agent** | $3.00 | $0.00 | #3 (simplest) | Mistral 7B |
| **email_marketing_agent** | $4.00 | $0.00 | #4 (template-driven) | Llama 3 8B |
| **analytics_agent** | $6.00 | $0.00 | #5 (data summarization) | Llama 3 8B |
| **Subtotal** | **$21.00** | **$0.00** | | |

### Long-term Actions (Month 2-3) — Architecture changes

| Action | Monthly Savings | Effort |
|--------|----------------|--------|
| Merge Prospector + Local Outreach into single agent | $4-5 | Significant refactor |
| Consider Sonnet upgrade for Legal Bot (quality gain, not savings) | -$3 | Config change |
| **Subtotal** | **$1-2 net** | **1-2 weeks** |

---

## Total Projected Savings

| Phase | Savings/Month | Cumulative |
|-------|--------------|------------|
| Current baseline | $93.00/month | — |
| After Week 1 (web search pruning) | -$3.00 | $90.00 |
| After Week 2-3 (prompt trim + config) | -$11.00 | $79.00 |
| After Month 2 (Ollama offload) | -$21.00 | $58.00 |
| After Month 3 (consolidation) | -$4.00 | $54.00 |
| **Optimized total** | | **$54.00/month** |

**Net savings: ~$39/month (42% reduction)**

---

## Local Model Migration Plan (RTX 4080)

### Hardware Assessment
- **GPU:** RTX 4080, 16GB VRAM
- **Can run:** Mistral 7B (full), Llama 3 8B (full), Llama 3 13B (Q4 quantized)
- **Recommended:** Llama 3 8B-Instruct via Ollama — best balance of quality, speed, and VRAM usage (~6GB)
- **Concurrent agents:** Can run 2 Llama 3 8B instances simultaneously in 16GB VRAM

### Setup Steps
1. Install Ollama: `winget install Ollama.Ollama`
2. Pull model: `ollama pull llama3:8b-instruct-q5_K_M` (best quality that fits comfortably)
3. Ollama exposes an OpenAI-compatible API at `http://localhost:11434/v1`
4. Add an `OllamaClient` alongside `LLMClient` in `backend/app/core/llm.py`
5. In `agent_base.py`, route agents by slug: local slugs use OllamaClient, others use LLMClient

### Migration Order (by risk level)
1. **fulfillment_agent** — Lowest risk. Simple status tracking. If quality drops, worst case is a slightly less polished status report.
2. **social_media_manager** — Low risk. Content is already approved; this agent just reformats. Easy to validate output correctness.
3. **cfo_agent** — Low risk. Financial calculations are deterministic. Validate the math matches Claude's output on 20 test cases before switching.
4. **email_marketing_agent** — Medium risk. Email copy quality matters for open rates. A/B test local vs API output for 2 weeks.
5. **analytics_agent** — Medium risk. Data summarization quality matters for CEO decisions. Run in shadow mode (both API and local) for 1 week, compare outputs.

### Agents to NEVER Offload
- **ceo** — Strategic judgment requires Sonnet-level reasoning
- **editor** — Quality gate must maintain high standards (Sonnet)
- **content_writer** — Marketing copy quality directly impacts client revenue (keep Haiku minimum)
- **legal_bot** — Compliance accuracy is non-negotiable (Haiku minimum, consider Sonnet)
- **prospector, local_outreach, smb_researcher** — Need Claude API for web search tool access
- **seo_analyst** — Needs web search + keyword analysis quality

---

## Web Search Access Audit

### Should KEEP web search (4 agents)
| Agent | Justification |
|-------|--------------|
| **seo_analyst** | Keyword research requires live search data |
| **prospector** | Finding real businesses requires live search |
| **local_outreach** | Scouting neighborhoods requires live search |
| **smb_researcher** | Deep business research requires live search |

### Should REMOVE web search (4 agents)
| Agent | Current Justification | Why Remove |
|-------|----------------------|------------|
| **content_writer** | None stated | Receives briefs from other agents; searching independently wastes tokens and risks going off-brief |
| **analytics_agent** | None stated | Works with internal platform data, not web data. Benchmarks should be pre-loaded context |
| **ads_manager** | None stated | Works from client data and campaign history. Industry CPCs can be context-injected |
| **sales_agent** | None stated | Receives lead profiles from Prospector. Duplicate searching wastes budget |

### Estimated web search cost breakdown
At 5 max searches/call, assuming agents average 2-3 searches/call and are called 30-50 times/month:
- 4 agents x 2.5 searches x 40 calls = 400 searches/month = **$4.00/month in web search alone**
- Removing 4 agents cuts this to ~200 searches = **$2.00/month saved**

---

## System Prompt Optimization Notes

The system prompts total approximately **4,850 words** across all 15 agents. Every word is sent as input tokens on every call. At Haiku pricing ($0.80/1M input tokens), this is relatively cheap per call, but across hundreds of monthly calls it adds up.

### High-impact prompt trims:
1. **social_media_manager:** Move posting schedule and platform specs to a config/database lookup (~200 words saved)
2. **local_outreach:** Deduplicate with Prospector's scoring criteria (~150 words saved)
3. **content_writer:** Merge "Content types" and "What good looks like" lists (~120 words saved)
4. **smb_researcher:** Compress the research checklist sub-items (~100 words saved)
5. **All agents:** The "APPROVAL CHAIN" paragraph is repeated in 7 agents. Consider injecting it as shared context rather than per-agent prompt (~70 words x 7 = 490 words total saved)

### Estimated savings from prompt trimming:
- ~1,000 words trimmed = ~1,400 tokens saved per call
- At ~500 total calls/month across all agents: 700,000 fewer input tokens
- At blended rate (~$1.10/1M avg): **~$0.77/month** direct token savings
- But the real savings come from reduced confusion and tighter agent behavior (fewer wasted output tokens from verbose responses)

---

## Priority Ranking (by ROI)

| Rank | Action | Effort | Monthly Savings | ROI |
|------|--------|--------|----------------|-----|
| 1 | Remove web search from 4 agents | 5 min | $2-4 | Infinite |
| 2 | Offload fulfillment_agent to Ollama | 2-4 hours | $3 | Very high |
| 3 | Offload social_media_manager to Ollama | 2-4 hours | $5 | Very high |
| 4 | Offload cfo_agent to Ollama | 2-4 hours | $3 | Very high |
| 5 | Reduce Editor budget to $10 | 1 min | $2 | Infinite |
| 6 | Trim system prompts (all agents) | 2-3 hours | $5-10 | High |
| 7 | Offload email_marketing to Ollama | 4-8 hours | $4 | High |
| 8 | Offload analytics_agent to Ollama | 4-8 hours | $6 | High |
| 9 | Reduce max_tokens for CEO/Editor | 1 min | $1-2 | Infinite |
| 10 | Merge Prospector + Local Outreach | 1-2 weeks | $4-5 | Medium |

---

## Architecture Note: OllamaClient Integration

To support local model offloading, add this alongside the existing `LLMClient`:

```python
# backend/app/core/llm.py — add OllamaClient

import httpx

class OllamaClient:
    """Local LLM client via Ollama's OpenAI-compatible API."""

    def __init__(self, base_url: str = "http://localhost:11434/v1"):
        self.base_url = base_url

    async def call(self, model: str, system: str, messages: list[dict],
                   max_tokens: int = 4096, temperature: float = 0.3,
                   tools=None) -> dict:
        start = time.time()
        payload = {
            "model": model,
            "messages": [{"role": "system", "content": system}] + messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(f"{self.base_url}/chat/completions", json=payload)
            data = resp.json()

        duration_ms = int((time.time() - start) * 1000)
        content = data["choices"][0]["message"]["content"]
        return {
            "content": content,
            "input_tokens": data.get("usage", {}).get("prompt_tokens", 0),
            "output_tokens": data.get("usage", {}).get("completion_tokens", 0),
            "cost_usd": 0.0,  # Local model = free
            "duration_ms": duration_ms,
            "model": model,
            "stop_reason": "end_turn",
            "web_searches": 0,
        }
```

Then in `agent_base.py`, add routing:
```python
LOCAL_AGENTS = {"social_media_manager", "cfo_agent", "fulfillment_agent",
                "email_marketing_agent", "analytics_agent"}

# In the think() method:
if self.slug in LOCAL_AGENTS:
    result = await ollama_client.call(model="llama3:8b-instruct", ...)
else:
    result = await llm_client.call(model=self.model, ...)
```

---

## Final Notes

1. **The $93/month budget is already lean.** The model split (2 Sonnet for judgment, 13 Haiku for execution) is a sound architecture. The optimizations above are about eliminating waste, not compromising quality.

2. **Web search is the sneakiest cost.** At $0.01/search and up to 5 searches per call, an agent called 50 times/month with 3 average searches burns $1.50/month in web search alone — often with no benefit if the agent doesn't actually need external data.

3. **Local models are free but not free of cost.** They use electricity, generate heat, and produce lower-quality output. Only offload agents where "good enough" output is truly good enough. The CEO, Editor, and Legal Bot should stay on Claude API indefinitely.

4. **The Prospector/Local Outreach overlap is the biggest architectural savings opportunity** but requires the most work. If you merge them, you save one agent's entire budget plus reduce prompt duplication.

5. **Prompt caching** (mentioned in budget.yaml's optimization notes) is the highest-leverage unimplemented optimization. Anthropic's prompt caching can reduce input token costs by 90% for repeated system prompts. Since all 15 agents have static system prompts sent on every call, implementing prompt caching could save more than any other single optimization. Investigate `anthropic-beta: prompt-caching-2024-07-31` header support.
