"""PromptLens FastAPI backend v3 — richer schema with composite prompt score,
typed failure risks, token distribution segments, and typed suggestions.

LLM: Hugging Face Inference Providers (default meta-llama/Llama-3.1-8B-Instruct).
Falls back to a deterministic heuristic analyzer if HF is unavailable.
Tokens counted via tiktoken (cl100k_base).
"""
from __future__ import annotations

import asyncio
import json
import logging
import math
import os
import re
import time
from pathlib import Path
from typing import AsyncGenerator, List, Literal, Optional

import tiktoken
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from huggingface_hub import InferenceClient
from huggingface_hub.errors import HfHubHTTPError
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("promptlens")

HF_API_TOKEN = os.environ.get("HF_API_TOKEN", "").strip()
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "").strip()
HF_MODEL_ID = os.environ.get("HF_MODEL_ID", "meta-llama/Llama-3.1-8B-Instruct")
DEFAULT_MODEL = "llama-3.1-70b-versatile"   # Groq model
_ENC = tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str) -> int:
    return len(_ENC.encode(text or ""))


COST_TABLE_PER_1K = {
    "gpt-4o": 0.0075,
    "gpt-4o-mini": 0.00045,
    "gpt-4-turbo": 0.02,
    "claude-3.5-sonnet": 0.009,
    "claude-3-haiku": 0.00075,
    "gemini-1.5-pro": 0.00625,
    "gemini-1.5-flash": 0.000225,
    "mistral-large": 0.006,
    "llama-3.1-70b": 0.0009,
}
PRIMARY_COST_MODEL = "gpt-4o-mini"

# ---------- Metric definitions -------------------------------------------

METRIC_DEFINITIONS = [
    {
        "key": "prompt_score",
        "label": "Prompt Score",
        "higher_is_better": True,
        "description": "Overall weighted quality of the prompt.",
        "formula": "clarity×0.25 + specificity×0.25 + context_score×0.20 + instruction_quality×0.20 + readability×0.10.",
        "signals": ["composite of five primary metrics"],
    },
    {
        "key": "clarity",
        "label": "Clarity",
        "higher_is_better": True,
        "description": "How unambiguous and direct the prompt is.",
        "formula": "Base 90 − ambiguity × 0.6 + structural bonuses.",
        "signals": ["sentence structure", "specificity of verbs", "absence of vague language"],
    },
    {
        "key": "specificity",
        "label": "Specificity",
        "higher_is_better": True,
        "description": "Presence of concrete requirements, examples, and constraints.",
        "formula": "30 + 12 × specific markers + up to 40 for length.",
        "signals": ["examples", "constraints", "named entities", "quantifiable requirements"],
    },
    {
        "key": "ambiguity",
        "label": "Ambiguity",
        "higher_is_better": False,
        "description": "Density of vague terms and undefined pronouns.",
        "formula": "15 × vague terms + 200 × (pronouns / words).",
        "signals": ["vague terms", "orphan pronouns", "very short prompts"],
    },
    {
        "key": "context_score",
        "label": "Context",
        "higher_is_better": True,
        "description": "Background information provided: role, domain, prior context, facts.",
        "formula": "20 × elements present (role, audience, examples, constraints, background).",
        "signals": ["role definition", "domain context", "prior conversation", "relevant facts"],
    },
    {
        "key": "instruction_quality",
        "label": "Instructions",
        "higher_is_better": True,
        "description": "Clarity of directives: action verbs, output format, step order, no conflicts.",
        "formula": "10 × imperative-first verbs + 8 × modal verbs + 15 verb-first bonus.",
        "signals": ["action verbs", "output format specified", "step-by-step", "no contradictions"],
    },
    {
        "key": "complexity",
        "label": "Complexity",
        "higher_is_better": False,
        "description": "Cognitive load: word count, nesting, jargon density, multi-step requirements.",
        "formula": "Length bucket + jargon ratio × 50 + nested-instruction bonus.",
        "signals": ["word count", "nested instructions", "technical jargon", "multi-step tasks"],
    },
    {
        "key": "readability",
        "label": "Readability",
        "higher_is_better": True,
        "description": "How easy the prompt is to read (Flesch reading-ease).",
        "formula": "Flesch = 206.835 − 1.015 × ASL − 84.6 × ASW, clamped 0–100.",
        "signals": ["sentence length", "syllables per word", "structural clarity"],
    },
    {
        "key": "predicted_success_rate",
        "label": "Success Rate",
        "higher_is_better": True,
        "description": "Estimated probability a well-aligned LLM produces a satisfactory response on the first attempt.",
        "formula": "Blend of prompt_score, low ambiguity, high context, low complexity.",
        "signals": ["all quality dimensions combined"],
    },
    {
        "key": "avg_response_quality",
        "label": "Response Quality",
        "higher_is_better": True,
        "description": "Predicted average response quality across multiple runs.",
        "formula": "Prompt score adjusted for ambiguity and instruction completeness.",
        "signals": ["ambiguity", "instruction completeness"],
    },
]
METRIC_KEYS = [m["key"] for m in METRIC_DEFINITIONS]
PRIMARY_KEYS_ORDER = ["prompt_score", "clarity", "specificity", "context_score", "instruction_quality"]


