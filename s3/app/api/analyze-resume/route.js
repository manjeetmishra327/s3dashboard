import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request) {
  try {
    const body = await request.json();
    const { resumeData, jobDescription } = body;

    if (!resumeData) {
      return NextResponse.json(
        { error: 'No resume data provided' },
        { status: 400 }
      );
    }

    // Debug: Check if API key is available
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('GEMINI_API_KEY available:', apiKey ? 'Yes (length: ' + apiKey.length + ')' : 'No');
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY not found in process.env');
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured on server' },
        { status: 500 }
      );
    }

    // Call Python AI analyzer
    const pythonScript = path.join(process.cwd(), 'services', 'resume_ai_analyzer.py');
    
    // Prepare arguments
    const args = [pythonScript, JSON.stringify(resumeData)];
    if (jobDescription) {
      args.push(jobDescription);
    }

    // Pass environment variables to Python process
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
      console.error('Python AI analyzer error:', error);
      return NextResponse.json(
        { error: `AI analysis failed: ${error}` },
        { status: 500 }
      );
    }

    // Parse the JSON result
    try {
      const analysisResult = JSON.parse(result);
      console.log('Python AI result:', JSON.stringify(analysisResult, null, 2));
      
      if (analysisResult.error) {
        console.error('AI returned error:', analysisResult.error);
        return NextResponse.json(
          { error: analysisResult.error, fallback: true },
          { status: 200 }
        );
      }

      return NextResponse.json(analysisResult);
    } catch (parseError) {
      console.error('Failed to parse AI response:', result);
      return NextResponse.json(
        { error: 'Failed to parse AI response', raw: result },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in AI analysis:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze resume' },
      { status: 500 }
    );
  }
}
