# S3 Dashboard - Resume Analysis Platform

A comprehensive Next.js application with AI-powered resume parsing and analysis capabilities.

## 🚀 Features

- **User Authentication**: Secure login/signup with JWT tokens
- **Resume Upload**: Support for PDF, DOC, and DOCX files
- **AI-Powered Analysis**: Python microservice with spaCy NLP processing
- **Real-time Dashboard**: Dynamic stats and insights based on uploaded resumes
- **Skills Extraction**: Automatic identification of technical skills
- **ATS Scoring**: Applicant Tracking System compatibility scoring
- **MongoDB Integration**: Persistent storage for user data and resume analysis

## 🏗️ Architecture

```
Frontend (Next.js) ←→ Backend (Next.js API) ←→ Python Microservice
                           ↓
                    MongoDB Database
```

## 📁 Project Structure

```
s3/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── protected/            # Protected user endpoints
│   │   └── resume/               # Resume processing endpoints
│   ├── components/                # React components
│   │   ├── modules/              # Dashboard modules
│   │   └── ...
│   └── ...
├── python-service/               # Python microservice
│   ├── main.py                   # FastAPI application
│   ├── requirements.txt          # Python dependencies
│   └── start.py                  # Service startup script
└── uploads/                      # File upload directory
```

## 🛠️ Installation & Setup

### Prerequisites

- Node.js 18+ 
- Python 3.8+
- MongoDB (local or cloud)

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
cd python-service
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
PYTHON_SERVICE_URL=http://localhost:8000
```

### 3. Start Services

**Option 1: Use the batch script (Windows)**
```bash
start-services.bat
```

**Option 2: Manual startup**

Terminal 1 (Next.js):
```bash
npm run dev
```

Terminal 2 (Python Service):
```bash
cd python-service
python start.py
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/protected/profile` - Get user profile

### Resume Processing
- `POST /api/resume/upload` - Upload and analyze resume
- `GET /api/resume/history` - Get user's resume history

### Python Service
- `POST /parse-resume` - Parse resume file
- `GET /health` - Health check

## 📊 Resume Analysis Features

### Skills Extraction
- Identifies technical skills from resume text
- Supports 50+ common programming languages and frameworks
- Uses spaCy NLP for intelligent skill recognition

### ATS Scoring
- Calculates compatibility with Applicant Tracking Systems
- Evaluates contact information, skills, experience, and education
- Provides actionable improvement suggestions

### Analysis Results
- **Skills Found**: Technical competencies identified
- **Missing Skills**: Recommended skills to add
- **Experience**: Work experience summary
- **Education**: Educational background
- **Strengths**: Resume strengths identified
- **Suggestions**: Improvement recommendations

## 🎯 Usage

1. **Sign Up/Login**: Create an account or login
2. **Upload Resume**: Go to Resume Analysis module
3. **View Results**: See detailed analysis and suggestions
4. **Dashboard**: View stats and recent activities
5. **Improve**: Use suggestions to enhance your resume

## 🔒 Security Features

- JWT-based authentication
- File type validation
- File size limits (5MB)
- Secure file storage
- CORS protection

## 🚀 Deployment

### Frontend (Vercel/Netlify)
```bash
npm run build
npm start
```

### Python Service (Docker)
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY python-service/ .
RUN pip install -r requirements.txt
RUN python -m spacy download en_core_web_sm
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Database
- MongoDB Atlas (recommended for production)
- Local MongoDB for development

## 🧪 Testing

```bash
# Test Next.js application
npm run dev

# Test Python service
cd python-service
python -m pytest

# Test API endpoints
curl -X POST http://localhost:8000/health
```

## 📈 Performance

- **File Processing**: Supports files up to 5MB
- **Response Time**: < 3 seconds for typical resume analysis
- **Concurrent Users**: Supports multiple simultaneous uploads
- **Scalability**: Microservice architecture for easy scaling

## 🐛 Troubleshooting

### Common Issues

1. **Python Service Not Starting**
   ```bash
   cd python-service
   pip install -r requirements.txt
   python -m spacy download en_core_web_sm
   ```

2. **MongoDB Connection Issues**
   - Check connection string in `.env.local`
   - Ensure MongoDB is running
   - Verify network access

3. **File Upload Fails**
   - Check file size (must be < 5MB)
   - Verify file format (PDF, DOC, DOCX only)
   - Ensure uploads directory exists

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- spaCy for NLP processing
- pdfplumber for PDF text extraction
- FastAPI for Python microservice
- Next.js for frontend framework