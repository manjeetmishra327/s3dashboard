import os

env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
with open(env_path) as f:
    for line in f:
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            os.environ[k.strip()] = v.strip()

print('[Run] OpenAI:', 'OK' if os.environ.get('OPENAI_API_KEY') else 'MISSING')
print('[Run] RapidAPI:', 'OK' if os.environ.get('RAPIDAPI_KEY') else 'MISSING')
print('[Run] MongoDB:', 'OK' if os.environ.get('MONGODB_URI') else 'MISSING')
print('[Run] Qdrant:', 'OK' if os.environ.get('QDRANT_URL') else 'MISSING')

import uvicorn

if __name__ == '__main__':
    uvicorn.run('main:app', host='0.0.0.0', port=8000, reload=False)
