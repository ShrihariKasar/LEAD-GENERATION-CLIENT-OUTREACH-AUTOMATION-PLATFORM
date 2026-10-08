# THREADLINE — AI Qualification & Decision Engine

THREADLINE implements a grounded qualification engine combining deterministic multi-factor ICP scoring with structured OpenAI intelligence.

## 1. Grounding Guardrails
The AI engine operates under strict operational guardrails:
1. **Fact-Grounded Prompting**: Context supplied to the model is strictly limited to verified database records (job title, headcount, company domain, explicit conversation turns).
2. **Anti-Hallucination**: The AI is explicitly forbidden from inventing company achievements, funding announcements, fictitious requirements, or speculative pain points.
3. **Anti-Repetition Memory**: Every asked question is recorded in `qualification_answers`. The prompt provides previous questions and rejects semantically redundant candidate questions.
4. **Structured JSON Output**: Model outputs are constrained to strict JSON schemas adhering to the qualification schema:
   - `intent_category` (`INTERESTED`, `MEETING_REQUEST`, `QUESTION`, `OBJECTION`, `OPT_OUT`, `UNCERTAIN`)
   - `buying_intent` (`HIGH`, `MEDIUM`, `LOW`, `UNKNOWN`)
   - `qualification_status` (`QUALIFIED`, `POTENTIAL`, `NOT_QUALIFIED`, `NEEDS_HUMAN`)
   - `pain_points[]` & `requirements[]`
   - `recommended_action` & `next_best_action_text`
   - `needs_human_review` & `human_handoff_reason`
   - `confidence` (0.0 to 1.0)

## 2. Conversation State Machine
Conversations transition deterministically across the following lifecycle:
```
[ NEW ]
   │
   ├─► Outreach Sent ─────────► [ CONTACTED ]
   │                                  │
   │                                  ├─► Inbound Reply
   │                                  v
   ├─► Webhook Inbound ──────► [ ENGAGED ]
   │                                  │
   ├─► Asking Qs ─────────────► [ QUALIFYING ]
   │                                  │
   ├─► Fit Confirmed ─────────► [ QUALIFIED ]
   │                                  │
   ├─► Meeting Requested ─────► [ MEETING_INTENT ]
   │                                  │
   ├─► Calendar Slots Sent ───► [ MEETING_PROPOSED ]
   │                                  │
   ├─► Event Confirmed ───────► [ MEETING_SCHEDULED ]
   │
   ├─► Complex Issue / Request─► [ HUMAN_REVIEW ] (AI Paused)
   │
   └─► Opt-Out Detected ──────► [ OPTED_OUT ] (DO_NOT_CONTACT)
```

## 3. Human-in-the-Loop Escalations
The system automatically pauses automated AI responses and sets state to `HUMAN_REVIEW` when:
- Pricing or contract terms are negotiated
- Security, legal, or compliance questions are asked
- Negative sentiment or angry complaints are received
- The prospect explicitly requests a human representative
- AI model uncertainty falls below acceptable confidence thresholds