# ---------- HF client -----------------------------------------------------

_hf_client: Optional[InferenceClient] = None


def get_hf_client() -> Optional[InferenceClient]:
    print("getting hf client")
    global _hf_client
    if not HF_API_TOKEN:
        return None
    if _hf_client is None:
        _hf_client = InferenceClient(api_key=HF_API_TOKEN, timeout=18)
    return _hf_client


ANALYSIS_SYSTEM = (
    "You are PromptLens, an expert AI prompt quality analyzer. Given a user's prompt, "
    "respond with a SINGLE valid JSON object and NOTHING else (no markdown fences, no commentary).\n\n"
    "SCHEMA:\n"
    "{\n"
    '  "prompt_score": <int 0-100>,\n'
    '  "clarity": <int 0-100>,\n'
    '  "specificity": <int 0-100>,\n'
    '  "ambiguity": <int 0-100 where 0 = no ambiguity>,\n'
    '  "context_score": <int 0-100>,\n'
    '  "instruction_quality": <int 0-100>,\n'
    '  "complexity": <int 0-100>,\n'
    '  "readability": <int 0-100>,\n'
    '  "predicted_success_rate": <int 0-100>,\n'
    '  "avg_response_quality": <int 0-100>,\n'
    '  "category": <string, one of "Coding","Writing","SQL","Math","Research","Translation","RAG","Agent Workflow","Analysis","Creative","QA","Summarization","Classification","Other">,\n'
    '  "missing_information": [<string>, ...],\n'
    '  "failure_risks": [\n'
    '     {"id":"risk-hallucination","name":"Hallucination Risk","probability":<0-100>,"severity":"<critical|high|medium|low>","description":"..."},\n'
    '     {"id":"risk-injection","name":"Prompt Injection","probability":<0-100>,"severity":"...","description":"..."},\n'
    '     {"id":"risk-ambiguity","name":"High Ambiguity","probability":<0-100>,"severity":"...","description":"..."},\n'
    '     {"id":"risk-conflict","name":"Conflicting Instructions","probability":<0-100>,"severity":"...","description":"..."},\n'
    '     {"id":"risk-context","name":"Missing Context","probability":<0-100>,"severity":"...","description":"..."},\n'
    '     {"id":"risk-format","name":"No Output Format","probability":<0-100>,"severity":"...","description":"..."},\n'
    '     {"id":"risk-tasks","name":"Too Many Tasks","probability":<0-100>,"severity":"...","description":"..."}\n'
    "  ],\n"
    '  "suggestions": [\n'
    '     {"id":"sug-1","type":"<add|remove|modify|clarify>","title":"...","description":"...","impact":"<high|medium|low>","example":"..."}\n'
    "  ],\n"
    '  "optimized_prompt": <string — a genuine rewrite with proper structure , necesary requirements , dependencies and target, not the original + a sentence.>\n'
    "}\n\n"
    "SCORING:\n"
    "- prompt_score = clarity*0.25 + specificity*0.25 + context_score*0.20 + instruction_quality*0.20 + readability*0.10.\n"
    "- Be honest: short/vague prompts should score 20-45; decent 50-70; excellent 75-95.\n"
    "- optimized_prompt MUST be a meaningful rewrite (restructure, clarify, add role/format/constraints as needed), preserving intent.\n"
    "- 3-5 specific, actionable suggestions referencing the actual prompt content.\n"
    "- missing_information should list concrete gaps, not generic advice."
)


def build_messages(user_prompt: str) -> list[dict]:
    return [
        {"role": "system", "content": ANALYSIS_SYSTEM},
        {"role": "user", "content": f"Analyze this prompt and return ONLY the JSON object.\n\nPROMPT:\n\"\"\"\n{user_prompt}\n\"\"\""},
    ]


