import sys
import json
import re
import pdfplumber
import docx2txt
import spacy
from pathlib import Path

# Load English language model
nlp = spacy.load("en_core_web_sm")

def extract_text(file_path):
    """Extract text from PDF or DOCX files"""
    file_path = Path(file_path)
    try:
        if file_path.suffix.lower() == '.pdf':
            with pdfplumber.open(file_path) as pdf:
                return " ".join(page.extract_text() for page in pdf.pages if page.extract_text())
        elif file_path.suffix.lower() in ['.docx', '.doc']:
            return docx2txt.process(file_path)
        else:
            raise ValueError("Unsupported file format. Please upload a PDF or DOCX file.")
    except Exception as e:
        raise ValueError(f"Error reading file: {str(e)}")

def extract_skills(text):
    """Extract ONLY skills from the Skills section - STRICT section-based extraction"""
    skills = set()
    
    # Comprehensive list of valid technical skills (for validation)
    valid_skills = {
        # Programming Languages
        'python', 'javascript', 'java', 'c++', 'c#', 'php', 'ruby', 'swift', 'kotlin', 'go', 'rust',
        'typescript', 'scala', 'perl', 'r', 'matlab', 'dart', 'c', 'objective-c',
        
        # Frontend Technologies
        'react', 'reactjs', 'react.js', 'angular', 'vue', 'vue.js', 'vuejs', 'svelte', 'ember',
        'jquery', 'next.js', 'nextjs', 'nuxt', 'gatsby', 'html', 'html5', 'css', 'css3',
        'sass', 'scss', 'less', 'tailwind', 'tailwindcss', 'bootstrap', 'material-ui', 'mui',
        'webpack', 'vite', 'parcel', 'rollup', 'babel', 'redux', 'mobx', 'zustand',
        
        # Backend Technologies
        'node.js', 'nodejs', 'node', 'express', 'expressjs', 'express.js', 'django', 'flask',
        'fastapi', 'spring', 'spring boot', 'springboot', 'laravel', 'rails', 'ruby on rails',
        'asp.net', '.net', 'dotnet', 'nestjs', 'fastify', 'koa', 'hapi',
        
        # Databases
        'sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'sqlite', 'mariadb',
        'oracle', 'mssql', 'sql server', 'dynamodb', 'cassandra', 'couchdb', 'firebase',
        'firestore', 'realm', 'nosql', 'elasticsearch', 'neo4j',
        
        # Cloud & DevOps
        'aws', 'amazon web services', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes',
        'k8s', 'jenkins', 'ci/cd', 'gitlab', 'github actions', 'travis ci', 'circleci',
        'terraform', 'ansible', 'chef', 'puppet', 'vagrant', 'heroku', 'netlify', 'vercel',
        
        # Tools & Platforms
        'git', 'github', 'gitlab', 'bitbucket', 'svn', 'mercurial', 'jira', 'confluence',
        'slack', 'trello', 'asana', 'postman', 'insomnia', 'swagger', 'vscode', 'intellij',
        'pycharm', 'webstorm', 'eclipse', 'visual studio', 'vim', 'emacs', 'sublime',
        
        # APIs & Protocols
        'rest', 'restful', 'rest api', 'graphql', 'websocket', 'grpc', 'soap', 'json', 'xml',
        'api', 'microservices', 'oauth', 'jwt', 'http', 'https', 'tcp/ip', 'websockets',
        
        # Testing
        'jest', 'mocha', 'chai', 'jasmine', 'karma', 'cypress', 'selenium', 'puppeteer',
        'playwright', 'junit', 'pytest', 'unittest', 'testng', 'rspec', 'enzyme',
        
        # Mobile Development
        'react native', 'flutter', 'ios', 'android', 'xamarin', 'ionic', 'cordova',
        'react-native', 'swift ui', 'swiftui', 'jetpack compose',
        
        # Data Science & AI
        'machine learning', 'deep learning', 'artificial intelligence', 'ai', 'ml',
        'data science', 'data analysis', 'pandas', 'numpy', 'scikit-learn', 'tensorflow',
        'pytorch', 'keras', 'opencv', 'nlp', 'computer vision', 'data visualization',
        
        # Methodologies
        'agile', 'scrum', 'kanban', 'waterfall', 'devops', 'tdd', 'bdd', 'ci/cd',
        'continuous integration', 'continuous deployment',
        
        # Other Technical
        'linux', 'unix', 'windows', 'macos', 'bash', 'powershell', 'shell scripting',
        'regex', 'markdown', 'latex', 'nginx', 'apache', 'tomcat', 'iis',
        'rabbitmq', 'kafka', 'activemq', 'memcached', 'varnish', 'prometheus', 'grafana'
    }
    
    # CRITICAL: Only search in the Skills section
    lines = text.split('\n')
    in_skills_section = False
    skills_section_text = []
    
    # Patterns to identify Skills section start
    skill_section_patterns = [
        r'(?i)^skills?\s*:?\s*$',
        r'(?i)^technical\s+skills?\s*:?\s*$',
        r'(?i)^core\s+(?:technical\s+)?skills?\s*:?\s*$',
        r'(?i)^key\s+skills?\s*:?\s*$',
        r'(?i)^competencies\s*:?\s*$'
    ]
    
    # Patterns to identify when Skills section ends (new section starts)
    section_end_patterns = [
        r'(?i)^(?:work\s+)?experience\s*:?\s*$',
        r'(?i)^(?:professional\s+)?(?:employment\s+)?history\s*:?\s*$',
        r'(?i)^education\s*:?\s*$',
        r'(?i)^projects?\s*:?\s*$',
        r'(?i)^certifications?\s*:?\s*$',
        r'(?i)^awards?\s*:?\s*$',
        r'(?i)^publications?\s*:?\s*$',
        r'(?i)^references?\s*:?\s*$',
        r'(?i)^summary\s*:?\s*$',
        r'(?i)^objective\s*:?\s*$'
    ]
    
    for line in lines:
        stripped = line.strip()
        
        # Check if entering skills section
        if any(re.match(pattern, stripped) for pattern in skill_section_patterns):
            in_skills_section = True
            continue
        
        # Check if leaving skills section
        if in_skills_section and any(re.match(pattern, stripped) for pattern in section_end_patterns):
            break
        
        # Collect skills section content
        if in_skills_section and stripped:
            skills_section_text.append(stripped)
    
    # If no dedicated skills section found, try bullet points or any skill mentions
    if not skills_section_text:
        print("WARNING: No clear Skills section found, trying alternative extraction", file=sys.stderr)
        # Fallback: extract from entire document but still validate against whitelist
        skills_text = text.lower()
        for skill in valid_skills:
            pattern = r'\b' + re.escape(skill) + r'\b'
            if re.search(pattern, skills_text):
                display_skill = skill.title() if skill.islower() else skill
                if skill in ['html', 'css', 'sql', 'api', 'xml', 'json', 'jwt', 'http', 'https', 'ai', 'ml', 'nlp']:
                    display_skill = skill.upper()
                elif skill in ['node.js', 'next.js', 'vue.js', 'react.js', 'express.js']:
                    display_skill = skill
                elif skill in ['javascript', 'typescript']:
                    display_skill = skill.capitalize()
                skills.add(display_skill)
        extracted_skills = sorted(list(skills))[:25]
        print(f"INFO: Extracted {len(extracted_skills)} skills using fallback method", file=sys.stderr)
        return extracted_skills
    
    # Now extract skills ONLY from the skills section
    skills_text = ' '.join(skills_section_text).lower()
    
    # Extract skills from the skills section only
    for skill in valid_skills:
        # Use word boundaries to avoid partial matches
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, skills_text):
            # Capitalize properly for display
            display_skill = skill.title() if skill.islower() else skill
            if skill in ['html', 'css', 'sql', 'api', 'xml', 'json', 'jwt', 'http', 'https', 'ai', 'ml', 'nlp']:
                display_skill = skill.upper()
            elif skill in ['node.js', 'next.js', 'vue.js', 'react.js', 'express.js']:
                display_skill = skill
            elif skill in ['javascript', 'typescript']:
                display_skill = skill.capitalize()
            skills.add(display_skill)
    
    # Sort and return only unique, valid skills from Skills section
    extracted_skills = sorted(list(skills))[:25]
    print(f"INFO: Extracted {len(extracted_skills)} skills from Skills section", file=sys.stderr)
    return extracted_skills

