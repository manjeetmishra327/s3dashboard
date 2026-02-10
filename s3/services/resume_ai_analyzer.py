import sys
import json
import os

# Try to import Google Generative AI
try:
    import google.generativeai as genai
except ImportError:
    print(json.dumps({"error": "google-generativeai not installed. Run: pip install google-generativeai"}))
    sys.exit(1)

def analyze_resume_with_ai(resume_data, job_description=None):
    """
    Analyze resume using Gemini AI and provide detailed feedback
    
    Args:
        resume_data: Dict containing parsed resume data (skills, experience, education, etc.)
        job_description: Optional job description to match against
    
    Returns:
        Dict with AI-generated suggestions and scoring
    """
    
    # Get API key from environment
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        return {
            "error": "GEMINI_API_KEY not found in environment variables",
            "suggestions": [],
            "score_breakdown": {}
        }
    
    try:
        # Configure Gemini
        genai.configure(api_key=api_key)
        
        # Use Gemini 1.5 Flash - stable, reliable model
        model = genai.GenerativeModel('models/gemini-1.5-flash')
        
        # Prepare resume summary
        resume_summary = f"""
Resume Analysis Request:

SKILLS: {', '.join(resume_data.get('skills', [])[:20])}
EXPERIENCE: {' | '.join(resume_data.get('experience', [])[:5])}
EDUCATION: {' | '.join(resume_data.get('education', [])[:3])}
CONTACT: {resume_data.get('contact', {})}
WORD COUNT: {resume_data.get('word_count', 0)}

{f"TARGET JOB DESCRIPTION: {job_description}" if job_description else ""}
"""
        
        # Create STRICT, CRITICAL prompt for realistic AI analysis
        prompt = f"""You are a HIGHLY CRITICAL professional resume reviewer with 15+ years of experience. You have seen thousands of resumes and have VERY HIGH STANDARDS. Most resumes you review score between 40-70%. Only exceptional resumes score above 80%.

**CRITICAL INSTRUCTIONS:**
- Be BRUTALLY HONEST and REALISTIC in your assessment
- DO NOT be generous with scores - most resumes have significant flaws
- ONLY extract and reference skills that are EXPLICITLY listed in the Skills section
- If the resume is weak, say so directly with a low score (30-50%)
- If the resume is average, give it 50-65%
- Only excellent, well-crafted resumes should get 70%+
- A perfect 90-100% resume is EXTREMELY rare

{resume_summary}

**ANALYZE THIS RESUME WITH STRICT STANDARDS:**

Provide a comprehensive, HONEST analysis in JSON format:

{{
  "overall_score": <number 0-100, be REALISTIC - most resumes are 45-65%>,
  "score_breakdown": {{
    "content_quality": <0-100, check for quantifiable achievements, action verbs>,
    "ats_optimization": <0-100, check format, keywords, standard sections>,
    "skills_relevance": <0-100, based ONLY on skills explicitly listed>,
    "experience_presentation": <0-100, check for impact, metrics, clarity>,
    "formatting": <0-100, check structure, readability, professionalism>
  }},
  "strengths": [
    "List 2-3 genuine strong points (be honest, if there are none, say 'Limited strengths identified')"
  ],
  "weaknesses": [
    "List 4-6 CRITICAL weaknesses that hurt this resume (be specific and harsh)"
  ],
  "suggestions": [
    {{
      "category": "Skills/Experience/Format/Content",
      "priority": "high/medium/low",
      "suggestion": "Specific, actionable fix",
      "reason": "Direct impact on job prospects"
    }}
  ],
  "missing_skills": [
    "Skills that should be added based on current industry standards"
  ],
  "ats_issues": [
    "Specific ATS problems that will get this resume rejected"
  ],
  "keyword_recommendations": [
    "Critical keywords missing from the resume"
  ],
  "action_items": [
    "Top 5 immediate actions to improve this resume, prioritized by impact"
  ]
}}

**SCORING GUIDELINES (FOLLOW STRICTLY):**
- 0-30%: Severely flawed, missing critical sections
- 31-50%: Below average, needs major improvements
- 51-65%: Average resume with notable gaps
- 66-75%: Good resume with minor improvements needed
- 76-85%: Very good, professional resume
- 86-95%: Excellent, standout resume
- 96-100%: Perfect (extremely rare)

**Remember:** Be CRITICAL, HONEST, and HELPFUL. A realistic low score with actionable feedback is more valuable than false praise.

Provide ONLY the JSON response, no additional text."""

        # Generate AI response
        response = model.generate_content(prompt)
        
        # Parse JSON from response
        response_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        
        response_text = response_text.strip()
        
        # Parse JSON
        ai_analysis = json.loads(response_text)
        
        return ai_analysis
        
    except json.JSONDecodeError as e:
        return {
            "error": f"Failed to parse AI response: {str(e)}",
            "raw_response": response_text if 'response_text' in locals() else None,
            "overall_score": 0,
            "suggestions": []
        }
    except Exception as e:
        return {
            "error": f"AI analysis failed: {str(e)}",
            "overall_score": 0,
            "suggestions": []
        }

