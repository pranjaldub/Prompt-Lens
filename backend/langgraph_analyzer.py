"""LangGraph multi-agent prompt analyzer.

Ten specialised agents run in parallel — each scores one dimension and returns
a diagnosis + recommendation grounded in the actual prompt text. A final
aggregation node fills category / failure_risks / suggestions / optimized rewrite
(via HF if available, otherwise via the deterministic heuristic).

The graph is intentionally simple: START fans out to N metric nodes, all of them
fan into a single aggregate node, which returns the merged result.
"""
from __future__ import annotations

import asyncio
import json
import logging
import operator
import os
import re
import time
from typing import Annotated, Any, Callable, Optional, TypedDict

from huggingface_hub import InferenceClient
from huggingface_hub.errors import HfHubHTTPError
from langgraph.graph import END, START, StateGraph

logger = logging.getLogger("promptlens.langgraph")


# ---------- shared HF client ---------------------------------------------

_hf_client: Optional[InferenceClient] = None
_HF_TOKEN = os.environ.get("HF_API_TOKEN", "").strip()


def _client() -> Optional[InferenceClient]:
    global _hf_client
    if not _HF_TOKEN:
        return None
    if _hf_client is None:
        _hf_client = InferenceClient(api_key=_HF_TOKEN, timeout=8)
    return _hf_client


