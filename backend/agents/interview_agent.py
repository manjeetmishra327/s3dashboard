"""
Mock Interview Agent
Handles: question generation, answer evaluation, session report
Model: GPT-4o with JSON mode for structured outputs
"""

import os
import json
import logging
import uuid
from typing import Optional
from openai import AsyncOpenAI, APIError, APITimeoutError

logger = logging.getLogger(__name__)

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MODEL = "gpt-4o"

# ── Interview type configs ─────────────────────────────────────────────────────

INTERVIEW_CONFIGS = {
    "dsa": {
        "label": "Data Structures & Algorithms",
        "focus": "arrays, strings, trees, graphs, dynamic programming, sorting, searching, time/space complexity",
        "answer_format": "Explain your approach, walk through the algorithm, mention time/space complexity.",
    },
    "system_design": {
        "label": "System Design",
        "focus": "scalability, databases, caching, load balancing, microservices, APIs, message queues, CDN, CAP theorem",
        "answer_format": "Start with requirements clarification, then high-level design, then deep dive.",
    },
    "hr": {
        "label": "HR & Behavioural",
        "focus": "teamwork, conflict resolution, leadership, problem solving, career goals, strengths/weaknesses, STAR method",
        "answer_format": "Use STAR method: Situation, Task, Action, Result.",
    },
    "mixed": {
        "label": "Mixed (DSA + System Design + HR)",
        "focus": "combination of technical and behavioural questions typical in full interview loops",
        "answer_format": "Answer according to the question type. Technical: explain approach and complexity. Behavioural: use STAR method.",
    },
}

DIFFICULTY_LEVELS = ["easy", "medium", "hard"]


# ── Generate question ──────────────────────────────────────────────────────────

async def generate_question(
    interview_type: str,
    resume_text: str,
    job_description: str,
    previous_questions: list[str],
    question_number: int,
    total_questions: int,
) -> dict:
    """
    Generate a contextual interview question.
    Returns: { question, difficulty, expected_keywords, question_type }
    """
    config = INTERVIEW_CONFIGS.get(interview_type, INTERVIEW_CONFIGS["mixed"])
    prev_q_text = "\n".join([f"{i+1}. {q}" for i, q in enumerate(previous_questions)]) or "None"

    # Progress-based difficulty: start easy, ramp up
    if question_number <= total_questions // 3:
        difficulty_hint = "easy to medium"
    elif question_number <= (2 * total_questions) // 3:
        difficulty_hint = "medium"
    else:
        difficulty_hint = "medium to hard"

    system_prompt = f"""You are an expert technical interviewer at a top product company.
Your job is to generate a single, high-quality interview question for a {config['label']} interview.

Rules:
- Question must be UNIQUE and NOT repeat any previous question
- Question should be relevant to the candidate's resume and target role if provided
- Focus area: {config['focus']}
- Difficulty target: {difficulty_hint}
- Be specific and concise — no multi-part questions
- For DSA: ask about a specific problem or concept, not "tell me about yourself"
- For HR: ask situational or behavioural questions using real scenarios

Return ONLY valid JSON. No markdown, no preamble.
"""

    user_prompt = f"""Candidate Resume Summary:
{resume_text[:1500] if resume_text else 'Not provided'}

Job Description:
{job_description[:800] if job_description else 'Not provided'}

Interview Type: {config['label']}
Question {question_number} of {total_questions}
Previous Questions Asked:
{prev_q_text}

Generate question {question_number}. Return JSON in exactly this format:
{{
  "question": "<the full interview question>",
  "difficulty": "<easy|medium|hard>",
  "expected_keywords": ["<keyword1>", "<keyword2>", "<keyword3>", "<keyword4>", "<keyword5>"],
  "question_type": "<dsa|system_design|hr>",
  "hint_for_evaluator": "<what a good answer should cover in 1-2 sentences>"
}}"""

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
            max_tokens=500,
            timeout=20,
        )
        raw = response.choices[0].message.content
        data = json.loads(raw)

        # Validate and sanitise
        return {
            "question_id": str(uuid.uuid4()),
            "question": str(data.get("question", "")).strip(),
            "difficulty": data.get("difficulty", "medium") if data.get("difficulty") in DIFFICULTY_LEVELS else "medium",
            "expected_keywords": [str(k).lower() for k in data.get("expected_keywords", [])[:8]],
            "question_type": data.get("question_type", interview_type),
            "hint_for_evaluator": str(data.get("hint_for_evaluator", "")),
        }

    except (APIError, APITimeoutError) as e:
        logger.error(f"OpenAI error generating question: {e}")
        raise RuntimeError("Failed to generate question. Please try again.")
    except (json.JSONDecodeError, KeyError) as e:
        logger.error(f"JSON parse error in generate_question: {e}")
        raise RuntimeError("Invalid response from AI. Please try again.")


# ── Evaluate answer ────────────────────────────────────────────────────────────