def calculate_basic_score(resume_data):
    """
    Calculate a REALISTIC basic score without AI (fallback) - STRICT evaluation
    """
    score = 0
    breakdown = {
        "content_quality": 0,
        "ats_optimization": 0,
        "skills_relevance": 0,
        "experience_presentation": 0,
        "formatting": 0
    }
    
    # Skills scoring (0-20 points) - STRICT
    skills_count = len(resume_data.get('skills', []))
    if skills_count >= 12:
        breakdown["skills_relevance"] = 80
        score += 18
    elif skills_count >= 8:
        breakdown["skills_relevance"] = 65
        score += 13
    elif skills_count >= 5:
        breakdown["skills_relevance"] = 50
        score += 10
    elif skills_count >= 3:
        breakdown["skills_relevance"] = 35
        score += 7
    else:
        breakdown["skills_relevance"] = 20
        score += 4
    
    # Experience scoring (0-30 points) - STRICT
    experience = resume_data.get('experience', [])
    exp_count = len([e for e in experience if not e.startswith('No work experience') and len(e) > 30])
    
    if exp_count >= 4:
        breakdown["experience_presentation"] = 75
        score += 23
    elif exp_count >= 3:
        breakdown["experience_presentation"] = 65
        score += 20
    elif exp_count >= 2:
        breakdown["experience_presentation"] = 50
        score += 15
    elif exp_count >= 1:
        breakdown["experience_presentation"] = 35
        score += 10
    else:
        breakdown["experience_presentation"] = 15
        score += 5
    
    # Education scoring (0-15 points) - STRICT
    education = resume_data.get('education', [])
    edu_count = len([e for e in education if not e.startswith('No education') and len(e) > 20])
    
    if edu_count >= 2:
        breakdown["content_quality"] = 70
        score += 15
    elif edu_count >= 1:
        breakdown["content_quality"] = 50
        score += 10
    else:
        breakdown["content_quality"] = 25
        score += 5
    
    # Contact info scoring (0-10 points)
    contact = resume_data.get('contact', {})
    if contact.get('emails') and contact.get('phones'):
        breakdown["ats_optimization"] = 70
        score += 10
    elif contact.get('emails') or contact.get('phones'):
        breakdown["ats_optimization"] = 40
        score += 5
    else:
        breakdown["ats_optimization"] = 20
        score += 2
    
    # Word count scoring (0-15 points) - STRICT
    word_count = resume_data.get('word_count', 0)
    if 400 <= word_count <= 800:
        breakdown["formatting"] = 75
        score += 15
    elif 300 <= word_count <= 1000:
        breakdown["formatting"] = 60
        score += 12
    elif 200 <= word_count:
        breakdown["formatting"] = 45
        score += 9
    else:
        breakdown["formatting"] = 30
        score += 5
    
    # Apply penalty for overall weak resume
    if skills_count < 5 and exp_count < 2:
        score = max(20, score - 10)  # Significant penalty
    
    return {
        "overall_score": min(score, 100),
        "score_breakdown": breakdown,
        "method": "basic_calculation",
        "note": "This is a fallback score. AI analysis unavailable."
    }

def main():
    """
    Main function to handle command line arguments
    """
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No resume data provided"}))
        sys.exit(1)
    
    try:
        # Parse resume data from command line argument
        resume_data = json.loads(sys.argv[1])
        
        # Get optional job description
        job_description = sys.argv[2] if len(sys.argv) > 2 else None
        
        # Try AI analysis first
        ai_result = analyze_resume_with_ai(resume_data, job_description)
        
        # If AI analysis failed, use basic scoring
        if 'error' in ai_result and 'overall_score' not in ai_result:
            basic_result = calculate_basic_score(resume_data)
            result = {
                **basic_result,
                "ai_error": ai_result.get('error'),
                "suggestions": [
                    {
                        "category": "General",
                        "priority": "high",
                        "suggestion": "AI analysis unavailable. Using basic scoring.",
                        "reason": ai_result.get('error', 'Unknown error')
                    }
                ]
            }
        else:
            result = ai_result
        
        # Output result as JSON
        print(json.dumps(result, indent=2))
        
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {str(e)}"}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"Analysis failed: {str(e)}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()