def _extract_json(text: str) -> Optional[dict]:
    if not text:
        return None
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```$", "", text)
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        return json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None

'''
def _call_hf(system: str, user: str, model_id: str, max_tokens: int = 320) -> Optional[dict]:
    c = _client()
    if c is None:
        return None
    try:
        resp = c.chat_completion(
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            model=model_id,
            max_tokens=max_tokens,
            temperature=0.2,
        )
        content = resp.choices[0].message.content if resp and resp.choices else ""
        return _extract_json(content)
    except HfHubHTTPError as e:
        logger.debug("HF metric-agent HTTP error: %s", e)
        return None
    except Exception as e:  # noqa: BLE001
        logger.debug("HF metric-agent error: %s", e)
        return None
'''

def _call_llm(system: str, user: str, max_tokens: int = 320) -> Optional[dict]:
    """Unified LLM call from server.py"""
    from server import call_llm
    return call_llm(system, user, max_tokens=max_tokens, temperature=0.2)

# ---------- metric spec ---------------------------------------------------

METRIC_SPECS = {
    "clarity": {
        "label": "Clarity",
        "higher_is_better": True,
        "focus": "How unambiguous and direct the prompt is. Consider sentence structure, verb specificity, and absence of vague language.",
    },
    "specificity": {
        "label": "Specificity",
        "higher_is_better": True,
        "focus": "Whether the prompt defines the task precisely: examples, constraints, named entities, quantifiable requirements.",
    },
    "ambiguity": {
        "label": "Ambiguity",
        "higher_is_better": False,
        "focus": "Density of vague terms and orphan pronouns; 0 = no ambiguity, 100 = wildly ambiguous.",
    },
    "context_score": {
        "label": "Context",
        "higher_is_better": True,
        "focus": "Background provided: role/persona, domain context, prior conversation, relevant facts.",
    },
    "instruction_quality": {
        "label": "Instructions",
        "higher_is_better": True,
        "focus": "Directive clarity: action verbs, output format specification, step-by-step structure, absence of contradictions.",
    },
    "complexity": {
        "label": "Complexity",
        "higher_is_better": False,
        "focus": "Cognitive load: word count, nested instructions, jargon density, multi-step requirements. Higher = more complex.",
    },
    "readability": {
        "label": "Readability",
        "higher_is_better": True,
        "focus": "How easy the prompt is to read (sentence length, vocabulary, structural clarity). Inverse of complexity.",
    },
    "predicted_success_rate": {
        "label": "Success Rate",
        "higher_is_better": True,
        "focus": "Estimated probability a well-aligned LLM produces a satisfactory response on the first attempt.",
    },
    "avg_response_quality": {
        "label": "Response Quality",
        "higher_is_better": True,
        "focus": "Predicted average response quality across multiple runs — accounts for ambiguity and instruction gaps.",
    },
}

METRIC_KEYS = list(METRIC_SPECS.keys())


# ---------- per-metric agent -----------------------------------------------

METRIC_SYS_TEMPLATE = """You are a specialist judge for the "{label}" dimension of a prompt.

Focus: {focus}
Polarity: {polarity}

Return ONLY a JSON object with this exact schema (no markdown, no commentary):
{{
  "score": <integer 0-100>,
  "diagnosis": "<1-2 sentences describing the *specific* problem observed in this prompt, quoting or referencing actual content>",
  "recommendation": "<1-2 sentences with a concrete fix the user can apply now>",
  "evidence": "<a short direct quote from the prompt that best exemplifies the issue, or 'n/a' if none>"
}}

Rules:
- Be precise. Refer to actual words in the prompt.
- Do not hedge. Numbers must reflect the analysis honestly.
- "score" polarity follows the focus above.
"""


def _make_metric_agent(key: str, spec: dict, heuristic_scores: dict) -> Callable[[dict], dict]:
    label = spec["label"]
    focus = spec["focus"]
    polarity = "higher score = better" if spec["higher_is_better"] else "higher score = worse"
    system = METRIC_SYS_TEMPLATE.format(label=label, focus=focus, polarity=polarity)

    def node(state: "AnalysisState") -> dict:
        model_id = state["model_id"]
        prompt = state["prompt"]
        started = time.time()
        parsed = _call_llm(system, f"Prompt to judge:\n\"\"\"\n{prompt}\n\"\"\"", max_tokens=260)

        heur = heuristic_scores.get(key, 50)
        if parsed and isinstance(parsed.get("score"), (int, float)):
            score = int(max(0, min(100, parsed["score"])))
            diagnosis = str(parsed.get("diagnosis") or "").strip() or _fallback_diagnosis(key, heuristic_scores)
            recommendation = str(parsed.get("recommendation") or "").strip() or _fallback_recommendation(key, heuristic_scores)
            evidence = str(parsed.get("evidence") or "n/a").strip()
            source = "hf"
        else:
            score = heur
            diagnosis = _fallback_diagnosis(key, heuristic_scores)
            recommendation = _fallback_recommendation(key, heuristic_scores)
            evidence = "n/a"
            source = "heuristic"

        detail = {
            "score": score,
            "diagnosis": diagnosis,
            "recommendation": recommendation,
            "evidence": evidence,
            "source": source,
            "latency_ms": int((time.time() - started) * 1000),
        }
        # Merge into state under `metric_details` map (LangGraph combines dict updates).
        return {"metric_details": {key: detail}, key: score}

    node.__name__ = f"agent_{key}"
    return node


# ---------- fallback diagnoses (deterministic) ---------------------------


def _fallback_diagnosis(key: str, s: dict) -> str:
    v = s.get(key, 50)
    if key == "clarity":
        if v < 45: return "The intent is unclear — the prompt mixes vague verbs and unspecified goals."
        if v < 70: return "Direction is present but several phrases are open to multiple readings."
        return "The instruction is direct and unambiguous."
    if key == "specificity":
        if v < 45: return "Very little is pinned down — no output format, no examples, no measurable constraints."
        if v < 70: return "Some concrete markers are present, but examples and precise requirements are missing."
        return "Requirements are concrete and measurable."
    if key == "ambiguity":
        if v > 55: return "Contains vague terms and/or unresolved pronouns that a model must guess about."
        if v > 25: return "A few ambiguous references remain but the core ask is understandable."
        return "The prompt reads without meaningful ambiguity."
    if key == "context_score":
        if v < 45: return "No role or background is provided; the model must invent context."
        if v < 70: return "Some context exists but role, audience, or examples are still absent."
        return "Adequate role, audience and context are supplied."
    if key == "instruction_quality":
        if v < 45: return "The prompt lacks a strong imperative and does not specify how to respond."
        if v < 70: return "Instructions are directive but format or step order is under-specified."
        return "Instructions are directive and well-scoped."
    if key == "complexity":
        if v > 65: return "Bundles multiple tasks and jargon — likely to overload the model."
        if v > 40: return "Moderate complexity; consider breaking into sub-steps."
        return "Complexity is manageable."
    if key == "readability":
        if v < 45: return "Sentences are long or dense; the prompt is hard to skim."
        if v < 70: return "Readable, but a few dense sections could be simplified."
        return "The prompt reads smoothly."
    if key == "predicted_success_rate":
        if v < 45: return "Given the current issues, a first-attempt satisfactory answer is unlikely."
        if v < 70: return "A reasonable answer is likely but retries may be needed."
        return "The prompt should succeed on the first try."
    if key == "avg_response_quality":
        if v < 45: return "Because of ambiguity and missing context, response quality will vary widely."
        if v < 70: return "Average responses will be usable but inconsistent."
        return "Responses should be consistently high quality."
    return "No specific issues detected."


def _fallback_recommendation(key: str, s: dict) -> str:
    if key == "clarity":
        return "Replace vague verbs with concrete ones and state the exact goal in one sentence."
    if key == "specificity":
        return "Add 1-2 example inputs & outputs and declare the exact output format (JSON schema, markdown, etc.)."
    if key == "ambiguity":
        return "Replace pronouns like \"it\", \"this\", \"that\" with the actual referent nouns."
    if key == "context_score":
        return "Prepend a role (\"You are a…\") and a short paragraph of relevant background."
    if key == "instruction_quality":
        return "Begin with a strong imperative verb and add a Requirements/Format section."
    if key == "complexity":
        return "Split into numbered sub-tasks or issue one focused prompt per task."
    if key == "readability":
        return "Shorten long sentences and add headings/bullets to break up dense sections."
    if key == "predicted_success_rate":
        return "Fix the top 2 highest-severity risks first, then re-analyze."
    if key == "avg_response_quality":
        return "Tighten ambiguity and add explicit output format to stabilise responses."
    return "Apply the recommendations from the individual metric cards."


# ---------- aggregate node ------------------------------------------------


AGGREGATE_SYS = (
    "You are PromptLens' final synthesis agent. Given a user's prompt AND per-metric scores, "
    "return ONLY JSON (no markdown, no commentary) with:\n"
    "{\n"
    '  "category": "<Coding|Writing|SQL|Math|Research|Translation|RAG|Agent Workflow|Analysis|Creative|QA|Summarization|Classification|Other>",\n'
    '  "missing_information": [<string>, ...],\n'
    '  "failure_risks": [ 7 items: risk-hallucination, risk-injection, risk-ambiguity, risk-conflict, risk-context, risk-format, risk-tasks; each {id,name,probability(0-100),severity(critical|high|medium|low),description} ],\n'
    '  "suggestions": [ {id,type(add|remove|modify|clarify),title,description,impact(high|medium|low),example?} ],\n'
    '  "optimized_prompt": "<a genuine rewrite preserving intent and specifying every task and requirements/specifications>"\n'
    "}\n"
    "Rules: base failure_risks on real signals in the prompt; suggestions must reference actual content."
)


def _aggregate_agent(state: "AnalysisState") -> dict:
    prompt = state["prompt"]
    model_id = state["model_id"]
    metric_summary = {k: state.get(k) for k in METRIC_KEYS if state.get(k) is not None}
    user_msg = (
        f"PROMPT:\n\"\"\"\n{prompt}\n\"\"\"\n\nPER-METRIC SCORES (0-100):\n{json.dumps(metric_summary)}"
    )
    #parsed = _call_hf(AGGREGATE_SYS, user_msg, model_id, max_tokens=1100)
    try:
        parsed = _call_llm(AGGREGATE_SYS, user_msg, max_tokens=1100)
        
        if parsed:  # assuming parsed is dict-like when successful
            return {**parsed, "aggregate_source": "llm"}

    except Exception as e:  # You can narrow this down (e.g. requests.exceptions, json.JSONDecodeError, etc.)
        print(f"[aggregate_agent] LLM call failed: {e}")  # or use logging
        # Fall through to heuristic
    # Backward-compat: use heuristic aggregate as fallback base.
    from server import heuristic_analysis  # local import to avoid cycle at import time

    heur = heuristic_analysis(prompt)
    if not parsed:
        return {
            "category": heur["category"],
            "missing_information": heur["missing_information"],
            "failure_risks": heur["failure_risks"],
            "suggestions": heur["suggestions"],
            "optimized_prompt": heur["optimized_prompt"],
            "aggregate_source": "heuristic",
        }

    # Sanitise
    def as_list(v, d):
        if isinstance(v, list) and v:
            return v
        return d

    return {
        "category": str(parsed.get("category") or heur["category"]),
        "missing_information": [str(x) for x in as_list(parsed.get("missing_information"), heur["missing_information"])][:8],
        "failure_risks": _normalise_risks(as_list(parsed.get("failure_risks"), heur["failure_risks"]), heur["failure_risks"]),
        "suggestions": _normalise_sugs(as_list(parsed.get("suggestions"), heur["suggestions"]), heur["suggestions"]),
        "optimized_prompt": str(parsed.get("optimized_prompt") or heur["optimized_prompt"]),
        "aggregate_source": "hf",
    }


def _normalise_risks(v: list, default: list) -> list:
    if not isinstance(v, list) or not v:
        return default
    out = []
    for i, item in enumerate(v):
        if not isinstance(item, dict):
            continue
        try:
            prob = int(max(0, min(100, float(item.get("probability", 0)))))
        except (TypeError, ValueError):
            prob = 0
        sev = str(item.get("severity") or "").lower()
        if sev not in ("critical", "high", "medium", "low"):
            sev = "medium"
        out.append({
            "id": str(item.get("id") or f"risk-{i}"),
            "name": str(item.get("name") or f"Risk {i+1}"),
            "probability": prob,
            "severity": sev,
            "description": str(item.get("description") or ""),
        })
    return out or default


def _normalise_sugs(v: list, default: list) -> list:
    if not isinstance(v, list) or not v:
        return default
    out = []
    for i, item in enumerate(v):
        if not isinstance(item, dict):
            continue
        t = str(item.get("type") or "").lower()
        t = t if t in ("add", "remove", "modify", "clarify") else "modify"
        impact = str(item.get("impact") or "").lower()
        impact = impact if impact in ("high", "medium", "low") else "medium"
        d = {
            "id": str(item.get("id") or f"sug-{i+1}"),
            "type": t,
            "title": str(item.get("title") or "Improvement")[:120],
            "description": str(item.get("description") or ""),
            "impact": impact,
        }
        if item.get("example"):
            d["example"] = str(item["example"])
        out.append(d)
    return out or default


# ---------- state + graph -------------------------------------------------


class AnalysisState(TypedDict, total=False):
    prompt: str
    model_id: str
    # per-metric scalar scores + details dict — populated by parallel agents
    metric_details: dict
    clarity: int
    specificity: int
    ambiguity: int
    context_score: int
    instruction_quality: int
    complexity: int
    readability: int
    predicted_success_rate: int
    avg_response_quality: int
    # aggregate outputs
    category: str
    missing_information: list
    failure_risks: list
    suggestions: list
    optimized_prompt: str
    aggregate_source: str


def _merge_dict(a: dict, b: dict) -> dict:
    """Reducer to merge metric_details from parallel agents."""
    out = dict(a or {})
    out.update(b or {})
    return out


def build_graph(heuristic_scores: dict):
    class _State(TypedDict, total=False):
        prompt: str
        model_id: str
        metric_details: Annotated[dict, _merge_dict]
        clarity: int
        specificity: int
        ambiguity: int
        context_score: int
        instruction_quality: int
        complexity: int
        readability: int
        predicted_success_rate: int
        avg_response_quality: int
        category: str
        missing_information: list
        failure_risks: list
        suggestions: list
        optimized_prompt: str
        aggregate_source: str

    graph = StateGraph(_State)
    for key, spec in METRIC_SPECS.items():
        graph.add_node(f"agent_{key}", _make_metric_agent(key, spec, heuristic_scores))
        graph.add_edge(START, f"agent_{key}")
        graph.add_edge(f"agent_{key}", "aggregate")
    graph.add_node("aggregate", _aggregate_agent)
    graph.add_edge("aggregate", END)
    return graph.compile()


# ---------- public entry point --------------------------------------------


def run_analysis(prompt: str, model_id: str) -> dict:
    """Blocking entry point — safe to call from a FastAPI sync/async endpoint.

    LangGraph runs the metric agents in parallel via its internal threadpool because
    each node is a plain sync callable that makes an I/O bound HF call. The aggregate
    node runs once all metric agents complete.
    """
    from server import heuristic_analysis  # avoid circular import at module load

    heur = heuristic_analysis(prompt)
    heuristic_scores = {k: heur[k] for k in METRIC_KEYS if k in heur}
    graph = build_graph(heuristic_scores)
    final_state = graph.invoke(
        {"prompt": prompt, "model_id": model_id, "metric_details": {}},
        config={"recursion_limit": 25},
    )
    return final_state


async def run_analysis_streamed(prompt: str, model_id: str, on_event):
    """Run the graph asynchronously, emitting events as agents complete.

    `on_event` is an async callback: await on_event({"type": "...", ...})
    Returns the final state dict.
    """
    from server import heuristic_analysis

    heur = heuristic_analysis(prompt)
    heuristic_scores = {k: heur[k] for k in METRIC_KEYS if k in heur}
    graph = build_graph(heuristic_scores)

    await on_event({"type": "graph_start", "agents": [f"agent_{k}" for k in METRIC_KEYS] + ["aggregate"]})

    final_state: dict = {}
    # LangGraph exposes async streaming of node updates via astream(..., stream_mode="updates")
    async for update in graph.astream(
        {"prompt": prompt, "model_id": model_id, "metric_details": {}},
        stream_mode="updates",
        config={"recursion_limit": 25},
    ):
        # `update` is {node_name: partial_state_dict}
        for node_name, partial in update.items():
            if node_name.startswith("agent_") and node_name != "agent_aggregate":
                key = node_name.replace("agent_", "")
                d = (partial or {}).get("metric_details", {}).get(key, {})
                await on_event({
                    "type": "agent_done",
                    "metric": key,
                    "score": d.get("score"),
                    "source": d.get("source"),
                    "latency_ms": d.get("latency_ms"),
                })
            elif node_name == "aggregate":
                await on_event({"type": "aggregate_done", "source": (partial or {}).get("aggregate_source")})
            # Merge into local final state view
            for k, v in (partial or {}).items():
                if k == "metric_details" and isinstance(v, dict):
                    final_state.setdefault("metric_details", {}).update(v)
                else:
                    final_state[k] = v

    return final_state
