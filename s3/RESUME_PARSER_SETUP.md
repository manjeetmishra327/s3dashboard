# Resume Parser Setup Guide

## Overview
This guide will help you set up the resume parsing feature that extracts skills, experience, and education from uploaded resumes.

## Prerequisites
- Node.js (v18 or higher)
- Python (v3.8 or higher)
- pip (Python package manager)

## Installation Steps

### 1. Install Python Dependencies

```bash
# Install required Python packages
pip install -r requirements.txt

# Download spaCy English language model
python -m spacy download en_core_web_sm
```

### 2. Verify Python Installation

Test the Python script directly:

```bash
python services/resume_parser.py path/to/sample/resume.pdf
```

### 3. Start the Next.js Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## File Structure

```
s3/
├── app/
│   ├── api/
│   │   └── parse-resume/
│   │       └── route.js          # API endpoint for resume parsing
│   └── components/
│       └── modules/
│           └── ResumeAnalysis.js # Frontend component
├── services/
│   └── resume_parser.py          # Python parsing script
├── temp/                          # Temporary file storage (auto-created)
└── requirements.txt               # Python dependencies
```

## How It Works

1. **File Upload**: User uploads a PDF or Word document through the UI
2. **Temporary Storage**: File is saved temporarily in the `temp/` directory
3. **Python Processing**: Node.js spawns a Python process to parse the resume
4. **Data Extraction**: Python script extracts:
   - Skills (using NLP and keyword matching)
   - Work experience
   - Education
   - Contact information (email, phone)
5. **Results Display**: Parsed data is displayed in the UI with a score
6. **Cleanup**: Temporary file is deleted after processing

## Features

### Resume Analysis
- **Skills Extraction**: Identifies technical and soft skills
- **Experience Parsing**: Extracts work history
- **Education Detection**: Finds educational qualifications
- **Contact Info**: Extracts email addresses and phone numbers
- **ATS Optimization**: Checks for ATS-friendly formatting

### Scoring System
- Skills (40 points): More than 5 skills identified
- Experience (30 points): Work experience section found
- Education (20 points): Education section found
- Contact Info (10 points): Email or phone number found

## Supported File Formats
- PDF (.pdf)
- Microsoft Word (.doc, .docx)

## File Size Limit
- Maximum: 5MB

## Troubleshooting

### Python Script Not Found
Make sure Python is in your system PATH:
```bash
python --version
```

### spaCy Model Not Found
Download the English language model:
```bash
python -m spacy download en_core_web_sm
```

### Permission Errors
Ensure the `temp/` directory has write permissions:
```bash
mkdir temp
chmod 755 temp
```

### Module Import Errors
Reinstall Python dependencies:
```bash
pip install --upgrade -r requirements.txt
```

## API Endpoint

### POST /api/parse-resume

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: file (PDF or DOCX)

**Response:**
```json
{
  "skills": ["python", "javascript", "react"],
  "experience": ["Software Engineer at Company X"],
  "education": ["Bachelor's in Computer Science"],
  "contact": {
    "emails": ["user@example.com"],
    "phones": ["+1234567890"]
  },
  "summary": "First 500 characters of resume...",
  "word_count": 450,
  "char_count": 2500
}
```

**Error Response:**
```json
{
  "error": "Error message"
}
```

## Future Enhancements

1. **Improved Parsing**:
   - Better section detection
   - Date extraction for experience/education
   - Certification detection

2. **Additional Features**:
   - Job description matching
   - Keyword optimization suggestions
   - Grammar and spelling check
   - Resume formatting recommendations

3. **Performance**:
   - Background processing for large files
   - Caching for repeated uploads
   - Progress tracking

4. **Storage**:
   - Optional cloud storage (AWS S3, Cloudinary)
   - Resume history for logged-in users
   - Comparison with previous versions

## Security Considerations

- File type validation
- File size limits
- Temporary file cleanup
- Input sanitization
- Rate limiting (recommended for production)

## Production Deployment

For production deployment:

1. **Use Environment Variables**:
   - Set up proper environment variables
   - Secure API endpoints

2. **Add Rate Limiting**:
   - Prevent abuse
   - Limit uploads per user/IP

3. **Implement Authentication**:
   - Require user login
   - Track upload history

4. **Use Cloud Storage**:
   - Store files in S3/Cloudinary
   - Implement proper file cleanup

5. **Error Monitoring**:
   - Set up error tracking (Sentry, etc.)
   - Log all parsing failures

## Support

For issues or questions, please check:
- Python version compatibility
- spaCy model installation
- File permissions
- Network connectivity

## License

This feature is part of the S3 Dashboard project.
