"""
Mock Interview Agent — v2
Supports 14 interview types, experience levels, company tiers
Model: GPT-4o with JSON mode
"""

import os
import json
import logging
import uuid
from openai import AsyncOpenAI, APIError, APITimeoutError

logger = logging.getLogger(__name__)

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MODEL = "gpt-4o"

# ── Interview type configs ─────────────────────────────────────────────────────

INTERVIEW_CONFIGS = {
    "dsa": {
        "label": "Data Structures & Algorithms",
        "focus": "arrays, strings, linked lists, stacks, queues, trees, graphs, dynamic programming, recursion, sorting, searching, sliding window, two pointers, time/space complexity",
        "answer_format": "Explain your approach first, walk through the algorithm step by step, state time and space complexity, mention edge cases.",
        "question_type": "dsa",
    },
    "system_design": {
        "label": "System Design",
        "focus": "scalability, load balancing, databases (SQL/NoSQL), caching (Redis, Memcached), message queues (Kafka, RabbitMQ), microservices, CDN, rate limiting, CAP theorem, sharding, replication, API design",
        "answer_format": "Clarify requirements → estimate scale → high-level design → deep dive on components → discuss trade-offs.",
        "question_type": "system_design",
    },
    "frontend_general": {
        "label": "Frontend Development",
        "focus": "HTML5 semantics, CSS specificity, JavaScript (ES6+), event loop, closures, prototypes, DOM manipulation, browser storage, Web APIs, performance, accessibility, CORS, bundlers",
        "answer_format": "Explain the concept clearly, give a practical example, mention browser compatibility or performance implications where relevant.",
        "question_type": "frontend",
    },
    "react": {
        "label": "React / Next.js",
        "focus": "React hooks (useState, useEffect, useCallback, useMemo, useRef, useContext), component lifecycle, state management (Redux, Zustand, Context), virtual DOM, reconciliation, Server Components, SSR vs SSG, hydration, performance optimization, code splitting",
        "answer_format": "Explain the concept, show how it works in practice, discuss when to use it and common pitfalls.",
        "question_type": "frontend",
    },
    "css_ui": {
        "label": "CSS & UI Engineering",
        "focus": "Flexbox, CSS Grid, responsive design, media queries, CSS variables, animations and transitions, specificity, BEM, Tailwind, CSS-in-JS, web performance (CLS, LCP, FID), design systems",
        "answer_format": "Explain the concept, describe how you'd implement it, mention cross-browser considerations.",
        "question_type": "frontend",
    },
    "backend_general": {
        "label": "Backend Development",
        "focus": "REST vs GraphQL, authentication (JWT, OAuth, sessions), authorization, middleware, rate limiting, caching strategies, database design, N+1 problem, pagination, background jobs, webhooks, API versioning, error handling",
        "answer_format": "Explain the concept, describe your implementation approach, discuss security and performance implications.",
        "question_type": "backend",
    },
    "nodejs": {
        "label": "Node.js",
        "focus": "event loop, libuv, non-blocking I/O, streams, Buffer, EventEmitter, cluster module, worker threads, Express middleware, async/await vs callbacks vs Promises, memory leaks, garbage collection, npm ecosystem",
        "answer_format": "Explain how Node handles it internally, give a practical code-level example, mention performance characteristics.",
        "question_type": "backend",
    },
    "python": {
        "label": "Python / Django / FastAPI",
        "focus": "Python internals (GIL, memory management), decorators, generators, async/await, context managers, FastAPI dependency injection, Django ORM, migrations, signals, Celery, type hints, list comprehensions, data classes",
        "answer_format": "Explain the concept, show a practical Python example, mention Pythonic best practices.",
        "question_type": "backend",
    },
    "java_spring": {
        "label": "Java / Spring Boot",
        "focus": "JVM internals, garbage collection, threading, concurrency (synchronized, locks, ExecutorService), Spring IoC container, dependency injection, Spring Boot auto-configuration, JPA/Hibernate, transactions, AOP, microservices with Spring Cloud",
        "answer_format": "Explain the concept with Java specifics, mention JVM behavior, discuss Spring framework patterns.",
        "question_type": "backend",
    },
    "dotnet": {
        "label": ".NET / C#",
        "focus": "CLR, managed memory, garbage collection, async/await (Task, ValueTask), LINQ, Entity Framework Core, dependency injection, ASP.NET Core middleware pipeline, delegates and events, generics, reflection, Blazor, SignalR",
        "answer_format": "Explain the .NET/C# concept, show practical usage, discuss CLR behavior or framework patterns.",
        "question_type": "backend",
    },
    "fullstack": {
        "label": "Full Stack Development",
        "focus": "end-to-end application design, frontend-backend communication (REST, WebSockets, tRPC), authentication flows, database design, deployment (Docker, CI/CD), environment config, performance across the stack, monorepo structure",
        "answer_format": "Think end-to-end. Describe how the pieces connect, highlight where bottlenecks/failures can occur.",
        "question_type": "fullstack",
    },
    "os": {
        "label": "Operating Systems",
        "focus": "processes vs threads, context switching, scheduling algorithms (FCFS, SJF, Round Robin), deadlocks (conditions, prevention, detection), memory management (paging, segmentation, virtual memory), IPC (pipes, semaphores, mutexes), file systems",
        "answer_format": "Explain the OS concept precisely, give a real-world analogy or example, mention how it affects application performance.",
        "question_type": "core_cs",
    },
    "dbms": {
        "label": "DBMS & SQL",
        "focus": "normalization (1NF to BCNF), ACID properties, transactions, isolation levels, indexing (B-tree, hash), query optimization, execution plans, joins, window functions, stored procedures, NoSQL vs SQL trade-offs, CAP theorem",
        "answer_format": "Explain the database concept, write SQL if relevant, discuss performance implications and when to use which approach.",
        "question_type": "core_cs",
    },
    "networks": {
        "label": "Computer Networks",
        "focus": "OSI and TCP/IP models, TCP vs UDP, HTTP/1.1 vs HTTP/2 vs HTTP/3, HTTPS and TLS handshake, DNS resolution, sockets, IP addressing, subnetting, load balancers, firewalls, WebSockets, REST vs gRPC",
        "answer_format": "Explain the networking concept clearly, describe what happens at each layer if relevant, give a practical example.",
        "question_type": "core_cs",
    },
    "oops": {
        "label": "Object-Oriented Programming",
        "focus": "SOLID principles, design patterns (Singleton, Factory, Observer, Strategy, Decorator, Repository), inheritance vs composition, polymorphism, encapsulation, abstraction, interface vs abstract class, dependency inversion, coupling vs cohesion",
        "answer_format": "Explain the concept, show a code-level example or diagram in words, explain when and why to apply it.",
        "question_type": "core_cs",
    },
    "hr": {
        "label": "HR & Behavioural",
        "focus": "teamwork and collaboration, conflict resolution, handling failure and learning from it, leadership and ownership, communication, career motivation, strengths and weaknesses, ambiguous situations, cross-functional work, time management",
        "answer_format": "Use the STAR method: Situation → Task → Action → Result. Be specific with real examples.",
        "question_type": "hr",
    },
    "mixed": {
        "label": "Mixed (Full Loop)",
        "focus": "combination of DSA, system design, and behavioural questions as seen in full interview loops at product companies",
        "answer_format": "Answer based on question type. DSA: approach + complexity. System design: structured design. HR: STAR method.",
        "question_type": "mixed",
    },
}

