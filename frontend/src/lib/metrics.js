// Metric metadata cache + primary/secondary key ordering.
import { useEffect, useState } from "react";
import { fetchMetricDefinitions } from "./api";

export const METRIC_FALLBACK = [
  { key: "prompt_score", label: "Prompt Score", higher_is_better: true, description: "Overall weighted quality of the prompt.", formula: "clarity×0.25 + specificity×0.25 + context_score×0.20 + instruction_quality×0.20 + readability×0.10.", signals: ["composite of five primary metrics"] },
  { key: "clarity", label: "Clarity", higher_is_better: true, description: "How unambiguous and direct the prompt is.", formula: "Base 90 − ambiguity × 0.6 + structural bonuses.", signals: ["sentence structure", "specific verbs", "no vague terms"] },
  { key: "specificity", label: "Specificity", higher_is_better: true, description: "Concrete requirements, examples, constraints, named entities.", formula: "30 + 12 × specific markers + length bonus.", signals: ["examples", "constraints", "named entities"] },
  { key: "ambiguity", label: "Ambiguity", higher_is_better: false, description: "Density of vague terms and undefined pronouns.", formula: "15 × vague terms + 200 × pronouns/words.", signals: ["vague terms", "orphan pronouns"] },
  { key: "context_score", label: "Context", higher_is_better: true, description: "Role, domain, examples and background provided.", formula: "20 × elements: role, audience, examples, constraints, background.", signals: ["role", "audience", "examples", "constraints"] },
  { key: "instruction_quality", label: "Instructions", higher_is_better: true, description: "Directive clarity: action verbs, output format, no conflicts.", formula: "10 × imperative-first verbs + 8 × modal verbs + bonuses.", signals: ["action verbs", "format", "step order"] },
  { key: "complexity", label: "Complexity", higher_is_better: false, description: "Cognitive load: length, nesting, jargon density, multi-step.", formula: "Length bucket + jargon × 12 + nested-instruction bonus.", signals: ["length", "jargon", "nested tasks"] },
  { key: "readability", label: "Readability", higher_is_better: true, description: "Flesch reading-ease of the prompt.", formula: "Flesch = 206.835 − 1.015 × ASL − 84.6 × ASW, clamped 0–100.", signals: ["sentence length", "syllables per word"] },
  { key: "predicted_success_rate", label: "Success Rate", higher_is_better: true, description: "Estimated probability a well-aligned LLM succeeds on first attempt.", formula: "Prompt score adjusted for ambiguity, complexity, context.", signals: ["all quality dimensions"] },
  { key: "avg_response_quality", label: "Response Quality", higher_is_better: true, description: "Predicted average response quality across multiple runs.", formula: "Prompt score adjusted for ambiguity and instruction gaps.", signals: ["ambiguity", "instruction completeness"] },
];

let _cache = null;

export function useMetricDefinitions() {
  const [defs, setDefs] = useState(_cache || METRIC_FALLBACK);
  useEffect(() => {
    if (_cache) return;
    fetchMetricDefinitions()
      .then((d) => {
        _cache = d;
        setDefs(d);
      })
      .catch(() => setDefs(METRIC_FALLBACK));
  }, []);
  return defs;
}

export function findMetric(defs, key) {
  return defs.find((m) => m.key === key) || METRIC_FALLBACK.find((m) => m.key === key);
}

export const PRIMARY_KEYS = ["clarity", "specificity", "context_score", "instruction_quality"];
export const ALL_METRIC_KEYS = [
  "prompt_score",
  "clarity",
  "specificity",
  "ambiguity",
  "context_score",
  "instruction_quality",
  "complexity",
  "readability",
  "predicted_success_rate",
  "avg_response_quality",
];
// Radar/bar chart keys (exclude prompt_score which is a composite of these)
export const RADAR_KEYS = [
  "clarity",
  "specificity",
  "ambiguity",
  "context_score",
  "instruction_quality",
  "complexity",
  "readability",
  "predicted_success_rate",
  "avg_response_quality",
];
