"""PromptLens v3 backend tests."""
import os
import json
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")

METRIC_KEYS = [
    "prompt_score", "clarity", "specificity", "ambiguity", "context_score",
    "instruction_quality", "complexity", "readability",
    "predicted_success_rate", "avg_response_quality",
]
RISK_IDS = {
    "risk-hallucination", "risk-injection", "risk-ambiguity", "risk-conflict",
    "risk-context", "risk-format", "risk-tasks",
}
SEVS = {"critical", "high", "medium", "low"}
IMPACTS = {"high", "medium", "low"}
SUG_TYPES = {"add", "remove", "modify", "clarify"}


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---- health -------------------------------------------------------------
def test_health(s):
    r = s.get(f"{BASE_URL}/api/health", timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d.get("ok") is True


# ---- metric definitions -------------------------------------------------
def test_metric_definitions(s):
    r = s.get(f"{BASE_URL}/api/metrics/definitions", timeout=30)
    assert r.status_code == 200
    data = r.json()
    arr = data if isinstance(data, list) else data.get("metrics") or data.get("definitions")
    assert isinstance(arr, list)
    assert len(arr) >= 10
    keys = [m["key"] for m in arr]
    for k in METRIC_KEYS:
        assert k in keys, f"Missing metric {k}"
    for m in arr:
        assert "label" in m
        assert isinstance(m.get("higher_is_better"), bool)
        assert m.get("description")
        assert m.get("formula")
        assert m.get("signals") is not None


def _assert_analyze_payload(d):
    # metrics
    for k in METRIC_KEYS:
        assert k in d, f"missing metric {k}"
        v = d[k]
        assert isinstance(v, int), f"{k} not int: {v!r}"
        assert 0 <= v <= 100
    # scalars
    for f in ["category", "optimized_prompt", "model_used", "source",
              "token_count", "char_count", "word_count", "optimized_token_count",
              "primary_cost", "primary_cost_model", "cost_estimates"]:
        assert f in d, f"missing field {f}"
    assert isinstance(d["category"], str)
    assert isinstance(d["cost_estimates"], dict)
    assert isinstance(d["primary_cost"], (int, float))
    assert isinstance(d["missing_information"], list)
    # failure_risks: 7 typed
    risks = d["failure_risks"]
    assert isinstance(risks, list)
    assert len(risks) == 7, f"expected 7 risks, got {len(risks)}"
    ids = set()
    for r_ in risks:
        assert {"id", "name", "probability", "severity", "description"} <= set(r_.keys())
        assert r_["severity"] in SEVS
        assert 0 <= r_["probability"] <= 100
        ids.add(r_["id"])
    assert ids == RISK_IDS, f"risk ids mismatch: {ids}"
    # suggestions typed
    sugs = d["suggestions"]
    assert isinstance(sugs, list) and len(sugs) >= 1
    for sg in sugs:
        assert {"id", "type", "title", "description", "impact"} <= set(sg.keys())
        assert sg["type"] in SUG_TYPES
        assert sg["impact"] in IMPACTS
    # token_distribution: 6 segments
    td = d["token_distribution"]
    assert isinstance(td, list) and len(td) == 6
    for seg in td:
        assert {"name", "value", "color"} <= set(seg.keys())
        assert isinstance(seg["value"], int)
    assert d["source"] in ("hf", "heuristic")
    # v4: metric_details + graph
    md = d.get("metric_details")
    assert isinstance(md, dict)
    v4_keys = ["clarity", "specificity", "ambiguity", "context_score",
               "instruction_quality", "complexity", "readability",
               "predicted_success_rate", "avg_response_quality"]
    for k in v4_keys:
        assert k in md, f"metric_details missing {k}"
        e = md[k]
        assert isinstance(e.get("score"), int) and 0 <= e["score"] <= 100
        assert isinstance(e.get("diagnosis"), str) and e["diagnosis"].strip()
        assert isinstance(e.get("recommendation"), str) and e["recommendation"].strip()
        assert isinstance(e.get("evidence"), str)
        assert e.get("source") in ("hf", "heuristic")
        assert isinstance(e.get("latency_ms"), int)
    g = d.get("graph")
    assert isinstance(g, dict)
    assert isinstance(g.get("agents_run"), int) and g["agents_run"] >= 9
    assert isinstance(g.get("hf_agents"), int) and g["hf_agents"] >= 0
    assert g.get("aggregate_source") in ("hf", "heuristic")


# ---- analyze full flow --------------------------------------------------
def test_analyze_full(s):
    r = s.post(f"{BASE_URL}/api/analyze",
               json={"prompt": "Write me something about AI agents."}, timeout=60)
    assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
    _assert_analyze_payload(r.json())


def test_analyze_empty(s):
    r = s.post(f"{BASE_URL}/api/analyze", json={"prompt": ""}, timeout=30)
    assert 400 <= r.status_code < 500


# ---- streaming ----------------------------------------------------------
def test_analyze_stream(s):
    r = requests.post(f"{BASE_URL}/api/analyze/stream",
                      json={"prompt": "Write me something about AI agents."},
                      stream=True, timeout=90,
                      headers={"Content-Type": "application/json"})
    assert r.status_code == 200
    assert "text/event-stream" in r.headers.get("content-type", "")

    saw_start = False
    result_ev = None
    body = ""
    for raw in r.iter_lines(decode_unicode=True):
        if raw is None:
            continue
        body += raw + "\n"
        if raw.startswith("data:"):
            data_str = raw[5:].strip()
            if not data_str:
                continue
            try:
                ev = json.loads(data_str)
            except Exception:
                continue
            if ev.get("type") == "start":
                saw_start = True
            elif ev.get("type") == "result":
                result_ev = ev
                break
        if len(body) > 800000:
            break
    r.close()
    assert saw_start, f"no start event. head: {body[:400]}"
    assert result_ev is not None, f"no result event. head: {body[:800]}"
    payload = result_ev.get("result") or result_ev.get("payload") or result_ev.get("data")
    assert isinstance(payload, dict), f"missing payload dict: {result_ev}"
    _assert_analyze_payload(payload)


# ---- streaming: v4 graph events ----------------------------------------
def test_analyze_stream_graph_events(s):
    r = requests.post(f"{BASE_URL}/api/analyze/stream",
                      json={"prompt": "Write me something about AI agents."},
                      stream=True, timeout=90,
                      headers={"Content-Type": "application/json"})
    assert r.status_code == 200
    events = []
    for raw in r.iter_lines(decode_unicode=True):
        if not raw or not raw.startswith("data:"):
            continue
        try:
            ev = json.loads(raw[5:].strip())
        except Exception:
            continue
        events.append(ev)
        if ev.get("type") == "result":
            break
    r.close()
    types = [e.get("type") for e in events]
    assert "start" in types
    assert "graph_start" in types
    gs = next(e for e in events if e["type"] == "graph_start")
    agents_list = gs.get("agents") or gs.get("nodes") or []
    assert len(agents_list) == 10, f"graph_start should list 10 nodes, got {agents_list}"
    assert "aggregate" in agents_list
    agent_done = [e for e in events if e.get("type") == "agent_done"]
    assert len(agent_done) >= 9, f"expected >=9 agent_done, got {len(agent_done)}"
    for ad in agent_done:
        assert ad.get("metric")
        assert isinstance(ad.get("score"), int)
        assert ad.get("source") in ("hf", "heuristic")
        assert isinstance(ad.get("latency_ms"), int)
    agg = [e for e in events if e.get("type") == "aggregate_done"]
    assert len(agg) >= 1
    assert agg[0].get("source") in ("hf", "heuristic")