async def evaluate_answer(
    question: str,
    user_answer: str,
    question_type: str,
    expected_keywords: list[str],
    hint_for_evaluator: str,
    difficulty: str,
) -> dict:
    """
    Score a candidate's answer 0-10 with detailed feedback.
    Returns: { score, feedback, strengths, improvements, keywords_matched }
    """
    if not user_answer or len(user_answer.strip()) < 10:
        return {
            "score": 0,
            "feedback": "No answer provided.",
            "strengths": [],
            "improvements": ["Please provide a detailed answer."],
            "keywords_matched": [],
        }

    config = INTERVIEW_CONFIGS.get(question_type, INTERVIEW_CONFIGS["mixed"])

    system_prompt = f"""You are a senior interviewer evaluating a candidate's answer.
Score honestly and fairly on a 0-10 scale.

Scoring rubric:
0-2: Completely wrong or no answer
3-4: Partial understanding, major gaps
5-6: Basic correct answer, missing depth
7-8: Good answer with minor gaps
9-10: Excellent, comprehensive, clear communication

Expected answer format: {config['answer_format']}
Difficulty level: {difficulty}
What a good answer should cover: {hint_for_evaluator}

Return ONLY valid JSON. Be constructive, specific, and honest."""

    user_prompt = f"""Question: {question}

Candidate's Answer: {user_answer[:2000]}

Expected keywords/concepts: {', '.join(expected_keywords)}

Evaluate and return JSON in exactly this format:
{{
  "score": <integer 0-10>,
  "feedback": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "keywords_matched": ["<keyword from expected list that was covered>"],
  "ideal_answer_summary": "<what the ideal answer would look like in 2-3 sentences>"
}}"""

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=600,
            timeout=25,
        )
        raw = response.choices[0].message.content
        data = json.loads(raw)

        score = int(data.get("score", 5))
        score = max(0, min(10, score))  # clamp 0-10

        return {
            "score": score,
            "feedback": str(data.get("feedback", "")).strip(),
            "strengths": [str(s) for s in data.get("strengths", [])[:4]],
            "improvements": [str(i) for i in data.get("improvements", [])[:4]],
            "keywords_matched": [str(k) for k in data.get("keywords_matched", [])[:8]],
            "ideal_answer_summary": str(data.get("ideal_answer_summary", "")),
        }

    except (APIError, APITimeoutError) as e:
        logger.error(f"OpenAI error evaluating answer: {e}")
        raise RuntimeError("Failed to evaluate answer. Please try again.")
    except (json.JSONDecodeError, KeyError, ValueError) as e:
        logger.error(f"Parse error in evaluate_answer: {e}")
        raise RuntimeError("Invalid evaluation response. Please try again.")


# ── Generate final report ──────────────────────────────────────────────────────

async def generate_report(session: dict) -> dict:
    """
    Generate an overall interview report from completed session.
    Returns: { overall_score, grade, summary, top_strengths, top_improvements, verdict }
    """
    questions = session.get("questions", [])
    if not questions:
        return {
            "overall_score": 0,
            "grade": "F",
            "summary": "No questions answered.",
            "top_strengths": [],
            "top_improvements": [],
            "verdict": "incomplete",
        }

    # Calculate weighted average (harder questions weighted more)
    weight_map = {"easy": 0.8, "medium": 1.0, "hard": 1.2}
    total_weight = 0
    weighted_sum = 0
    for q in questions:
        w = weight_map.get(q.get("difficulty", "medium"), 1.0)
        weighted_sum += q.get("score", 0) * w
        total_weight += w

    overall_score = round(weighted_sum / total_weight, 1) if total_weight else 0

    # Grade
    if overall_score >= 9:
        grade = "A+"
    elif overall_score >= 8:
        grade = "A"
    elif overall_score >= 7:
        grade = "B+"
    elif overall_score >= 6:
        grade = "B"
    elif overall_score >= 5:
        grade = "C"
    elif overall_score >= 3:
        grade = "D"
    else:
        grade = "F"

    interview_type = session.get("interview_type", "mixed")
    config = INTERVIEW_CONFIGS.get(interview_type, INTERVIEW_CONFIGS["mixed"])

    # Build context for GPT-4o summary
    qa_summary = []
    for i, q in enumerate(questions):
        qa_summary.append(
            f"Q{i+1} [{q.get('difficulty','medium')}]: {q.get('question','')[:150]}\n"
            f"Score: {q.get('score', 0)}/10\n"
            f"Feedback: {q.get('feedback','')[:200]}"
        )

    system_prompt = "You are a senior interviewer writing a post-interview assessment. Be honest, constructive, and specific. Return only valid JSON."

    user_prompt = f"""Interview type: {config['label']}
Overall score: {overall_score}/10 (Grade: {grade})

Questions and scores:
{chr(10).join(qa_summary)}

Write a post-interview assessment. Return JSON:
{{
  "summary": "<3-4 sentence overall assessment of candidate performance>",
  "top_strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "top_improvements": ["<improvement area 1>", "<improvement area 2>", "<improvement area 3>"],
  "verdict": "<strong hire|hire|borderline|no hire>",
  "next_steps": "<1-2 sentences on what the candidate should study or practise next>"
}}"""

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.4,
            max_tokens=600,
            timeout=25,
        )
        data = json.loads(response.choices[0].message.content)

        return {
            "overall_score": overall_score,
            "grade": grade,
            "summary": str(data.get("summary", "")),
            "top_strengths": [str(s) for s in data.get("top_strengths", [])[:5]],
            "top_improvements": [str(i) for i in data.get("top_improvements", [])[:5]],
            "verdict": str(data.get("verdict", "borderline")),
            "next_steps": str(data.get("next_steps", "")),
        }

    except (APIError, APITimeoutError, json.JSONDecodeError) as e:
        logger.error(f"Error generating report: {e}")
        # Fallback report without GPT summary
        return {
            "overall_score": overall_score,
            "grade": grade,
            "summary": f"You completed a {config['label']} interview with an overall score of {overall_score}/10.",
            "top_strengths": [],
            "top_improvements": [],
            "verdict": "borderline" if overall_score >= 5 else "no hire",
            "next_steps": "Review your answers and practise the areas where you scored below 6.",
        }