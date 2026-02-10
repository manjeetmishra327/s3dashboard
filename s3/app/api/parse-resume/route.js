import { NextResponse } from 'next/server';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { spawn } from 'child_process';
import path from 'path';
import { existsSync } from 'fs';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a PDF or Word document.' },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit.' },
        { status: 400 }
      );
    }

    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'temp');
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Save file temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const tempPath = path.join(tempDir, `resume-${timestamp}-${sanitizedFileName}`);
    
    await writeFile(tempPath, buffer);

    try {
      // Call Python script (configurable path and binary)
      const configuredScript = process.env.PYTHON_PARSER_SCRIPT;
      const defaultScript = path.join(process.cwd(), 'services', 'resume_parser.py');
      const pythonScript = configuredScript && configuredScript.trim().length > 0 ? configuredScript : defaultScript;
      const pythonBinary = process.env.PYTHON_BIN || 'python';
      
      const pythonProcess = spawn(pythonBinary, [pythonScript, tempPath], {
        stdio: ['ignore', 'pipe', 'pipe']
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
        console.error('Python script error:', error);
        throw new Error(`Python script failed with exit code ${exitCode}: ${error}`);
      }

      // Parse the JSON result
      const parsedResult = JSON.parse(result);

      if (parsedResult.error) {
        throw new Error(parsedResult.error);
      }

      return NextResponse.json(parsedResult);

    } finally {
      // Clean up temp file
      try {
        await unlink(tempPath);
      } catch (e) {
        console.error('Error deleting temp file:', e);
      }
    }

  } catch (error) {
    console.error('Error processing resume:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process resume' },
      { status: 500 }
    );
  }
}