def _extract_json(text: str) -> Optional[dict]:
    if not text:
        return None
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
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
def call_hf_analysis(user_prompt: str, model_id: str) -> Optional[dict]:
    client = get_hf_client()
    if client is None:
        print("no hf client found")
        return None
    messages = build_messages(user_prompt)
    delays = [0, 1]
    last_err: Optional[str] = None
    for i, delay in enumerate(delays):
        if delay:
            time.sleep(delay)
        try:
            resp = client.chat_completion(messages=messages, model=model_id, max_tokens=1400, temperature=0.25)
            content = resp.choices[0].message.content if resp and resp.choices else ""
            parsed = _extract_json(content)
            if parsed is not None:
                return parsed
            last_err = "non-json"
        except HfHubHTTPError as e:
            last_err = str(e)
            status = getattr(getattr(e, "response", None), "status_code", None)
            if status in (401, 403, 404, 504):
                break
        except Exception as e:  # noqa: BLE001
            last_err = str(e)
            break
    logger.error("HF inference failed: %s", last_err)
    return None

'''

def call_llm(system: str, user: str, max_tokens: int = 1100, temperature: float = 0.25) -> Optional[dict]:
    """Try Groq first → fallback to HF → return parsed JSON or None"""
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user}
    ]

    # 1. Try Groq (preferred)
    if GROQ_API_KEY:
        try:
            client = Groq(api_key=GROQ_API_KEY)
            resp = client.chat.completions.create(
                model=DEFAULT_MODEL,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            content = resp.choices[0].message.content if resp and resp.choices else ""
            logger.info("✅ Used Groq")
            return _extract_json(content)
        except Exception as e:
            logger.warning(f"Groq failed: {e}. Trying HF fallback...")

    # 2. Fallback to HF
    if HF_API_TOKEN:
        client = get_hf_client()
        if client:
            try:
                resp = client.chat_completion(
                    messages=messages,
                    model=HF_MODEL_ID,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
                content = resp.choices[0].message.content if resp and resp.choices else ""
                logger.info("✅ Used HF fallback")
                return _extract_json(content)
            except Exception as e:
                logger.error(f"HF fallback failed: {e}")

    logger.warning("Both Groq and HF unavailable → using heuristic only")
    return None
# ---------- Heuristic analyzer -------------------------------------------

VAGUE_TERMS = {"thing", "stuff", "something", "somehow", "maybe", "kind of", "sort of", "etc", "and so on", "various", "good", "nice", "some"}
SPECIFIC_MARKERS = ["step by step", "in JSON", "in json", "as a table", "in markdown", "python", "javascript", "typescript", "sql", "example", "format:", "constraints:", "requirements:", "must", "should", "return"]
CATEGORY_KEYWORDS = {
    "Coding": ["code", "function", "class", "python", "javascript", "typescript", "algorithm", "bug", "refactor"],
    "SQL": ["sql", "select ", "join ", "database", "query", "table schema"],
    "Writing": ["write", "essay", "blog", "article", "copywriting"],
    "Creative": ["story", "poem", "novel", "character", "plot", "scene", "creative"],
    "Analysis": ["analyze", "analyse", "dataset", "csv", "statistic", "chart", "trend"],
    "Summarization": ["summarize", "summary", "tldr", "condense", "shorten"],
    "Translation": ["translate", "translation", "in french", "in spanish", "in german"],
    "Research": ["research", "sources", "cite", "study", "paper"],
    "RAG": ["retrieval", "rag", "context window", "documents", "from the following documents"],
    "Agent Workflow": ["agent", "tool call", "function calling", "multi-step", "planner"],
    "Math": ["equation", "solve", "prove", "theorem", "compute", "calculate"],
    "QA": ["what is", "how do", "why does", "who is", "when did", "answer this"],
    "Classification": ["classify", "label", "categorize", "which category"],
}
IMPERATIVES = {"write", "generate", "create", "list", "explain", "summarize", "translate", "return", "convert", "extract", "analyze", "produce", "build", "design", "compare", "evaluate", "classify", "rewrite", "refactor", "outline"}
MODAL_VERBS = ["must", "should", "shall", "return", "output", "produce", "include"]
LOADED_PHRASES = ["obviously", "clearly", "of course", "as everyone knows", "everybody knows", "any rational person", "undoubtedly", "without question"]
FILLER = {"basically", "just", "really", "very", "actually", "quite", "sort of", "kind of"}
JARGON = {"kubernetes", "microservice", "polymorphism", "orthogonal", "idempotent", "eigenvalue", "transformer", "backpropagation", "sha256", "rlhf", "coroutine", "monad"}


def _syllables(word: str) -> int:
    word = word.lower()
    if not word:
        return 0
    vowels = "aeiouy"
    count = 0
    prev = False
    for ch in word:
        is_v = ch in vowels
        if is_v and not prev:
            count += 1
        prev = is_v
    if word.endswith("e") and count > 1:
        count -= 1
    return max(1, count)


def flesch_score(text: str) -> float:
    words = re.findall(r"[A-Za-z']+", text)
    sentences = [s for s in re.split(r"[.!?]+", text.strip()) if s.strip()]
    if not words or not sentences:
        return 50.0
    total_syl = sum(_syllables(w) for w in words)
    asl = len(words) / len(sentences)
    asw = total_syl / len(words)
    score = 206.835 - 1.015 * asl - 84.6 * asw
    return max(0.0, min(100.0, score))


def _severity_from_prob(p: int) -> str:
    if p >= 75:
        return "critical"
    if p >= 55:
        return "high"
    if p >= 30:
        return "medium"
    return "low"


def heuristic_analysis(prompt: str) -> dict:
    print("heuristic analylis ran")
    p = prompt.strip()
    lower = p.lower()
    words = re.findall(r"\w+", lower)
    n_words = max(len(words), 1)

    specific_hits = sum(1 for m in SPECIFIC_MARKERS if m in lower)
    length_score = min(1.0, n_words / 80.0)
    specificity = int(min(100, 30 + specific_hits * 12 + length_score * 40))

    vague_hits = sum(1 for v in VAGUE_TERMS if v in lower)
    pronouns = sum(1 for w in words if w in {"it", "they", "this", "that", "them", "these"})
    ambiguity = int(min(100, vague_hits * 15 + (pronouns / n_words) * 200 + (20 if n_words < 8 else 0)))

    structure_bonus = 15 if re.search(r"(^|\n)\s*[-*\d]+[.)\s]", p) else 0
    clarity = int(max(0, min(100, 90 - ambiguity * 0.6 + structure_bonus)))

    readability = int(round(flesch_score(p)))

    # Context
    ctx_signals = 0
    if re.search(r"\byou are\b|\bact as\b|\brole:\s", lower): ctx_signals += 1
    if re.search(r"\bfor (a|an|the) [a-z]+ audience\b|target[- ]audience|\baudience:\s", lower): ctx_signals += 1
    if re.search(r"\bexample[s]?:|\bfor instance\b|\bfor example\b", lower): ctx_signals += 1
    if re.search(r"\bconstraint[s]?:|\brequirement[s]?:|\bmust not\b|\bdo not\b", lower): ctx_signals += 1
    if n_words >= 40: ctx_signals += 1
    context_score = min(100, ctx_signals * 20)

    # Instruction quality
    first_words = [s.strip().split()[0].lower() for s in re.split(r"[.!?\n]", p) if s.strip()]
    imperative_hits = sum(1 for fw in first_words if fw in IMPERATIVES)
    modal_hits = sum(1 for m in MODAL_VERBS if re.search(rf"\b{m}\b", lower))
    verb_first_bonus = 15 if first_words and first_words[0] in IMPERATIVES else 0
    format_bonus = 15 if re.search(r"\bformat:|\breturn (a|an)?\s?(json|markdown|table|list)", lower) else 0
    instruction_quality = int(min(100, imperative_hits * 10 + modal_hits * 8 + verb_first_bonus + format_bonus))

    # Complexity
    length_bucket = min(60, n_words / 6)
    jargon_hits = sum(1 for j in JARGON if j in lower)
    nested = min(20, len(re.findall(r"(^|\n)\s*[-*]\s+[-*]\s+", p)) * 10)
    complexity = int(min(100, length_bucket + jargon_hits * 12 + nested))

    # Composite prompt score
    prompt_score = int(round(
        clarity * 0.25 + specificity * 0.25 + context_score * 0.20 + instruction_quality * 0.20 + readability * 0.10
    ))
    prompt_score = max(0, min(100, prompt_score))

    predicted_success = int(max(0, min(100, prompt_score - ambiguity * 0.3 - complexity * 0.1 + context_score * 0.1)))
    avg_response_quality = int(max(0, min(100, prompt_score - ambiguity * 0.25 - (100 - instruction_quality) * 0.15)))

    # Category
    category = "Other"
    best = 0
    for cat, kws in CATEGORY_KEYWORDS.items():
        hits = sum(1 for kw in kws if kw in lower)
        if hits > best:
            best = hits
            category = cat

    # Missing information
    missing: List[str] = []
    if n_words < 15: missing.append("Prompt is very short — add task context and expected outcome.")
    if "example" not in lower and specificity < 60: missing.append("No example provided; include 1-2 examples of desired output.")
    if not any(t in lower for t in ["format", "json", "markdown", "table", "list"]): missing.append("Output format is unspecified.")
    if not any(t in lower for t in ["audience", "for a", "targeting"]): missing.append("Target audience is not defined.")
    if not re.search(r"you are|act as|role:", lower): missing.append("No role or persona set for the model.")
    if vague_hits: missing.append("Vague terms present (e.g. \"something\", \"thing\") — replace with concrete requirements.")

    # Failure risks (7 typed)
    hall_prob = min(100, 15 + sum(20 for w in ["latest", "current", "today", "news", "statistics", "recent"] if w in lower) + max(0, 60 - specificity) // 3)
    inj_prob = min(100, 10 + sum(30 for w in ["ignore previous", "override", "act as if", "developer mode"] if w in lower))
    amb_prob = min(100, ambiguity)
    conflict_prob = 15
    if re.search(r"\b(must|should)\b.+\b(should not|must not)\b", lower):
        conflict_prob = 70
    ctx_prob = max(0, 100 - context_score)
    format_prob = 20 if re.search(r"\b(json|markdown|table|list|format:)\b", lower) else 65
    n_tasks = len(re.findall(r"\band\b|\bthen\b|;", lower))
    tasks_prob = min(100, max(0, (n_tasks - 3) * 12))

    risks_data = [
        ("risk-hallucination", "Hallucination Risk", hall_prob, "Prompt asks for factual claims with limited grounding — model may fabricate details."),
        ("risk-injection", "Prompt Injection", inj_prob, "Prompt appears safe — no known injection markers." if inj_prob < 40 else "Contains language that could be exploited by adversarial input."),
        ("risk-ambiguity", "High Ambiguity", amb_prob, "Vague terms and pronouns make the intent unclear." if amb_prob >= 40 else "Prompt is reasonably unambiguous."),
        ("risk-conflict", "Conflicting Instructions", conflict_prob, "Contains both must/should and their negations — instructions may conflict." if conflict_prob >= 50 else "No obvious contradictions detected."),
        ("risk-context", "Missing Context", ctx_prob, "Little background or role is provided; the model must guess." if ctx_prob >= 50 else "Adequate context provided."),
        ("risk-format", "No Output Format", format_prob, "Output format is not specified; response shape is unpredictable." if format_prob >= 40 else "Output format is defined."),
        ("risk-tasks", "Too Many Tasks", tasks_prob, "Multiple tasks bundled together — split into sub-requests for reliability." if tasks_prob >= 40 else "Task load is manageable."),
    ]
    failure_risks = [
        {"id": rid, "name": name, "probability": int(prob), "severity": _severity_from_prob(int(prob)), "description": desc}
        for (rid, name, prob, desc) in risks_data
    ]

    # Typed suggestions
    suggestions: List[dict] = []
    def sug(sid, stype, title, description, impact, example=None):
        s = {"id": sid, "type": stype, "title": title, "description": description, "impact": impact}
        if example: s["example"] = example
        suggestions.append(s)

    if specificity < 70:
        sug("sug-format", "add", "Specify output format", "Declare the exact response shape so the model does not guess.", "high", "Format: return a JSON object with keys `title`, `steps` (list), `summary`.")
    if instruction_quality < 60:
        sug("sug-imperative", "modify", "Lead with a strong imperative", "Start the prompt with a verb that describes the action explicitly.", "high", "Write a … / Generate a … / Return …")
    if context_score < 60:
        sug("sug-role", "add", "Set a role", "Give the model a role and audience so tone and depth match the use-case.", "medium", "You are a senior Python engineer helping a junior teammate.")
    if ambiguity > 40:
        sug("sug-pronouns", "clarify", "Replace pronouns with nouns", "Substitute \"it\", \"this\", \"that\" with the actual referent to remove ambiguity.", "medium")
    if not re.search(r"\bexample[s]?:|\bfor example\b", lower):
        sug("sug-example", "add", "Add a few-shot example", "One or two examples of ideal output dramatically improve consistency.", "high")
    if complexity > 65:
        sug("sug-split", "modify", "Split into smaller steps", "The prompt bundles many tasks. Break it into numbered sub-tasks or separate calls.", "medium")
    if len(suggestions) < 3:
        sug("sug-constraints", "add", "State constraints explicitly", "List what the response must NOT do (length limits, forbidden topics, etc.).", "low")

    optimized = (
        "# Role\nYou are an expert assistant.\n\n"
        f"# Task\n{p.strip()}\n\n"
        "# Requirements\n- Follow the requested format precisely.\n- Use concrete, unambiguous language.\n- If information is missing, ask a clarifying question before answering.\n\n"
        "# Output Format\nReturn the response in clear markdown with headings and bullet points."
    )

    return {
        "prompt_score": prompt_score,
        "clarity": clarity,
        "specificity": specificity,
        "ambiguity": ambiguity,
        "context_score": context_score,
        "instruction_quality": instruction_quality,
        "complexity": complexity,
        "readability": readability,
        "predicted_success_rate": predicted_success,
        "avg_response_quality": avg_response_quality,
        "category": category,
        "missing_information": missing[:6],
        "failure_risks": failure_risks,
        "suggestions": suggestions[:6],
        "optimized_prompt": optimized,
    }


def merge_with_defaults(parsed: dict, fallback: dict) -> dict:
    def as_int(v, default):
        try:
            v = float(v)
            if 0 <= v <= 1: v *= 100
            return int(max(0, min(100, v)))
        except (TypeError, ValueError):
            return default

    def as_str_list(v, default):
        if isinstance(v, list):
            return [str(x) for x in v if str(x).strip()][:8]
        if isinstance(v, str) and v.strip():
            return [v.strip()]
        return default

    def norm_severity(s: str) -> str:
        s = str(s or "").lower()
        return s if s in ("critical", "high", "medium", "low") else _severity_from_prob(0)

    def as_risks(v, default):
        if not isinstance(v, list) or not v: return default
        out = []
        for item in v:
            if not isinstance(item, dict): continue
            prob = as_int(item.get("probability"), 0)
            out.append({
                "id": str(item.get("id") or f"risk-{len(out)}"),
                "name": str(item.get("name") or "Risk"),
                "probability": prob,
                "severity": norm_severity(item.get("severity") or _severity_from_prob(prob)),
                "description": str(item.get("description") or ""),
            })
        return out or default

    def norm_type(t: str) -> str:
        t = str(t or "").lower()
        return t if t in ("add", "remove", "modify", "clarify") else "modify"

    def norm_impact(t: str) -> str:
        t = str(t or "").lower()
        return t if t in ("high", "medium", "low") else "medium"

    def as_suggestions(v, default):
        # Accept both list-of-dict (new) and list-of-string (legacy) forms
        if isinstance(v, list) and v:
            out = []
            for i, item in enumerate(v):
                if isinstance(item, dict):
                    out.append({
                        "id": str(item.get("id") or f"sug-{i+1}"),
                        "type": norm_type(item.get("type")),
                        "title": str(item.get("title") or item.get("description") or f"Suggestion {i+1}")[:120],
                        "description": str(item.get("description") or ""),
                        "impact": norm_impact(item.get("impact")),
                        **({"example": str(item["example"])} if item.get("example") else {}),
                    })
                elif isinstance(item, str) and item.strip():
                    out.append({"id": f"sug-{i+1}", "type": "modify", "title": item.strip()[:80], "description": item.strip(), "impact": "medium"})
            return out or default
        return default

    result = {}
    for key in METRIC_KEYS:
        result[key] = as_int(parsed.get(key), fallback[key])
    result["category"] = str(parsed.get("category") or fallback["category"])
    result["missing_information"] = as_str_list(
        parsed.get("missing_information") or parsed.get("missing_context"),
        fallback["missing_information"],
    )
    result["failure_risks"] = as_risks(parsed.get("failure_risks"), fallback["failure_risks"])
    result["suggestions"] = as_suggestions(parsed.get("suggestions"), fallback["suggestions"])
    result["optimized_prompt"] = str(parsed.get("optimized_prompt") or fallback["optimized_prompt"])
    return result


def compute_token_distribution(prompt: str, context_score: int, specificity: int, instruction_quality: int, total_tokens: int) -> list:
    has_context = context_score > 50
    has_examples = specificity > 60
    has_constraints = instruction_quality > 60
    system_t = int(total_tokens * (0.25 if has_context else 0.05))
    instruction_t = int(total_tokens * 0.30)
    context_t = int(total_tokens * (0.20 if has_context else 0.05))
    example_t = int(total_tokens * (0.15 if has_examples else 0.02))
    constraint_t = int(total_tokens * (0.10 if has_constraints else 0.03))
    user_t = max(1, total_tokens - system_t - instruction_t - context_t - example_t - constraint_t)
    return [
        {"name": "Instructions", "value": instruction_t, "color": "#EFEFEF"},
        {"name": "Context", "value": context_t, "color": "#007AFF"},
        {"name": "System", "value": system_t, "color": "#8B5CF6"},
        {"name": "Examples", "value": example_t, "color": "#34C759"},
        {"name": "Constraints", "value": constraint_t, "color": "#FFCC00"},
        {"name": "User Input", "value": user_t, "color": "#71717A"},
    ]


def build_response_payload(prompt: str, parsed: Optional[dict], model_id: str, source: str) -> dict:
    fallback = heuristic_analysis(prompt)
    final = merge_with_defaults(parsed or {}, fallback)

    input_tokens = count_tokens(prompt)
    opt_tokens = count_tokens(final["optimized_prompt"])
    cost_estimates = {m: round((input_tokens / 1000.0) * price, 6) for m, price in COST_TABLE_PER_1K.items()}
    primary_cost = cost_estimates.get(PRIMARY_COST_MODEL, 0.0)
    token_distribution = compute_token_distribution(
        prompt, final["context_score"], final["specificity"], final["instruction_quality"], input_tokens
    )

    return {
        **final,
        "metric_details": {},
        "token_count": input_tokens,
        "char_count": len(prompt),
        "word_count": len(re.findall(r"\S+", prompt)),
        "optimized_token_count": opt_tokens,
        "cost_estimates": cost_estimates,
        "primary_cost": primary_cost,
        "primary_cost_model": PRIMARY_COST_MODEL,
        "token_distribution": token_distribution,
        "model_used": model_id,
        "source": source,
    }


def build_response_from_langgraph(prompt: str, lg_state: dict, model_id: str) -> dict:
    """Convert a LangGraph final state into the API response payload."""
    fallback = heuristic_analysis(prompt)
    scores = {
        k: int(lg_state.get(k, fallback[k])) for k in [
            "clarity", "specificity", "ambiguity", "context_score", "instruction_quality",
            "complexity", "readability", "predicted_success_rate", "avg_response_quality",
        ]
    }
    prompt_score = int(round(
        scores["clarity"] * 0.25 + scores["specificity"] * 0.25 + scores["context_score"] * 0.20
        + scores["instruction_quality"] * 0.20 + scores["readability"] * 0.10
    ))
    prompt_score = max(0, min(100, prompt_score))

    final = {
        "prompt_score": prompt_score,
        **scores,
        "category": lg_state.get("category") or fallback["category"],
        "missing_information": lg_state.get("missing_information") or fallback["missing_information"],
        "failure_risks": lg_state.get("failure_risks") or fallback["failure_risks"],
        "suggestions": lg_state.get("suggestions") or fallback["suggestions"],
        "optimized_prompt": lg_state.get("optimized_prompt") or fallback["optimized_prompt"],
    }
    # Merge/sanitise using the same helpers as HF-single-call responses
    final = merge_with_defaults(final, fallback)
    # Re-apply the composite (merge_with_defaults recomputes prompt_score via as_int; keep it explicit)
    final["prompt_score"] = prompt_score

    input_tokens = count_tokens(prompt)
    opt_tokens = count_tokens(final["optimized_prompt"])
    cost_estimates = {m: round((input_tokens / 1000.0) * price, 6) for m, price in COST_TABLE_PER_1K.items()}
    primary_cost = cost_estimates.get(PRIMARY_COST_MODEL, 0.0)
    token_distribution = compute_token_distribution(
        prompt, final["context_score"], final["specificity"], final["instruction_quality"], input_tokens
    )

    metric_details = lg_state.get("metric_details") or {}
    hf_agent_count = sum(1 for d in metric_details.values() if d.get("source") == "hf")

    return {
        **final,
        "metric_details": metric_details,
        "token_count": input_tokens,
        "char_count": len(prompt),
        "word_count": len(re.findall(r"\S+", prompt)),
        "optimized_token_count": opt_tokens,
        "cost_estimates": cost_estimates,
        "primary_cost": primary_cost,
        "primary_cost_model": PRIMARY_COST_MODEL,
        "token_distribution": token_distribution,
        "model_used": model_id,
        "source": "hf" if hf_agent_count > 0 or lg_state.get("aggregate_source") == "hf" else "heuristic",
        "graph": {
            "agents_run": len(metric_details),
            "hf_agents": hf_agent_count,
            "aggregate_source": lg_state.get("aggregate_source", "heuristic"),
        },
    }


# ---------- API models ----------------------------------------------------

class AnalyzeRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=20000)
    model_id: Optional[str] = None


class FailureRisk(BaseModel):
    id: str
    name: str
    probability: int
    severity: Literal["critical", "high", "medium", "low"]
    description: str


class Suggestion(BaseModel):
    id: str
    type: Literal["add", "remove", "modify", "clarify"]
    title: str
    description: str
    impact: Literal["high", "medium", "low"]
    example: Optional[str] = None


class TokenSegment(BaseModel):
    name: str
    value: int
    color: str


class MetricDetail(BaseModel):
    score: int
    diagnosis: str
    recommendation: str
    evidence: str
    source: str
    latency_ms: int


class AnalyzeResponse(BaseModel):
    prompt_score: int
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
    missing_information: List[str]
    failure_risks: List[FailureRisk]
    suggestions: List[Suggestion]
    optimized_prompt: str
    token_count: int
    char_count: int
    word_count: int
    optimized_token_count: int
    cost_estimates: dict
    primary_cost: float
    primary_cost_model: str
    token_distribution: List[TokenSegment]
    model_used: str
    source: str
    metric_details: dict = {}
    graph: Optional[dict] = None


# ---------- FastAPI app ---------------------------------------------------

app = FastAPI(title="PromptLens API", version="3.0.0")
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"service": "PromptLens", "status": "ok", "version": "3.0.0"}


@api_router.get("/health")
async def health():
    return {"ok": True, "hf_configured": bool(HF_API_TOKEN), "model": HF_MODEL_ID}


@api_router.get("/models")
async def list_models():
    return {
        "default": DEFAULT_MODEL,
        "provider": "groq" if GROQ_API_KEY else "hf",
        "options": [
            "llama-3.1-70b-versatile",
            "llama-3.1-8b-instant",
            "mixtral-8x7b-32768",
            "gemma2-9b-it",
        ],
        "cost_reference_models": list(COST_TABLE_PER_1K.keys()),
        "primary_cost_model": PRIMARY_COST_MODEL,
    }


@api_router.get("/metrics/definitions")
async def metric_definitions():
    return {"metrics": METRIC_DEFINITIONS}


@api_router.post("/tokenize")
async def tokenize(payload: dict):
    text = str(payload.get("text", ""))
    return {"token_count": count_tokens(text), "char_count": len(text)}

'''
@api_router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Empty prompt")
    model_id = req.model_id or HF_MODEL_ID
    # Run the LangGraph multi-agent analyzer off the event loop
    loop = asyncio.get_event_loop()
    from langgraph_analyzer import run_analysis
    lg_state = await loop.run_in_executor(None, run_analysis, prompt, model_id)
    return AnalyzeResponse(**build_response_from_langgraph(prompt, lg_state, model_id))
