# Learn and Try Web Application

A web-based catalog application that helps users discover, filter, and learn about various tools and software solutions. The application features an AI-powered search interface with vector database integration for intelligent tool recommendations.

## Architecture Overview

The application consists of:
- **Frontend**: HTML/CSS/JavaScript interface for browsing and filtering tools
- **Backend**: Python proxy server that handles AI requests and serves static files
- **AI Integration**: Ollama for local AI processing and Qdrant vector database for intelligent search
- **Data**: JSON-based catalog of tools with metadata

## Prerequisites

Before running this application, you need to install and configure:

### 1. Python Dependencies
```powershell
pip install qdrant-client ollama python-dotenv numpy
```

### 2. Ollama (Local AI)
- Download and install [Ollama](https://ollama.ai/)
- Pull the required model:
```powershell
ollama pull gemma2:9b
```

### 3. Qdrant Vector Database
- Install Qdrant (recommended: Docker):
```powershell
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
```

## Quick Start (Development Mode)

### 1. Clone and Navigate
```powershell
cd learnandtry-webapp
```

### 2. Start Required Services
Make sure Ollama and Qdrant are running:
```powershell
# Start Ollama (if not already running)
ollama serve

# Start Qdrant (if using Docker)
docker run -d -p 6333:6333 -p 6334:6334 qdrant/qdrant
```

### 3. Run the Development Server
```powershell
python proxy_server.py
```

The application will be available at: **http://localhost:8000**

## Development vs Production

### ⚠️ IMPORTANT: Development Server Limitations

The current `proxy_server.py` uses Python's built-in `http.server` which is **ONLY suitable for development purposes**. It has several limitations:

- **Single-threaded**: Can only handle one request at a time
- **No security features**: Lacks proper authentication, rate limiting, etc.
- **Poor performance**: Not optimized for production loads
- **No HTTPS**: Only supports HTTP

### Production Deployment Recommendations

For production, replace the development server with one of these options:

#### Option 1: Nginx + Gunicorn (Recommended)
```powershell
# Install Gunicorn
pip install gunicorn

# Run with Gunicorn
gunicorn --bind 0.0.0.0:8000 --workers 4 --timeout 120 proxy_server:app
```

#### Option 2: Docker with Nginx
The included `Dockerfile` and `nginx/default.conf` are ready for production:
```powershell
# Build and run
docker build -t learnandtry-webapp .
docker run -p 80:80 learnandtry-webapp
```

#### Option 3: Cloud Platforms
- **AWS**: Use AWS Lambda + API Gateway + S3
- **Azure**: Azure Functions + Azure CDN
- **Google Cloud**: Cloud Functions + Cloud Storage
- **Heroku**: Use their Python runtime

## Project Structure

```
learnandtry-webapp/
├── proxy_server.py          # Main development server (REPLACE IN PRODUCTION)
├── verify_qdrant_vs_catalog.py  # Data consistency checker
├── Dockerfile               # Production Docker configuration
├── nginx/                   # Production Nginx configuration
│   └── default.conf
├── public/                  # Static web files
│   ├── catalog/            # Main application interface
│   ├── css/                # Stylesheets
│   ├── scripts/            # JavaScript files
│   └── data/               # Tool catalog data
└── README.md               # This file
```

## Configuration

### Environment Variables
Create a `.env` file in the project root:
```env
# Qdrant configuration
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=active_tools

# Ollama configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gemma2:9b
```

### Port Configuration
- **Development**: Port 8000 (configurable in `proxy_server.py`)
- **Production**: Port 80 (configurable in `nginx/default.conf`)

## Data Management

### Tool Catalog
The main data source is `public/data/catalog.json` which contains:
- Tool metadata (name, company, description, features)
- Platform compatibility information
- Installation and purchase options
- Function categories

### Vector Database
Qdrant stores:
- Tool embeddings for semantic search
- Metadata for fast filtering
- Search indices for performance

### Data Verification
Run the verification script to check data consistency:
```powershell
python verify_qdrant_vs_catalog.py
```

## Troubleshooting

### Common Issues

1. **"Ollama not accessible"**
   - Ensure Ollama is running: `ollama serve`
   - Check if port 11434 is available

2. **"Qdrant not accessible"**
   - Verify Qdrant is running on port 6333
   - Check Docker container status if using Docker

3. **Import errors**
   - Install missing dependencies: `pip install -r requirements.txt`
   - Check Python version (requires Python 3.7+)

4. **Port already in use**
   - Change the port in `proxy_server.py` or kill the process using the port

### Logs and Debugging
- Check console output for server status and errors
- Enable debug logging by modifying the logging level in `proxy_server.py`
- Use browser developer tools to inspect network requests

## Development Workflow

1. **Make changes** to HTML/CSS/JavaScript in the `public/` directory
2. **Test locally** using the development server
3. **Verify data consistency** with the verification script
4. **Deploy to production** using the appropriate production method

## Security Considerations

- The development server has no authentication or rate limiting
- CORS is set to allow all origins (`*`) - restrict this in production
- No input validation on AI prompts - implement proper sanitization

## Performance Optimization

- Vector search results are cached in memory
- Static files are served directly by the web server
- Consider implementing Redis for session management in production
- Use CDN for static assets in production

## Contributing

When working on this project:
1. Always test changes locally first
2. Update this README if you change the setup process
3. Document any new environment variables or configuration options
4. Test the verification script after data changes

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review console logs and error messages
3. Verify all prerequisites are properly installed
4. Test with a clean environment if needed

---

**Remember**: This development server is for testing only. Always use a proper production web server for live deployments!