DIFFICULTY_LEVELS = ["easy", "medium", "hard"]

EXPERIENCE_PROMPTS = {
    "fresher": "The candidate is a fresher (0-1 year experience). Ask foundational questions. Do not expect deep production experience.",
    "junior":  "The candidate has 1-3 years experience. Ask practical questions with some depth. Expect familiarity with core concepts.",
    "mid":     "The candidate has 3-5 years experience. Ask questions that test depth of understanding, trade-off analysis, and production experience.",
    "senior":  "The candidate has 5+ years experience. Ask advanced questions involving architecture decisions, trade-offs, team leadership, and system-level thinking.",
}

COMPANY_PROMPTS = {
    "faang":   "This is for a FAANG/Big Tech company (Google, Meta, Amazon, etc.). Questions should be rigorous and test deep fundamentals and problem-solving.",
    "product": "This is for a product startup. Focus on practical problem-solving, ownership, and shipping quality features under constraints.",
    "service": "This is for an IT services company. Focus on concepts, implementations, and project-based experience.",
    "any":     "General interview preparation. Balance theory and practice.",
}


# ── Generate question ──────────────────────────────────────────────────────────

async def generate_question(
    interview_type: str,
    resume_text: str,
    job_description: str,
    previous_questions: list,
    question_number: int,
    total_questions: int,
    experience_level: str = "junior",
    company_tier: str = "any",
) -> dict:
    config = INTERVIEW_CONFIGS.get(interview_type, INTERVIEW_CONFIGS["mixed"])
    prev_q_text = "\n".join([f"{i+1}. {q}" for i, q in enumerate(previous_questions)]) or "None"

    # Progressive difficulty
    if question_number <= total_questions // 3:
        difficulty_hint = "easy to medium"
    elif question_number <= (2 * total_questions) // 3:
        difficulty_hint = "medium"
    else:
        difficulty_hint = "medium to hard"

    exp_context = EXPERIENCE_PROMPTS.get(experience_level, EXPERIENCE_PROMPTS["junior"])
    company_context = COMPANY_PROMPTS.get(company_tier, COMPANY_PROMPTS["any"])

    system_prompt = f"""You are an expert technical interviewer conducting a {config['label']} interview.

Candidate context:
- {exp_context}
- {company_context}

Your rules:
- Generate ONE unique, high-quality question
- Do NOT repeat any previous question
- Focus area: {config['focus']}
- Target difficulty: {difficulty_hint}
- Keep questions specific and answerable — no open-ended "tell me about yourself" for technical rounds
- For DSA: ask about a concrete algorithmic problem or concept
- For system design: ask to design a specific real-world system or component
- For HR: ask a specific situational or behavioural scenario
- For code-focused types: questions can include "write" or "implement" style prompts

Return ONLY valid JSON. No markdown, no preamble."""

    user_prompt = f"""Resume Summary:
{resume_text[:1500] if resume_text else 'Not provided'}

Job Description:
{job_description[:800] if job_description else 'Not provided'}

Interview: {config['label']} | Question {question_number} of {total_questions}
Experience Level: {experience_level} | Company Tier: {company_tier}

Previously asked questions:
{prev_q_text}

Return JSON in exactly this format:
{{
  "question": "<the full interview question>",
  "difficulty": "<easy|medium|hard>",
  "expected_keywords": ["<kw1>", "<kw2>", "<kw3>", "<kw4>", "<kw5>"],
  "question_type": "<{config['question_type']}>",
  "hint_for_evaluator": "<what a strong answer must cover in 1-2 sentences>"
}}"""

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.75,
            max_tokens=512,
            timeout=20,
        )
        data = json.loads(response.choices[0].message.content)
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
    expected_keywords: list,
    hint_for_evaluator: str,
    difficulty: str,
    experience_level: str = "junior",
) -> dict:
    if not user_answer or len(user_answer.strip()) < 10:
        return {
            "score": 0,
            "feedback": "No meaningful answer provided.",
            "strengths": [],
            "improvements": ["Please provide a detailed answer."],
            "keywords_matched": [],
            "ideal_answer_summary": "",
        }

    config = INTERVIEW_CONFIGS.get(question_type, INTERVIEW_CONFIGS["mixed"])
    exp_context = EXPERIENCE_PROMPTS.get(experience_level, EXPERIENCE_PROMPTS["junior"])

    system_prompt = f"""You are a senior interviewer evaluating a candidate's answer.
{exp_context}

Scoring rubric (0–10):
0–2: Completely wrong or missing
3–4: Partial, major gaps or misconceptions
5–6: Correct basics, lacks depth or clarity
7–8: Good answer, minor gaps
9–10: Excellent — precise, complete, well-communicated

Expected answer format: {config['answer_format']}
Difficulty: {difficulty}
What a strong answer covers: {hint_for_evaluator}

Be honest and specific. Return ONLY valid JSON."""

    user_prompt = f"""Question: {question}

Candidate Answer: {user_answer[:2500]}

Expected keywords/concepts: {', '.join(expected_keywords)}

Return JSON:
{{
  "score": <integer 0-10>,
  "feedback": "<2-3 sentence honest assessment>",
  "strengths": ["<specific strength>", "<specific strength>"],
  "improvements": ["<specific gap>", "<specific gap>"],
  "keywords_matched": ["<matched keyword>"],
  "ideal_answer_summary": "<what an ideal answer looks like in 2-3 sentences>"
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
        data = json.loads(response.choices[0].message.content)
        score = max(0, min(10, int(data.get("score", 5))))
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
    questions = session.get("questions", [])
    if not questions:
        return {
            "overall_score": 0, "grade": "F",
            "summary": "No questions answered.",
            "top_strengths": [], "top_improvements": [],
            "verdict": "incomplete", "next_steps": "",
        }

    weight_map = {"easy": 0.8, "medium": 1.0, "hard": 1.2}
    total_weight = sum(weight_map.get(q.get("difficulty", "medium"), 1.0) for q in questions)
    weighted_sum = sum(
        q.get("score", 0) * weight_map.get(q.get("difficulty", "medium"), 1.0)
        for q in questions
    )
    overall_score = round(weighted_sum / total_weight, 1) if total_weight else 0

    if overall_score >= 9:   grade = "A+"
    elif overall_score >= 8: grade = "A"
    elif overall_score >= 7: grade = "B+"
    elif overall_score >= 6: grade = "B"
    elif overall_score >= 5: grade = "C"
    elif overall_score >= 3: grade = "D"
    else:                    grade = "F"

    interview_type = session.get("interview_type", "mixed")
    experience_level = session.get("experience_level", "junior")
    company_tier = session.get("company_tier", "any")
    config = INTERVIEW_CONFIGS.get(interview_type, INTERVIEW_CONFIGS["mixed"])

    qa_summary = "\n\n".join([
        f"Q{i+1} [{q.get('difficulty','medium')}]: {q.get('question','')[:150]}\n"
        f"Score: {q.get('score', 0)}/10 | {q.get('feedback','')[:200]}"
        for i, q in enumerate(questions)
    ])

    system_prompt = "You are a senior hiring manager writing a post-interview assessment. Be specific, honest, and constructive. Return only valid JSON."
    user_prompt = f"""Interview: {config['label']} | Level: {experience_level} | Target: {company_tier}
Overall: {overall_score}/10 (Grade: {grade})

{qa_summary}

Return JSON:
{{
  "summary": "<3-4 sentence overall candidate assessment>",
  "top_strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "top_improvements": ["<specific area 1>", "<specific area 2>", "<specific area 3>"],
  "verdict": "<strong hire|hire|borderline|no hire>",
  "next_steps": "<1-2 specific sentences on what to study or practice next>"
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
        return {
            "overall_score": overall_score,
            "grade": grade,
            "summary": f"Completed {config['label']} interview with score {overall_score}/10.",
            "top_strengths": [],
            "top_improvements": [],
            "verdict": "borderline" if overall_score >= 5 else "no hire",
            "next_steps": "Review questions where you scored below 6 and practice those concepts.",
        }