'''
@api_router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Empty prompt")
    
    model_id = req.model_id or DEFAULT_MODEL
    loop = asyncio.get_event_loop()
    from langgraph_analyzer import run_analysis
    lg_state = await loop.run_in_executor(None, run_analysis, prompt, model_id)
    return AnalyzeResponse(**build_response_from_langgraph(prompt, lg_state, model_id))

# ---------- Streaming endpoint (SSE) -------------------------------------


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


@api_router.post("/analyze/stream")
async def analyze_stream(req: AnalyzeRequest):
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Empty prompt")
    model_id = req.model_id or HF_MODEL_ID

    async def gen():
        yield _sse({"type": "start", "model": model_id})
        # Bridge run_analysis_streamed's on_event callback into our SSE stream via a queue
        from langgraph_analyzer import run_analysis_streamed

        queue: asyncio.Queue = asyncio.Queue()
        SENTINEL = object()

        async def on_event(evt: dict):
            await queue.put(evt)

        async def runner():
            try:
                final_state = await run_analysis_streamed(prompt, model_id, on_event)
                payload = build_response_from_langgraph(prompt, final_state, model_id)
                await queue.put({"type": "result", "result": payload})
            except Exception as exc:  # noqa: BLE001
                logger.exception("analyze_stream failed")
                await queue.put({"type": "warning", "message": f"analysis failed: {exc}"})
                payload = build_response_payload(prompt, None, model_id, "heuristic")
                await queue.put({"type": "result", "result": payload})
            finally:
                await queue.put(SENTINEL)

        task = asyncio.create_task(runner())
        try:
            while True:
                evt = await queue.get()
                if evt is SENTINEL:
                    break
                yield _sse(evt)
        finally:
            if not task.done():
                task.cancel()
        yield _sse({"type": "end"})

    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"})


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,           # Change to True if using cookies/auth
    allow_origins=[
        "*", # e.g. prompt-lens.cc or whatever
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)