#!/usr/bin/env python3
"""
Test script for Gemini AI integration in the Resume Parser Service
"""

import requests
import json
import os

def test_gemini_health():
    """Test if Gemini API is working"""
    try:
        import google.generativeai as genai
        
        # Configure with the API key
        GEMINI_API_KEY = "AIzaSyDMQK4qarqXMMJweaMFw8HBoPOo6z1XbEM"
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-pro')
        
        # Test with a simple prompt
        response = model.generate_content("Hello, can you respond with 'Gemini is working'?")
        print("✅ Gemini API is working")
        print(f"Response: {response.text}")
        return True
        
    except Exception as e:
        print(f"❌ Gemini API error: {e}")
        return False

def test_python_service_health():
    """Test if Python service is running"""
    try:
        response = requests.get("http://localhost:8000/health")
        if response.status_code == 200:
            print("✅ Python service is running")
            return True
        else:
            print(f"❌ Python service health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Python service is not running on port 8000")
        return False
    except Exception as e:
        print(f"❌ Python service error: {e}")
        return False

def test_improve_resume_endpoint():
    """Test the improve-resume endpoint"""
    try:
        test_data = {
            "resume_text": "Software Developer with 3 years experience in JavaScript and React",
            "skills": ["JavaScript", "React", "HTML", "CSS"],
            "ats_score": 75,
            "current_suggestions": ["Add more technical skills"]
        }
        
        response = requests.post(
            "http://localhost:8000/improve-resume",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            print("✅ Improve resume endpoint is working")
            result = response.json()
            print(f"AI Suggestions: {json.dumps(result, indent=2)}")
            return True
        else:
            print(f"❌ Improve resume endpoint failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Improve resume endpoint error: {e}")
        return False

def test_nextjs_api():
    """Test the Next.js resume improve API"""
    try:
        # This would require authentication, so we'll just test the endpoint exists
        response = requests.post("http://localhost:3000/api/resume/improve")
        
        # We expect a 401 (unauthorized) since we're not sending auth headers
        if response.status_code == 401:
            print("✅ Next.js API endpoint exists (returns 401 as expected)")
            return True
        else:
            print(f"⚠️  Next.js API returned unexpected status: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Next.js server is not running on port 3000")
        return False
    except Exception as e:
        print(f"❌ Next.js API error: {e}")
        return False

def main():
    """Run all tests"""
    print("Testing Gemini AI Integration")
    print("=" * 40)
    
    # Test Gemini API directly
    gemini_ok = test_gemini_health()
    
    # Test Python service
    python_ok = test_python_service_health()
    
    if python_ok:
        # Test improve resume endpoint
        improve_ok = test_improve_resume_endpoint()
    else:
        improve_ok = False
    
    # Test Next.js API
    nextjs_ok = test_nextjs_api()
    
    print("\n" + "=" * 40)
    print("Test Results Summary:")
    print(f"Gemini API: {'✅ Working' if gemini_ok else '❌ Failed'}")
    print(f"Python Service: {'✅ Working' if python_ok else '❌ Failed'}")
    print(f"Improve Resume Endpoint: {'✅ Working' if improve_ok else '❌ Failed'}")
    print(f"Next.js API: {'✅ Working' if nextjs_ok else '❌ Failed'}")
    
    if gemini_ok and python_ok and improve_ok:
        print("\n🎉 All Gemini integration tests passed!")
    else:
        print("\n⚠️  Some tests failed. Check the errors above.")

if __name__ == "__main__":
    main()