def extract_experience(text):
    """Extract work experience information"""
    doc = nlp(text)
    experience = []
    
    # Look for experience section
    exp_patterns = [
        r'(?i)(?:work|employment|professional)\s*(?:history|experience|background)',
        r'(?i)experience\s*:',
        r'(?i)work\s*:'
    ]
    
    lines = text.split('\n')
    in_experience_section = False
    
    for i, line in enumerate(lines):
        # Check if we're entering the experience section
        if any(re.search(pattern, line) for pattern in exp_patterns):
            in_experience_section = True
            continue
        
        # Check if we're leaving the experience section (new section starts)
        if in_experience_section and re.search(r'(?i)^(education|skills|projects|certifications|awards)', line.strip()):
            break
        
        # Collect experience lines
        if in_experience_section and line.strip() and len(line.strip()) > 10:
            experience.append(line.strip())
    
    if not experience:
        return ["No work experience section found or couldn't be parsed."]
    
    return experience[:10]  # Limit to 10 entries

def extract_education(text):
    """Extract education information"""
    doc = nlp(text)
    education = []
    
    # Look for education section
    edu_patterns = [
        r'(?i)education',
        r'(?i)academic\s*(?:background|qualifications)',
        r'(?i)degrees?'
    ]
    
    lines = text.split('\n')
    in_education_section = False
    
    for i, line in enumerate(lines):
        # Check if we're entering the education section
        if any(re.search(pattern, line) for pattern in edu_patterns):
            in_education_section = True
            continue
        
        # Check if we're leaving the education section (new section starts)
        if in_education_section and re.search(r'(?i)^(experience|work|skills|projects|certifications)', line.strip()):
            break
        
        # Collect education lines
        if in_education_section and line.strip() and len(line.strip()) > 10:
            education.append(line.strip())
    
    if not education:
        return ["No education section found or couldn't be parsed."]
    
    return education[:10]  # Limit to 10 entries

