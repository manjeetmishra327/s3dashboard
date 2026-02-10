import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

const uri = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB;
const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request) {
  let client = null;
  
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    let userId = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.userId;
      } catch (error) {
        console.log('Token verification failed, continuing without auth');
      }
    }

    const body = await request.json();
    const { resumeData, currentScore, currentAnalysis, requestType = 'comprehensive' } = body;

    if (!resumeData) {
      return NextResponse.json(
        { error: 'Resume data is required' },
        { status: 400 }
      );
    }

    // Check if API key is available
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured');
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      );
    }

    // Prepare enhanced data for AI analysis - use ACTUAL current score
    const enhancedData = {
      ...resumeData,
      current_score: currentScore || currentAnalysis?.overall_score || 0,
      request_type: requestType,
      focus_areas: ['skills', 'experience', 'ats_optimization', 'content_quality']
    };

    // Call Python AI improvement analyzer
    const pythonScript = path.join(process.cwd(), 'services', 'resume_improvement_ai.py');
    
    const args = [pythonScript, JSON.stringify(enhancedData)];

    const pythonProcess = spawn('python', args, {
      env: {
        ...process.env,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY
      }
    });

    let result = '';
    let error = '';

    // Collect stdout
    for await (const chunk of pythonProcess.stdout) {
      result += chunk.toString();
    }

    // Collect stderr
    for await (const chunk of pythonProcess.stderr) {
      error += chunk.toString();
    }

    // Wait for process to exit
    const exitCode = await new Promise((resolve) => {
      pythonProcess.on('close', resolve);
    });

    if (exitCode !== 0) {
      console.error('Python AI improvement error:', error);
      // Return fallback suggestions
      return NextResponse.json(getFallbackSuggestions(resumeData));
    }

    // Parse the JSON result
    let suggestions;
    try {
      suggestions = JSON.parse(result);
      
      if (suggestions.error) {
        console.error('AI returned error:', suggestions.error);
        return NextResponse.json(getFallbackSuggestions(resumeData));
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', result);
      return NextResponse.json(getFallbackSuggestions(resumeData));
    }

    // Save suggestions to database if user is authenticated
    if (userId) {
      try {
        client = new MongoClient(uri);
        await client.connect();
        
        const db = DB_NAME ? client.db(DB_NAME) : client.db();
        const suggestionsCollection = db.collection('resume_suggestions');
        
        await suggestionsCollection.insertOne({
          userId: new ObjectId(userId),
          suggestions: suggestions,
          resumeData: {
            skills: resumeData.skills?.slice(0, 20),
            experience_count: resumeData.experience?.length || 0,
            education_count: resumeData.education?.length || 0
          },
          timestamp: new Date(),
          requestType: requestType
        });
        
        // Also persist AI scores into the latest resume document for this user
        try {
          const resumesCollection = db.collection('resumes');
          const latest = await resumesCollection.findOne(
            { userId: new ObjectId(userId) },
            { sort: { createdAt: -1 } }
          );
          if (latest) {
            await resumesCollection.updateOne(
              { _id: latest._id },
              { $set: {
                  aiScores: suggestions.scores || null,
                  aiOverallScore: typeof suggestions.overall_score === 'number' ? suggestions.overall_score : (suggestions.scores?.total ?? null),
                  aiImprovementPotential: suggestions.improvement_potential ?? null,
                  aiSuggestionsBrief: Array.isArray(suggestions.suggestions) ? suggestions.suggestions.slice(0, 3) : [],
                  aiUpdatedAt: new Date()
                }
              }
            );
          }
        } catch (updateErr) {
          console.warn('Failed to update resume with AI scores:', updateErr?.message || updateErr);
        }
      } catch (dbError) {
        console.error('Database save error:', dbError);
        // Don't fail the request if DB save fails
      } finally {
        if (client) {
          await client.close();
        }
      }
    }

    return NextResponse.json({
      success: true,
      suggestions: suggestions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating suggestions:', error);
    if (client) {
      await client.close();
    }
    return NextResponse.json(
      { error: error.message || 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

// Fallback suggestions if AI fails
function getFallbackSuggestions(resumeData) {
  const skillsCount = resumeData.skills?.length || 0;
  const experienceCount = resumeData.experience?.length || 0;
  
  return {
    success: true,
    suggestions: {
      overall_score: Math.min(85, 50 + (skillsCount * 2) + (experienceCount * 5)),
      improvement_potential: 15,
      
      critical_improvements: [
        {
          title: 'Add Quantifiable Achievements',
          description: 'Include specific metrics and numbers (e.g., "Increased sales by 25%")',
          priority: 'high',
          impact: 'High impact on ATS score',
          examples: [
            'Led a team of 5 developers',
            'Improved system performance by 40%',
            'Managed a budget of $100K'
          ]
        },
        {
          title: 'Optimize for ATS Systems',
          description: 'Use standard section headings and avoid complex formatting',
          priority: 'high',
          impact: 'Essential for automated screening',
          examples: [
            'Use "Work Experience" instead of creative titles',
            'Include keywords from job descriptions',
            'Use standard date formats (MM/YYYY)'
          ]
        },
        {
          title: 'Enhance Skills Section',
          description: 'Add more relevant technical and soft skills',
          priority: 'medium',
          impact: 'Improves keyword matching',
          examples: [
            'List programming languages and frameworks',
            'Include tools and technologies',
            'Add certifications and licenses'
          ]
        }
      ],
      
      skills_recommendations: {
        trending_skills: [
          'Cloud Computing (AWS, Azure, GCP)',
          'Machine Learning & AI',
          'DevOps & CI/CD',
          'Agile Methodologies',
          'Data Analysis'
        ],
        missing_keywords: [
          'Leadership',
          'Project Management',
          'Problem Solving',
          'Team Collaboration',
          'Communication'
        ]
      },
      
      content_improvements: {
        experience: [
          'Start bullet points with strong action verbs',
          'Use STAR method (Situation, Task, Action, Result)',
          'Focus on achievements, not just responsibilities',
          'Tailor experience to target roles'
        ],
        format: [
          'Keep resume to 1-2 pages',
          'Use consistent formatting throughout',
          'Choose a clean, professional font',
          'Leave appropriate white space'
        ]
      },
      
      ats_optimization_tips: [
        'Use standard section headers (Summary, Experience, Education, Skills)',
        'Include relevant keywords from job postings',
        'Avoid headers, footers, and text boxes',
        'Use simple bullet points',
        'Save as .docx or .pdf format',
        'Include contact information at the top'
      ],
      
      next_steps: [
        {
          step: 1,
          action: 'Review and update your professional summary',
          time: '15 minutes'
        },
        {
          step: 2,
          action: 'Add quantifiable achievements to each role',
          time: '30 minutes'
        },
        {
          step: 3,
          action: 'Research and add trending industry skills',
          time: '20 minutes'
        },
        {
          step: 4,
          action: 'Optimize formatting for ATS compatibility',
          time: '15 minutes'
        }
      ]
    },
    fallback: true,
    timestamp: new Date().toISOString()
  };
}

// GET endpoint to fetch suggestion history
export async function GET(request) {
  let client = null;
  
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    
    client = new MongoClient(uri);
    await client.connect();
    
    const db = DB_NAME ? client.db(DB_NAME) : client.db();
    const suggestionsCollection = db.collection('resume_suggestions');
    
    const history = await suggestionsCollection
      .find({ userId: new ObjectId(decoded.userId) })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();
    
    await client.close();
    
    return NextResponse.json({
      success: true,
      history: history
    });

  } catch (error) {
    console.error('Error fetching history:', error);
    if (client) {
      await client.close();
    }
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
