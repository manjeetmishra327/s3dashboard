# Resume Analysis - Quick Start Guide 🚀

## Installation (One-Time Setup)

### Option 1: Automated Setup (Recommended)
```bash
# Run this script - it does everything for you!
setup-resume-parser.bat
```

### Option 2: Manual Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm

# Create temp directory
mkdir temp
```

## Running the Application

```bash
# Start the development server
npm run dev
```

Then open: `http://localhost:3000`

## Testing

### Test the Python Parser Directly
```bash
test-resume-parser.bat
```

### Test via UI
1. Go to Resume Analysis module
2. Upload a PDF or DOCX resume
3. View results!

## What You Get

✅ **Skills Extraction** - Automatically identifies technical and soft skills
✅ **Experience Parsing** - Extracts work history
✅ **Education Detection** - Finds academic qualifications  
✅ **Contact Info** - Extracts email and phone
✅ **ATS Score** - Overall resume optimization score (0-100%)
✅ **Beautiful UI** - Animated, responsive interface

## File Limits

- **Formats**: PDF, DOC, DOCX
- **Max Size**: 5MB
- **Languages**: English only

## Troubleshooting

### Python not found?
```bash
python --version
# If error, install Python from python.org
```

### spaCy model error?
```bash
python -m spacy download en_core_web_sm
```

### Permission errors?
```bash
mkdir temp
# Make sure temp directory exists
```

## Project Structure

```
📁 app/api/parse-resume/route.js    → API endpoint
📁 services/resume_parser.py        → Python parser
📁 app/components/modules/ResumeAnalysis.js → UI component
📁 temp/                            → Temporary files (auto-created)
```

## Need More Help?

📖 Read: `RESUME_PARSER_SETUP.md` - Detailed setup guide
📖 Read: `IMPLEMENTATION_COMPLETE.md` - Full documentation

## Quick Commands

```bash
# Setup
setup-resume-parser.bat

# Test
test-resume-parser.bat

# Run
npm run dev

# Install Python deps manually
pip install pdfplumber python-docx spacy
python -m spacy download en_core_web_sm
```

---

**Status**: ✅ Ready to Use
**Version**: 1.0.0