def extract_projects(text):
    """Extract projects information"""
    projects = []
    lines = text.split('\n')
    in_projects_section = False
    project_text = []
    
    # Patterns to identify Projects section
    project_patterns = [
        r'(?i)^projects?\s*:?',
        r'(?i)^personal\s+projects?\s*:?',
        r'(?i)^academic\s+projects?\s*:?',
        r'(?i)^key\s+projects?\s*:?'
    ]
    
    # Section end patterns
    section_end_patterns = [
        r'(?i)^(?:work\s+)?experience\s*:?',
        r'(?i)^education\s*:?',
        r'(?i)^skills?\s*:?',
        r'(?i)^certifications?\s*:?',
        r'(?i)^awards?\s*:?'
    ]
    
    for line in lines:
        stripped = line.strip()
        
        # Check if entering projects section
        if any(re.search(pattern, stripped) for pattern in project_patterns):
            in_projects_section = True
            continue
        
        # Check if leaving projects section
        if in_projects_section and any(re.match(pattern, stripped) for pattern in section_end_patterns):
            break
        
        # Collect project content
        if in_projects_section and stripped and len(stripped) > 15:
            project_text.append(stripped)
    
    if not project_text:
        return ["No projects section found or couldn't be parsed."]
    
    # Group into projects (assume bullet points or line breaks separate them)
    current_project = []
    for line in project_text:
        # If line starts with bullet or number, it's a new project
        if re.match(r'^[•\-\*\d+\.]', line) or (current_project and len(line) > 50):
            if current_project:
                projects.append(' '.join(current_project))
            current_project = [line.lstrip('•\-\*\d. ')]
        else:
            if current_project:
                current_project.append(line)
            else:
                current_project = [line]
    
    # Add last project
    if current_project:
        projects.append(' '.join(current_project))
    
    return projects[:10] if projects else ["No projects section found or couldn't be parsed."]

def extract_contact_info(text):
    """Extract contact information - improved phone number detection"""
    # Email
    emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
    
    # Phone numbers - multiple patterns for better detection
    phone_patterns = [
        r'\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}',  # International
        r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',  # US format
        r'\d{10}',  # Plain 10 digits
        r'\d{3}[-.\s]\d{3}[-.\s]\d{4}',  # With separators
    ]
    
    phones = []
    for pattern in phone_patterns:
        found = re.findall(pattern, text)
        phones.extend(found)
    
    # Clean and deduplicate phones
    phones = list(set([p.strip() for p in phones if len(p.strip()) >= 10]))
    
    return {
        'emails': list(set(emails)),
        'phones': phones
    }

def main(file_path):
    try:
        # Extract text from the file
        text = extract_text(file_path)
        
        if not text or len(text.strip()) < 50:  # At least 50 characters
            return {"error": "The document appears to be empty or too short to process."}
        
        # Process the text
        result = {
            "skills": extract_skills(text),
            "experience": extract_experience(text),
            "education": extract_education(text),
            "projects": extract_projects(text),
            "contact": extract_contact_info(text),
            "summary": text[:500] + ("..." if len(text) > 500 else ""),
            "word_count": len(text.split()),
            "char_count": len(text)
        }
        
        return result
        
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        result = main(sys.argv[1])
        print(json.dumps(result))
    else:
        print(json.dumps({"error": "No file path provided"}))
