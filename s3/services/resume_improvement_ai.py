import sys
import json
import os

try:
    import google.generativeai as genai
except ImportError:
    print(json.dumps({"error": "google-generativeai not installed"}))
    sys.exit(1)


def generate_improvement_suggestions(resume_data):
    """
    Generate detailed resume improvement suggestions using Gemini AI
    """
    
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        return {"error": "GEMINI_API_KEY not found"}
    
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('models/gemini-1.5-flash')
        
        # Prepare resume context
        skills = ', '.join(resume_data.get('skills', [])[:30])
        experience = ' | '.join(resume_data.get('experience', [])[:5])
        education = ' | '.join(resume_data.get('education', [])[:3])
        current_score = resume_data.get('current_score', 0)
        
        prompt = f"""
You are an expert resume consultant and ATS optimization specialist. Use one consistent rubric to score and suggest improvements.

Resume (structured):
- Skills: {skills}
- Experience: {experience}
- Education: {education}
- Current Analysis Score: {current_score}/100

Scoring rubric (0–100 total):
1. Overall structure (20)
2. Skill relevance (40)
3. Readability (20)
4. ATS compatibility (20)

Return ONLY valid JSON matching exactly:
{{
  "scores": {{
    "overall_structure": <0-20 integer>,
    "skill_relevance": <0-40 integer>,
    "readability": <0-20 integer>,
    "ats_compatibility": <0-20 integer>,
    "total": <0-100 integer>
  }},
  "suggestions": [
    {{"title": "...", "description": "..."}},
    {{"title": "...", "description": "..."}},
    {{"title": "...", "description": "..."}}
  ],
  "critical_improvements": [
    {{"title": "...", "description": "...", "priority": "high|medium|low", "impact": "...", "examples": ["...","..."]}}
  ],
  "skills_recommendations": {{
    "trending_skills": ["..."],
    "missing_keywords": ["..."],
    "skills_to_highlight": ["..."]
  }},
  "content_improvements": {{
    "experience": ["..."],
    "format": ["..."],
    "summary": ["..."]
  }},
  "ats_optimization_tips": ["..."],
  "next_steps": [{{"step": 1, "action": "...", "time": "..."}}],
  "industry_insights": {{
    "current_trends": ["..."],
    "recruiter_preferences": ["..."],
    "common_mistakes": ["..."]
  }},
  "overall_score": <same as scores.total>,
  "improvement_potential": <realistic integer 5-25>
}}

Rules:
- Use the rubric above for both scoring and suggestions; they must align.
- Return ONLY raw JSON, no markdown fences.
- Keep scores realistic; base on the provided content.
"""

        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Clean up response
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        # Parse and validate JSON
        data = json.loads(response_text)
        # Normalize and back-compat
        if 'scores' in data and isinstance(data['scores'], dict):
            total = data['scores'].get('total')
            if isinstance(total, int):
                data['overall_score'] = total
        if 'overall_score' not in data:
            data['overall_score'] = current_score
        if 'improvement_potential' not in data:
            data['improvement_potential'] = max(5, min(25, 100 - int(data['overall_score'])))
        if 'suggestions' not in data or not isinstance(data['suggestions'], list):
            crit = data.get('critical_improvements', [])
            data['suggestions'] = [
                {"title": c.get('title','Improve resume'), "description": c.get('description','Refine content for ATS and clarity')} for c in crit[:3]
            ] or [
                {"title": "Clarify summary", "description": "Write a concise, metrics-driven summary."},
                {"title": "Highlight relevant skills", "description": "Move key skills to a dedicated section."},
                {"title": "Quantify achievements", "description": "Add metrics to experience bullets."}
            ]
        return data
        
    except json.JSONDecodeError as e:
        return {
            "error": f"JSON parsing error: {str(e)}",
            "raw_response": response_text[:500] if 'response_text' in locals() else "No response"
        }
    except Exception as e:
        return {"error": f"AI generation failed: {str(e)}"}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Resume data required"}))
        sys.exit(1)
    
    try:
        resume_data = json.loads(sys.argv[1])
        result = generate_improvement_suggestions(resume_data)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except json.JSONDecodeError:
        print(json.dumps({"error": "Invalid JSON input"}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
