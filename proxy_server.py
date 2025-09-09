#!/usr/bin/env python3
"""
Simple proxy server for Learn and Try webapp
- Serves static files from the public directory
- Forwards AI requests to ollama with CORS support
- Integrates Qdrant vector database search for enhanced tool recommendations
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import os
from pathlib import Path
import re
from dotenv import load_dotenv
import numpy as np
from datetime import datetime
import socket
import shutil
import tempfile


# Import Qdrant and ollama for vector search
try:
    from qdrant_client import QdrantClient
    import ollama
    VECTOR_SEARCH_AVAILABLE = True
except ImportError:
    print("Warning: Qdrant client or ollama not available. Vector search features will be disabled.")
    VECTOR_SEARCH_AVAILABLE = False

# Load environment variables
load_dotenv()

# Installer cache configuration
INSTALLER_CACHE_DIR = Path('./installer_cache')
INSTALLER_URLS = {
    'windows': 'https://ollama.com/download/OllamaSetup.exe',
    'macos': 'https://ollama.com/download/Ollama-darwin.zip',
    'linux': 'https://ollama.com/download/ollama-linux-amd64'
}

def check_internet_connection():
    """Check if internet connection is available"""
    try:
        # Try to connect to Google DNS
        socket.create_connection(("8.8.8.8", 53), timeout=3)
        return True
    except OSError:
        try:
            # Try to connect to Cloudflare DNS as backup
            socket.create_connection(("1.1.1.1", 53), timeout=3)
            return True
        except OSError:
            return False

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    # Class-level variables for Qdrant client (shared across all instances)
    _qdrant_client = None
    _client_initialized = False
    _embedding_model_name = 'nomic-embed-text'
    _collection_name = "active_tools"
    
    def __init__(self, *args, **kwargs):
        # Set the directory to serve files from
        super().__init__(*args, directory='public', **kwargs)
        
        # Initialize Qdrant client once if available and not already initialized
        if VECTOR_SEARCH_AVAILABLE and not ProxyHandler._client_initialized:
            try:
                ProxyHandler._qdrant_client = QdrantClient(
                    url="https://0cc71459-a784-4e72-80ba-6e37fabd4109.us-east-1-1.aws.cloud.qdrant.io:6333",
                    api_key="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.ZHhmETT2uLK_Ba_g_tuffEXORkGPY0FXzariD7GLeag"
                )
                ProxyHandler._client_initialized = True
                print("Qdrant client initialized")
            except Exception as e:
                print(f"Warning: Could not connect to Qdrant: {e}")
                ProxyHandler._qdrant_client = None
                ProxyHandler._client_initialized = True
    
    @property
    def qdrant_client(self):
        return ProxyHandler._qdrant_client
    
    @property
    def embedding_model_name(self):
        return ProxyHandler._embedding_model_name
    
    @property
    def collection_name(self):
        return ProxyHandler._collection_name
    
    def end_headers(self):
        # Add CORS headers to all responses
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        # Handle preflight CORS requests
        self.send_response(200)
        self.end_headers()
    
    def do_GET(self):
        # Handle setup package download
        if self.path.startswith('/api/download-setup'):
            self.handle_download_setup()
        elif self.path == '/api/check-ollama':
            self.handle_check_ollama()
        elif self.path.startswith('/installer_cache/'):
            self.handle_installer_download()
        else:
            # Default file serving behavior
            super().do_GET()
    
    def do_POST(self):
        if self.path == '/api/chatbot':
            self.handle_chatbot_conversation()
        elif self.path == '/api/sort-tools':
            self.handle_sort_tools()
        else:
            self.send_error(404, "Not Found")
    
    def sanitize_text(self, text: str) -> str:
        """Removes excessive newlines, whitespace, and escapes quotes for JSON compatibility."""
        if not isinstance(text, str):
            return ""
        cleaned_text = re.sub(r'\s+', ' ', text).strip()
        cleaned_text = cleaned_text.replace('"', '\\"')
        return cleaned_text

    def get_all_tools(self, limit: int = 1000):
        """
        Retrieves all tools from the Qdrant collection without vector search.
        """
        if not self.qdrant_client:
            return None
            
        try:
            # Use scroll to get all points without vector search
            scroll_result = self.qdrant_client.scroll(
                collection_name=self.collection_name,
                limit=limit,
                with_payload=True
            )
            
            return scroll_result[0]  # scroll returns (points, next_page_offset)
        except Exception as e:
            print(f"Error retrieving all tools: {e}")
            return None





    def get_filtered_tools_from_catalog(self, selected_filters, visible_tools_set=None, visible_ids_set=None):
        """
        Get filtered tools directly from catalog.json (no vector database for filtering)
        """
        try:
            # Load catalog data from JSON file
            catalog_path = os.path.join('public', 'data', 'catalog.json')
            with open(catalog_path, 'r', encoding='utf-8') as f:
                catalog_data = json.load(f)
            
            # If visible tools are specified, filter by those first
            if visible_tools_set and len(visible_tools_set) > 0:
                filtered_catalog = []
                for item in catalog_data:
                    item_name = item.get('name', '').lower()
                    if item_name in visible_tools_set:
                        filtered_catalog.append(item)
                catalog_data = filtered_catalog
            elif visible_ids_set and len(visible_ids_set) > 0:
                filtered_catalog = []
                for item in catalog_data:
                    item_id = item.get('id', '').lower()
                    if item_id in visible_ids_set:
                        filtered_catalog.append(item)
                catalog_data = filtered_catalog
            
            # Apply filters directly to the catalog data
            if selected_filters.get("selectedFunctions") or \
               selected_filters.get("selectedSupportedPlatforms") or \
               selected_filters.get("selectedInstallTypes") or \
               selected_filters.get("selectedPurchaseOptions"):
                
                filtered_catalog = []
                for item in catalog_data:
                    should_include = True
                    
                    # Check function filters
                    if selected_filters.get('selectedFunctions') and len(selected_filters['selectedFunctions']) > 0:
                        function_match = False
                        for function in selected_filters['selectedFunctions']:
                            if function in item.get('functions', []):
                                function_match = True
                                break
                        if not function_match:
                            should_include = False
                    
                    # Check platform filters
                    if should_include and selected_filters.get('selectedSupportedPlatforms') and len(selected_filters['selectedSupportedPlatforms']) > 0:
                        platform_match = False
                        for platform in selected_filters['selectedSupportedPlatforms']:
                            if platform in item.get('supportedPlatforms', []):
                                platform_match = True
                                break
                        if not platform_match:
                            should_include = False
                    
                    # Check install type filters
                    if should_include and selected_filters.get('selectedInstallTypes') and len(selected_filters['selectedInstallTypes']) > 0:
                        install_match = False
                        for install_type in selected_filters['selectedInstallTypes']:
                            if install_type in item.get('installTypes', []):
                                install_match = True
                                break
                        if not install_match:
                            should_include = False
                    
                    # Check purchase option filters
                    if should_include and selected_filters.get('selectedPurchaseOptions') and len(selected_filters['selectedPurchaseOptions']) > 0:
                        purchase_match = False
                        for purchase_option in selected_filters['selectedPurchaseOptions']:
                            if purchase_option in item.get('purchaseOptions', []):
                                purchase_match = True
                                break
                        if not purchase_match:
                            should_include = False
                    
                    if should_include:
                        filtered_catalog.append(item)
                
                catalog_data = filtered_catalog
            
            return catalog_data
        except Exception as e:
            print(f"Error filtering tools from catalog: {e}")
            return []

    def filter_tools_by_criteria(self, all_tools, selected_filters):
        """
        Filter all tools based on the selected filter criteria.
        This maps the frontend filter names to the database field names.
        """
        if not all_tools:
            return []

        # Mapping from frontend filter names to database field names
        function_mapping = {
            'reading': 'reading',
            'cognitive': 'cognitive', 
            'vision': 'vision',
            'physical': 'physical',
            'hearing': 'hearing',
            'speech': 'speech_communication'
        }

        platform_mapping = {
            'windows': 'windows',
            'macos': 'macintosh',
            'chromeos': 'chromebook',
            'ipados': 'ipad_ipados',
            'ios': 'iphone_ios',
            'android': 'android'
        }

        install_mapping = {
            'builtIn': 'built_in',
            'installable': 'at_installed'
        }

        pricing_mapping = {
            'free': 'free',
            'freeTrial': 'free_trial',
            'lifetimeLicense': 'lifetime_license',
            'subscription': 'subscription'
        }

        filtered_results = []

        for tool in all_tools:
            payload = tool.payload
            should_include = True

            # Check function filters
            if selected_filters.get('selectedFunctions') and len(selected_filters['selectedFunctions']) > 0:
                function_match = False
                for frontend_function in selected_filters['selectedFunctions']:
                    db_field = function_mapping.get(frontend_function)
                    if db_field and payload.get(db_field) is True:
                        function_match = True
                        break
                if not function_match:
                    should_include = False

            # Check platform filters
            if selected_filters.get('selectedSupportedPlatforms') and len(selected_filters['selectedSupportedPlatforms']) > 0:
                platform_match = False
                for frontend_platform in selected_filters['selectedSupportedPlatforms']:
                    db_field = platform_mapping.get(frontend_platform)
                    if db_field and payload.get(db_field) is True:
                        platform_match = True
                        break
                if not platform_match:
                    should_include = False

            # Check install type filters
            if selected_filters.get('selectedInstallTypes') and len(selected_filters['selectedInstallTypes']) > 0:
                install_match = False
                for frontend_install in selected_filters['selectedInstallTypes']:
                    db_field = install_mapping.get(frontend_install)
                    if db_field and payload.get(db_field) is True:
                        install_match = True
                        break
                if not install_match:
                    should_include = False

            # Check pricing filters
            if selected_filters.get('selectedPurchaseOptions') and len(selected_filters['selectedPurchaseOptions']) > 0:
                pricing_match = False
                for frontend_pricing in selected_filters['selectedPurchaseOptions']:
                    db_field = pricing_mapping.get(frontend_pricing)
                    if db_field and payload.get(db_field) is True:
                        pricing_match = True
                        break
                if not pricing_match:
                    should_include = False

            if should_include:
                filtered_results.append(tool)

        return filtered_results

    def compute_similarity_score_for_catalog_items(self, query: str, catalog_items: list, selected_filters=None):
        """
        Computes similarity scores between a query and catalog items using embeddings + bonus scoring
        """
        if not catalog_items or not query:
            return []
            
        try:
            # Get embedding for the query
            query_response = ollama.embeddings(model=self.embedding_model_name, prompt=query)
            query_vector = query_response["embedding"]
            query_np = np.array(query_vector)
            
            # Bonus weights for filter matches
            platform_bonus_weight = 0.12
            function_bonus_weight = 0.12
            
            scored_items = []
            for item in catalog_items:
                try:
                    # Create tool text for embedding (combining name and description)
                    tool_name = item.get('name', '')
                    tool_desc = item.get('description', '')
                    tool_text = f"{tool_name} {tool_desc}"
                    
                    # Get embedding for the tool
                    tool_response = ollama.embeddings(model=self.embedding_model_name, prompt=tool_text)
                    tool_vector = tool_response["embedding"]
                    tool_np = np.array(tool_vector)
                    
                    # Compute base cosine similarity
                    base_similarity = np.dot(query_np, tool_np) / (np.linalg.norm(query_np) * np.linalg.norm(tool_np))
                    
                    # Calculate bonus scores if filters are provided
                    final_score = base_similarity
                    if selected_filters:
                        # Platform bonus
                        if selected_filters.get("selectedSupportedPlatforms") and len(selected_filters["selectedSupportedPlatforms"]) > 0:
                            selected_platforms = set(selected_filters["selectedSupportedPlatforms"])
                            tool_platforms = set(item.get('supportedPlatforms', []))
                            platform_overlap = len(tool_platforms.intersection(selected_platforms))
                            platform_bonus = (platform_overlap / max(len(selected_platforms), 1)) * platform_bonus_weight
                            final_score += platform_bonus
                        
                        # Function bonus
                        if selected_filters.get("selectedFunctions") and len(selected_filters["selectedFunctions"]) > 0:
                            selected_functions = set(selected_filters["selectedFunctions"])
                            tool_functions = set(item.get('functions', []))
                            function_overlap = len(tool_functions.intersection(selected_functions))
                            function_bonus = (function_overlap / max(len(selected_functions), 1)) * function_bonus_weight
                            final_score += function_bonus
                    
                    scored_items.append({
                        'item': item,
                        'similarity_score': float(final_score)
                    })
                except Exception as e:
                    print(f"Error computing similarity for item {item.get('name', 'Unknown')}: {e}")
                    # Include with 0 score if embedding fails
                    scored_items.append({
                        'item': item,
                        'similarity_score': 0.0
                    })
            
            # Sort by final score (similarity + bonus) in descending order
            scored_items.sort(key=lambda x: x['similarity_score'], reverse=True)
            
            return scored_items
        except Exception as e:
            print(f"Error computing similarity scores: {e}")
            return [{'item': item, 'similarity_score': 0.0} for item in catalog_items]

    def compute_similarity_score(self, query: str, tool_payload: dict):
        """
        Computes similarity score between a query and an individual tool.
        """
        if not self.qdrant_client:
            return 0.0
            
        try:
            # Get embedding for the query
            query_response = ollama.embeddings(model=self.embedding_model_name, prompt=query)
            query_vector = query_response["embedding"]
            
            # Create tool text for embedding (combining name and description)
            # Use correct Qdrant field names
            tool_name = tool_payload.get('product_feature_name') or ''
            tool_desc = tool_payload.get('description') or ''
            tool_text = f"{tool_name} {tool_desc}"
            tool_response = ollama.embeddings(model=self.embedding_model_name, prompt=tool_text)
            tool_vector = tool_response["embedding"]
            
            # Compute cosine similarity
            query_np = np.array(query_vector)
            tool_np = np.array(tool_vector)
            
            # Cosine similarity formula
            similarity = np.dot(query_np, tool_np) / (np.linalg.norm(query_np) * np.linalg.norm(tool_np))
            
            return float(similarity)
        except Exception as e:
            print(f"Error computing similarity: {e}")
            return 0.0

    def _extract_functions(self, payload):
        """Extract and format function categories from payload."""
        functions = []
        function_fields = ['reading', 'cognitive', 'vision', 'physical', 'hearing', 'speech_communication']
        function_mapping = {
            'reading': 'reading',
            'cognitive': 'cognitive',
            'vision': 'vision', 
            'physical': 'physical',
            'hearing': 'hearing',
            'speech_communication': 'speech'
        }
        
        for field in function_fields:
            if payload.get(field) is True:
                frontend_name = function_mapping.get(field, field)
                functions.append(frontend_name)
        
        return functions

    def _extract_supported_platforms(self, payload):
        """Extract and format supported platforms from payload."""
        platforms = []
        platform_fields = ['windows', 'macintosh', 'chromebook', 'ipad_ipados', 'iphone_ios', 'android']
        platform_mapping = {
            'windows': 'windows',
            'macintosh': 'macos',
            'chromebook': 'chromeos',
            'ipad_ipados': 'ipados',
            'iphone_ios': 'ios',
            'android': 'android'
        }
        
        for field in platform_fields:
            if payload.get(field) is True:
                frontend_name = platform_mapping.get(field, field)
                platforms.append(frontend_name)
        
        return platforms

    def _extract_install_types(self, payload):
        """Extract and format install types from payload."""
        install_types = []
        if payload.get('built_in') is True:
            install_types.append('builtIn')
        if payload.get('at_installed') is True:
            install_types.append('installable')
        
        return install_types

    def _extract_purchase_options(self, payload):
        """Extract and format purchase options from payload."""
        purchase_options = []
        purchase_fields = ['free', 'free_trial', 'lifetime_license', 'subscription']
        purchase_mapping = {
            'free': 'free',
            'free_trial': 'freeTrial',
            'lifetime_license': 'lifetimeLicense',
            'subscription': 'subscription'
        }
        
        for field in purchase_fields:
            if payload.get(field) is True:
                frontend_name = purchase_mapping.get(field, field)
                purchase_options.append(frontend_name)
        
        return purchase_options

    def handle_sort_tools(self):
        """
        Handle sorting tools by relevance to user's query
        Only performs AI-powered sorting if internet connection is available
        """
        try:
            # Check internet connectivity first
            if not check_internet_connection():
                # No internet - return simple alphabetical sort
                print("No internet connection detected - skipping AI-powered relevance sorting")
                error_response = {
                    "error": "Offline mode: AI-powered sorting not available",
                    "success": False,
                    "tools": [],
                    "offline_mode": True
                }
                self.send_response(200)  # Still return 200 for graceful handling
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(error_response).encode('utf-8'))
                return
            
            # Read the request body
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            # Parse the incoming request
            request_data = json.loads(post_data.decode('utf-8'))
            user_query = request_data.get('query', '')
            applied_filters = request_data.get('filters', {})
            visible_tools = request_data.get('visible_tools', [])
            visible_ids = request_data.get('visible_ids', [])
            # Normalize list of visible tool names received from frontend (names as shown in catalog.json)
            if isinstance(visible_tools, list):
                visible_tools_set = set([str(name).strip().lower() for name in visible_tools if isinstance(name, str)])
            else:
                visible_tools_set = set()
            # Normalize list of visible ids (catalog.json id field)
            if isinstance(visible_ids, list):
                visible_ids_set = set([str(_id).strip().lower() for _id in visible_ids if isinstance(_id, str)])
            else:
                visible_ids_set = set()
            
            # Convert filter format
            selected_filters = {
                "selectedFunctions": applied_filters.get("functions", []),
                "selectedSupportedPlatforms": applied_filters.get("platforms", []),
                "selectedInstallTypes": applied_filters.get("installTypes", []),
                "selectedPurchaseOptions": applied_filters.get("purchaseOptions", [])
            }
            
            # Step 1: Get filtered tools directly from catalog.json (no vector database)
            filtered_catalog_items = self.get_filtered_tools_from_catalog(
                selected_filters, visible_tools_set, visible_ids_set
            )
            
            if filtered_catalog_items and user_query:
                # Step 2: Use embeddings to compute similarity scores and sort (with bonus scoring)
                scored_items = self.compute_similarity_score_for_catalog_items(
                    user_query, filtered_catalog_items, selected_filters
                )
                
                # Step 3: Format output
                final_tools = []
                for scored_item in scored_items:
                    item = scored_item['item']
                    formatted_tool = {
                        "id": item.get('id', ''),
                        "tool_name": item.get('name', 'Unknown Tool'),
                        "company": item.get('company', 'Unknown Company'),
                        "description": item.get('description', 'No description available'),
                        "website_url": item.get('vendorProductPageUrl', ''),
                        "functions": item.get('functions', []),
                        "supportedPlatforms": item.get('supportedPlatforms', []),
                        "installTypes": item.get('installTypes', []),
                        "purchaseOptions": item.get('purchaseOptions', [])
                    }
                    final_tools.append(formatted_tool)
                
                response_data = {"tools": final_tools, "success": True, "sorted": True}
            else:
                response_data = {"error": "No tools to sort or no query provided", "success": False, "tools": []}
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            
        except Exception as e:
            print(f"Error handling sort tools request: {e}")
            error_response = {
                "error": str(e),
                "success": False,
                "tools": []
            }
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(error_response).encode('utf-8'))

    def handle_chatbot_conversation(self):
        """
        Handle the conversational chatbot flow for accessibility tool discovery
        """
        try:
            # Read the request body
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            # Parse the incoming request
            request_data = json.loads(post_data.decode('utf-8'))
            user_message = request_data.get('message', '')
            conversation_state = request_data.get('state', {})
            
            # Initialize conversation state if empty
            if not conversation_state:
                conversation_state = {
                    'step': 'who_is_this_for',
                    'target_person': 'you',  # Default to 'you', can be 'your {relation}'
                    'relationship': None,    # Will store the relationship if not for themselves
                    'devices': {},
                    'problem_description': '',
                    'disability_categories': [],
                    'applied_filters': {
                        'platforms': [],
                        'functions': [],
                        'installTypes': [],
                        'purchaseOptions': []
                    },
                    'conversation_history': []
                }
            
            # Add user message to history
            conversation_state['conversation_history'].append({
                'role': 'user',
                'message': user_message
            })
            
            # Process the conversation based on current step
            response_data = self.process_conversation_step(user_message, conversation_state)

            # Optionally: add debug hooks here
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            
        except Exception as e:
            print(f"Error handling chatbot conversation: {e}")
            error_response = {
                "error": str(e),
                "success": False,
                "bot_message": "I'm sorry, I encountered an error. Let's start over. What devices do you have access to at home, school, work, library, or anywhere else?"
            }
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(error_response).encode('utf-8'))

    

    def process_conversation_step(self, user_message, conversation_state):
        """
        Process each step of the conversation based on current state
        """
        current_step = conversation_state.get('step', 'who_is_this_for')
        
        if current_step == 'who_is_this_for':
            return self.handle_who_is_this_for(user_message, conversation_state)
        
        elif current_step == 'device_access_home':
            return self.handle_device_access_home(user_message, conversation_state)

        elif current_step == 'problem_description':
            return self.handle_problem_description(user_message, conversation_state)
        elif current_step == 'clarify_disability':
            return self.handle_clarify_disability(user_message, conversation_state)
        # elif current_step == 'install_type_question':
        #     return self.handle_install_type_question(user_message, conversation_state)
        # elif current_step == 'pricing_question':
        #     return self.handle_pricing_question(user_message, conversation_state)

        elif current_step == 'show_results':
            return self.handle_show_results(user_message, conversation_state)
        else:
            # Default: start over
            conversation_state['step'] = 'who_is_this_for'
            return self.handle_who_is_this_for(user_message, conversation_state)

    # Note: We intentionally rely on the LLM to produce clarifying questions.
    # Keep no-op placeholder here in case future hooks are needed.
    def build_generic_clarifier(self, conversation_state) -> str:
        return ""

    def create_problem_summary(self, user_message: str) -> str:
        """Create a concise, sanitized summary of the user's problem for UI/sorting text."""
        text = self.sanitize_text(user_message)
        # Trim overly long summaries
        if len(text) > 180:
            text = text[:177] + "..."
        return text

    def extract_who_with_keywords(self, user_message):
        """Fast keyword-based 'who is this for' detection"""
        import re
        
        message = user_message.lower().strip()
        
        # Self patterns
        self_patterns = [
            r'\b(me|myself|for me|for myself|it\'?s for me)\b',
            r'\bi am\b', r'\bi\'?m\b',
            r'\bthis is for me\b'
        ]
        
        for pattern in self_patterns:
            if re.search(pattern, message):
                return {
                    'success': True,
                    'action': 'for_self',
                    'target_person': 'you',
                    'relationship': None
                }
        
        # Relationship patterns
        relationship_patterns = {
            r'\b(my|for my)\s+(mom|mother|mama)\b': 'mother',
            r'\b(my|for my)\s+(dad|father|papa|pop)\b': 'father',
            r'\b(my|for my)\s+(son|boy)\b': 'son',
            r'\b(my|for my)\s+(daughter|girl)\b': 'daughter',
            r'\b(my|for my)\s+(wife|spouse)\b': 'wife',
            r'\b(my|for my)\s+(husband|spouse)\b': 'husband',
            r'\b(my|for my)\s+(brother|bro)\b': 'brother',
            r'\b(my|for my)\s+(sister|sis)\b': 'sister',
            r'\b(my|for my)\s+(friend|buddy|pal)\b': 'friend',
            r'\b(my|for my)\s+(colleague|coworker)\b': 'colleague',
            r'\b(my|for my)\s+(child|kid)\b': 'child',
            r'\b(my|for my)\s+(parent|parents)\b': 'parent',
            r'\b(my|for my)\s+(grandma|grandmother)\b': 'grandmother',
            r'\b(my|for my)\s+(grandpa|grandfather)\b': 'grandfather',
            r'\b(my|for my)\s+(uncle)\b': 'uncle',
            r'\b(my|for my)\s+(aunt)\b': 'aunt',
            r'\b(my|for my)\s+(cousin)\b': 'cousin',
            r'\b(my|for my)\s+(student)\b': 'student'
        }
        
        for pattern, relationship in relationship_patterns.items():
            if re.search(pattern, message):
                return {
                    'success': True,
                    'action': 'extract_relationship',
                    'target_person': f'your {relationship}',
                    'relationship': relationship
                }
        
        # Generic "someone else" patterns
        someone_else_patterns = [
            r'\bsomeone else\b', r'\banother person\b', r'\bnot for me\b',
            r'\bfor someone\b', r'\bother person\b', r'\bsomeone\b',
            r'\bfor a friend\b', r'\bfor my friend\b', r'\bfor a family member\b',
            r'\bfor someone i know\b', r'\bfor a colleague\b'
        ]
        
        for pattern in someone_else_patterns:
            if re.search(pattern, message):
                return {
                    'success': True,
                    'action': 'ask_who'
                }
        
        # No clear match found
        return {'success': False}

    def handle_who_is_this_for(self, user_message, conversation_state):
        """
        Handle the initial question about who the user is searching tools for
        """
        if not user_message or conversation_state.get('step') == 'who_is_this_for' and len(conversation_state.get('conversation_history', [])) <= 1:
            # First interaction - ask the initial question
            bot_message = "Hello! I'm here to help you find the right accessibility tools. \
            First, let me ask: Who are you searching for tools for? Is this for you, or for someone else?"
            
            conversation_state['conversation_history'].append({
                'role': 'bot',
                'message': bot_message
            })
            
            return {
                'bot_message': bot_message,
                'state': conversation_state,
                'success': True,
                'show_interface': False
            }
        
        # Try keyword-based detection first for speed
        keyword_result = self.extract_who_with_keywords(user_message)
        
        if keyword_result['success']:
            action = keyword_result['action']
            if action == 'for_self':
                # Tools are for the user themselves
                conversation_state['target_person'] = keyword_result['target_person']
                conversation_state['relationship'] = keyword_result['relationship']
            elif action == 'extract_relationship':
                # Clear relationship identified
                conversation_state['target_person'] = keyword_result['target_person']
                conversation_state['relationship'] = keyword_result['relationship']
            elif action == 'ask_who':
                action = 'ask_who' # Continue with existing logic
        else:
            # Fallback to simple clarification if keywords don't match
            action = 'ask_clarification'
        
        if action == 'for_self':
            # Tools are for the user themselves
            conversation_state['step'] = 'device_access_home'
            
            # Immediately ask the device question instead of waiting for another input
            bot_message = "Great! Now which devices would you like to be able to use or use better — at home, school, library etc.  List all that you are interested in ( PC, Mac, Chromebook, iPhone, iPad, Android Phone, Android Tablet, Fire tablet)"
            
        elif action == 'extract_relationship':
            # Clear relationship identified, move to device questions
            relationship = conversation_state.get('relationship', 'person')
            conversation_state['step'] = 'device_access_home'
            
            # Immediately ask the device question instead of waiting for another input
            bot_message = f"Great! Now which devices would you like {relationship} to be able to use or use better — at home, school, library etc.  List all that you are interested in ( PC, Mac, Chromebook, iPhone, iPad, Android Phone, Android Tablet, Fire tablet)"
            
        elif action == 'ask_who':
            # User said "someone else" - respect their privacy and move to device questions
            conversation_state['step'] = 'device_access_home'
            conversation_state['target_person'] = 'the person you are searching for'
            conversation_state['relationship'] = 'someone else'
            
            # Move directly to device questions without asking for relationship
            bot_message = "Great! Now which devices would you like to them to be able to use or use better — at home, school, library etc.  List all that you are interested in ( PC, Mac, Chromebook, iPhone, iPad, Android Phone, Android Tablet, Fire tablet)"
            
        else:  # ask_clarification
            # Stay in the same step, ask for clarification
            conversation_state['step'] = 'who_is_this_for'
            bot_message = "Are you looking for accessibility tools for yourself, or for someone else?"
        
        conversation_state['conversation_history'].append({
            'role': 'bot',
            'message': bot_message
        })
        
        return {
            'bot_message': bot_message,
            'state': conversation_state,
            'success': True,
            'show_interface': False
        }


    def extract_devices_with_keywords(self, user_message, conversation_state):
        """Fast keyword-based device detection"""
        import re
        
        message = user_message.lower().strip()
        target_person = conversation_state.get('target_person', 'you')
        detected_platforms = []
        needs_clarification = []
        
        # Check if we have partial devices from previous clarification
        partial_devices = conversation_state.get('partial_devices', [])
        if partial_devices:
            detected_platforms.extend(partial_devices)
            # Clear partial devices since we're processing them now
            conversation_state.pop('partial_devices', None)
        
        # Device patterns
        device_patterns = {
            'ios': [r'\biphone\b', r'\bios\b'],
            'android': [r'\bandroid\b', r'\bandroid phone\b', r'\bandroid tablet\b', r'\bfire\s*os\b', r'\bfire\s*tablet\b'],
            'ipados': [r'\bipad\b'],
            'windows': [r'\bwindows\b', r'\bpc\b', r'\bwindows laptop\b', r'\bwindows computer\b'],
            'macos': [r'\bmac\b', r'\bmacbook\b', r'\bmac laptop\b', r'\bmac computer\b', r'\bmacos\b'],
            'chromeos': [r'\bchromebook\b', r'\bchrome os\b', r'\bchromeos\b']
        }
        
        # Check for specific devices
        for platform, patterns in device_patterns.items():
            for pattern in patterns:
                if re.search(pattern, message):
                    detected_platforms.append(platform)
                    break
        
        # Check for unclear devices that need clarification
        # Only flag as unclear if the device type is mentioned but we haven't detected any related platforms
        if re.search(r'\bsm[a|e]rtphon[e|a]s?\b|\bsmart\s+phon[e|a]s?\b', message, re.IGNORECASE) and not any(p in detected_platforms for p in ['ios', 'android']):
            needs_clarification.append('smartphone')
            
        if re.search(r'\bphon[e|a]s?\b|\bfon[e|a]s?\b', message, re.IGNORECASE) and not any(p in detected_platforms for p in ['ios', 'android']):
            needs_clarification.append('phone')
            
        if re.search(r'\bla[b|p]to[b|p]s?\b', message, re.IGNORECASE) and not any(p in detected_platforms for p in ['windows', 'macos', 'chromeos']):
            needs_clarification.append('laptop')
            
        if re.search(r'\bcom[p|b]ut[e|o]rs?\b', message, re.IGNORECASE) and not any(p in detected_platforms for p in ['windows', 'macos', 'chromeos']):
            needs_clarification.append('computer')
            
        if re.search(r'\bta[b|p]l[e|i]ts?\b', message, re.IGNORECASE) and not any(p in detected_platforms for p in ['android', 'ipados']):
            needs_clarification.append('tablet')
        
        # Handle special cases
        if re.search(r'\bno devices?\b|\bdon\'?t have\b.*\bdevices?\b', message):
            # No devices - proceed without platform filters
            conversation_state['step'] = 'problem_description'
            
            if target_person == 'you':
                bot_message = "I understand. Let's focus on what tools might be available to you. Please describe the problems you are having in accessing or using those devices?."
            else:
                bot_message = f"I understand. Let's focus on what tools might be available to {target_person}. Please describe the problems {target_person} is having in accessing or using those devices?"
            
            return {
                'bot_message': bot_message,
                'state': conversation_state,
                'success': True,
                'show_interface': False
            }
        
        # If we have clear devices, proceed
        if detected_platforms and not needs_clarification:
            # Remove duplicates and apply filters
            detected_platforms = list(set(detected_platforms))
            
            # Set platforms and apply filters immediately
            platforms = {}
            platform_names = []
            for platform in detected_platforms:
                platforms[platform] = True
                if platform == 'macos': platform_names.append('Mac')
                elif platform == 'chromeos': platform_names.append('Chromebook')  
                elif platform == 'ipados': platform_names.append('iPad')
                elif platform == 'ios': platform_names.append('iPhone')
                else: platform_names.append(platform.capitalize())
            
            conversation_state['devices'] = platforms
            conversation_state['applied_filters']['platforms'] = detected_platforms
            conversation_state['step'] = 'problem_description'
            
            if target_person == 'you':
                bot_message = f"Perfect! Now, please describe the problems you are having in accessing or using those devices?"
            else:
                bot_message = f"Perfect! Now, please describe the problems {target_person} is having in accessing or using those devices?"
            
            
            return {
                'bot_message': bot_message,
                'state': conversation_state,
                'success': True,
                'show_interface': True
            }
        
        # If we need clarification, preserve already detected devices and ask about unclear ones
        if needs_clarification:
            # Store already detected platforms in conversation state for later combination
            if detected_platforms:
                conversation_state['partial_devices'] = detected_platforms
            
            clarifications = []
            
            if 'smartphone' in needs_clarification or 'phone' in needs_clarification:
                clarifications.append("What type of smartphone/phone (iPhone or Android)?")
            
            if any(device in needs_clarification for device in ['laptop', 'computer']):
                clarifications.append("What operating system for the laptop/computer (Windows, Mac, or Chromebook)?")
            
            if 'tablet' in needs_clarification:
                clarifications.append("What type of tablet (iPad or Android tablet)?")
            
            if target_person == 'you':
                bot_message = "Great! To help you find the right tools, could you tell me: " + " And ".join(clarifications)
            else:
                bot_message = f"Great! To help find the right tools for {target_person}, could you tell me: " + " And ".join(clarifications)
            
            return {
                'bot_message': bot_message,
                'state': conversation_state,
                'success': True,
                'show_interface': False
            }
        
        # If no devices detected and no clarification needed, fall back to AI
        return {'success': False}

    def handle_device_access_home(self, user_message, conversation_state):
        """
        Handle the question about device access at home
        """
        if not user_message or conversation_state.get('step') == 'device_access_home' and len(conversation_state.get('conversation_history', [])) <= 1:
            # Get the target person for appropriate pronouns
            target_person = conversation_state.get('target_person', 'you')
            
            # First interaction - ask the initial question
            if target_person == 'you':
                bot_message = "Great! Now which devices would you like to be able to use or use better — at home, school, library etc.  List all that you are interested in ( PC, Mac, Chromebook, iPhone, iPad, Android Phone, Android Tablet, Fire tablet)"
            else:
                bot_message = f"Great! Now which devices would you like them to be able to use or use better — at home, school, library etc.  List all that you are interested in ( PC, Mac, Chromebook, iPhone, iPad, Android Phone, Android Tablet, Fire tablet)"
            
            conversation_state['conversation_history'].append({
                'role': 'bot',
                'message': bot_message
            })
            
            return {
                'bot_message': bot_message,
                'state': conversation_state,
                'success': True,
                'show_interface': False
            }
        
        # Get the target person for appropriate pronouns
        target_person = conversation_state.get('target_person', 'you')

        # Try keyword-based device detection first for speed
        extracted_devices = self.extract_devices_with_keywords(user_message, conversation_state)
        if extracted_devices['success']:
            return extracted_devices

        # Fallback to AI for complex cases
        if target_person == 'you':
            device_analysis_prompt = f"""
User: "{user_message}"

Task: Determine available devices. If unclear devices mentioned (smartphone, laptop, computer without OS), ask for clarification. Never assume laptop/computer OS.

If "windows and mac" mentioned, they have multiple devices with different OS.

If they said they have no devices, proceed without platform filters.

Device mappings:
- iPhone → ios
- Android phone/tablet → android  
- iPad → ipados
- Windows computer/laptop/PC → windows
- Mac computer/laptop → macos
- Chromebook → chromeos

Respond with JSON:
{{
    "action": "ask_clarification" or "extract_devices" or "no_devices",
    "bot_message": "your response to user",
    "extracted_platforms": ["windows", "ios", etc] (only if action is extract_devices)
}}

Examples:
- "smartphone and laptop" → ask_clarification
- "iPhone and Windows laptop" → extract_devices: ["ios", "windows"]
- "windows and mac" → extract_devices: ["android", "windows", "macos"] (assumes android from context)
- "no devices" → no_devices
"""
        else:
            device_analysis_prompt = f"""
User: "{user_message}"

Task: Determine available devices for {target_person}. If unclear devices mentioned, ask for clarification. Never assume laptop/computer OS.

If "windows and mac" mentioned, they have multiple devices with different OS.

If they said {target_person} has no devices, proceed without platform filters.

Device mappings:
- iPhone → ios
- Android phone/tablet → android  
- iPad → ipados
- Windows computer/laptop/PC → windows
- Mac computer/laptop → macos
- Chromebook → chromeos

Respond with JSON:
{{
    "action": "ask_clarification" or "extract_devices" or "no_devices",
    "bot_message": "your response to user",
    "extracted_platforms": ["windows", "ios", etc] (only if action is extract_devices)
}}

Examples:
- User: "They have a smartphone and laptop" → {{"action": "ask_clarification", "bot_message": "Great! To help find the right tools for {target_person}, could you tell me: What type of smartphone does {target_person} have (iPhone or Android)? And what operating system does their laptop use (Windows, Mac, or Chromebook)?"}}
- User: "They have a laptop and android phone" → {{"action": "ask_clarification", "bot_message": "Perfect! I can see {target_person} has an Android phone. What operating system does {target_person}'s laptop use - Windows, Mac, or Chromebook?"}}
- User: "android phone, windows and mac laptop" → {{"action": "extract_devices", "bot_message": "Perfect! I can see {target_person} has an Android phone, a Windows laptop, and a Mac laptop. Now, please describe the problems {target_person} is having in accessing or using those devices?", "extracted_platforms": ["android", "windows", "macos"]}}
- User: "windows and mac" (when asked about laptop type) → {{"action": "extract_devices", "bot_message": "Great! So {target_person} has both a Windows laptop and a Mac laptop, plus an Android phone. Now, please describe the problems {target_person} is having in accessing or using those devices?", "extracted_platforms": ["android", "windows", "macos"]}}
- User: "iPhone and Windows laptop" → {{"action": "extract_devices", "bot_message": "Perfect! Now, please describe the problems {target_person} is having in accessing or using those devices?", "extracted_platforms": ["ios", "windows"]}}
- User: "No devices" → {{"action": "no_devices", "bot_message": "I understand. Let's focus on what tools might be available to {target_person}. Please describe the problems {target_person} is having in accessing or using those devices?"}}
"""
        
        # Get AI analysis
        analysis = self.get_ai_analysis(device_analysis_prompt)
        action = analysis.get('action', 'ask_clarification')
        bot_message = analysis.get('bot_message', 'Could you tell me more about your devices?')
        
        if action == 'extract_devices':
            # Clear device information provided, move to problem description
            conversation_state['step'] = 'problem_description'
            platforms = analysis.get('extracted_platforms', [])
            conversation_state['applied_filters']['platforms'] = platforms
            
            # Apply platform filters immediately and notify user
            if platforms:
                platform_names = []
                for p in platforms:
                    if p == 'macos': platform_names.append('Mac')
                    elif p == 'chromeos': platform_names.append('Chromebook')  
                    elif p == 'ipados': platform_names.append('iPad')
                    elif p == 'ios': platform_names.append('iPhone')
                    else: platform_names.append(p.capitalize())
            
        elif action == 'no_devices':
            # No devices - proceed without platform filters
            conversation_state['step'] = 'problem_description'
            
        else:  # ask_clarification
            # Stay in the same step, let AI handle clarification
            conversation_state['step'] = 'device_access_home'
        
        conversation_state['conversation_history'].append({
            'role': 'bot',
            'message': bot_message
        })
        
        return {
            'bot_message': bot_message,
            'state': conversation_state,
            'success': True,
            'show_interface': True if action == 'extract_devices' and analysis.get('extracted_platforms') else False
        }







    def handle_problem_description(self, user_message, conversation_state):
        """
        Handle the user's problem description and identify disability categories
        """
        conversation_state['problem_description'] = user_message
        # Maintain a concise summary for UI/sorting text
        if not conversation_state.get('problem_summary'):
            conversation_state['problem_summary'] = self.create_problem_summary(user_message)

        # Get the target person for appropriate pronouns
        target_person = conversation_state.get('target_person', 'you')
        
        # Include conversation history for context, but keep prompt simple
        recent_history = conversation_state.get('conversation_history', [])[-6:]  # Last 6 turns
        history_text = "\n".join([f"{h.get('role', 'unknown')}: {self.sanitize_text(h.get('message', ''))[:120]}" for h in recent_history])
        
        if target_person == 'you':
            disability_analysis_prompt = f"""
Recent conversation (most recent last):
{history_text}

Current message: "{user_message}"

Task: Maintain and refine a concise problem summary and determine if you are HIGHLY CONFIDENT about ALL relevant categories. Only set ambiguous=false if you are 100% certain about every category you list AND certain no other categories might apply.
Categories to choose from: reading, cognitive, vision, physical, hearing, speech

Return ONLY JSON:
{{
  "updated_summary": "one sentence summary of the actual problem",
  "ambiguous": true or false,
  "categories": ["only categories you are 100% confident about"],
  "question": "one short clarifying question if ambiguous else empty"
}}
"""
        else:
            disability_analysis_prompt = f"""
Recent conversation (most recent last):
{history_text}

Current message about {target_person}: "{user_message}"

Task: Maintain and refine a concise problem summary for {target_person} and determine if you are HIGHLY CONFIDENT about ALL relevant categories. Only set ambiguous=false if you are 100% certain about every category you list AND certain no other categories might apply.
Categories to choose from: reading, cognitive, vision, physical, hearing, speech

Return ONLY JSON:
{{
  "updated_summary": "one sentence summary of the actual problem",
  "ambiguous": true or false,
  "categories": ["only categories you are 100% confident about"],
  "question": "one short clarifying question if ambiguous else empty"
}}
"""
        
        analysis = self.get_ai_analysis(disability_analysis_prompt)
        
        # Update problem summary from model if provided
        updated_summary = analysis.get('updated_summary')
        if isinstance(updated_summary, str) and updated_summary.strip():
            conversation_state['problem_summary'] = self.create_problem_summary(updated_summary)

        ambiguous = analysis.get('ambiguous')
        categories = analysis.get('categories', []) or []

        if ambiguous is False and len(categories) > 0:
            # Zero ambiguity → proceed to results
            conversation_state['step'] = 'show_results'
            conversation_state['disability_categories'] = categories
            conversation_state['applied_filters']['functions'] = categories
            bot_message = self.generate_final_results_message(conversation_state)
        else:
            # Keep asking for clarification
            conversation_state['step'] = 'clarify_disability'
            bot_message = analysis.get('question') or "Could you tell me more about what you're having trouble with?"
        
        conversation_state['conversation_history'].append({
            'role': 'bot',
            'message': bot_message
        })
        
        return {
            'bot_message': bot_message,
            'state': conversation_state,
            'success': True,
            'show_interface': True if conversation_state['step'] == 'show_results' else False,
            'request_sorting': True if conversation_state['step'] == 'show_results' else False
        }

    def handle_clarify_disability(self, user_message, conversation_state):
        """
        Handle clarification questions about disability categories
        """
        # Get the target person for appropriate pronouns
        target_person = conversation_state.get('target_person', 'you')

        # Include conversation history for clarification context
        recent_history = conversation_state.get('conversation_history', [])[-6:]  # Last 6 turns
        history_text = "\n".join([f"{h.get('role', 'unknown')}: {self.sanitize_text(h.get('message', ''))[:120]}" for h in recent_history])
        
        if target_person == 'you':
            disability_analysis_prompt = f"""
Recent conversation (most recent last):
{history_text}

Current message: "{user_message}"

Task: Refine the problem summary and check if you are HIGHLY CONFIDENT about ALL relevant categories. Only set ambiguous=false if you are 100% certain about every category AND certain no other categories might apply. If uncertain about any category, ask ONE helpful clarifying question (or explain your question if they asked "what do you mean?").
Categories to choose from: reading, cognitive, vision, physical, hearing, speech

Return ONLY JSON:
{{
  "updated_summary": "one sentence summary of the actual problem",
  "ambiguous": true or false,
  "categories": ["only categories you are 100% confident about"],
  "question": "one short clarifying question if ambiguous else empty"
}}
"""
        else:
            disability_analysis_prompt = f"""
Recent conversation (most recent last):
{history_text}

Current message about {target_person}: "{user_message}"

Task: Refine the problem summary and check if you are HIGHLY CONFIDENT about ALL relevant categories. Only set ambiguous=false if you are 100% certain about every category AND certain no other categories might apply. If uncertain about any category, ask ONE helpful clarifying question (or explain your question if they asked "what do you mean?").
Categories to choose from: reading, cognitive, vision, physical, hearing, speech

Return ONLY JSON:
{{
  "updated_summary": "one sentence summary of the actual problem",
  "ambiguous": true or false,
  "categories": ["only categories you are 100% confident about"],
  "question": "one short clarifying question if ambiguous else empty"
}}
"""
        
        analysis = self.get_ai_analysis(disability_analysis_prompt)
        
        # Update problem description 
        original_problem = conversation_state.get('problem_description', '')
        full_context = f"Original problem: {original_problem}\nAdditional details: {user_message}"
        conversation_state['problem_description'] = full_context
        
        updated_summary = analysis.get('updated_summary')
        if isinstance(updated_summary, str) and updated_summary.strip():
            conversation_state['problem_summary'] = self.create_problem_summary(updated_summary)

        ambiguous = analysis.get('ambiguous')
        categories = analysis.get('categories', []) or []

        if ambiguous is False and len(categories) > 0:
            # Zero ambiguity → proceed to results
            conversation_state['step'] = 'show_results'
            conversation_state['disability_categories'] = categories
            conversation_state['applied_filters']['functions'] = categories
            # Generate final results message
            bot_message = self.generate_final_results_message(conversation_state)
        else:
            # Keep asking for clarification
            conversation_state['step'] = 'clarify_disability'
            bot_message = analysis.get('question') or "Could you tell me more about what you're having trouble with?"
            conversation_state['conversation_history'].append({'role': 'bot','message': bot_message})
            return {
                'bot_message': bot_message,
                'state': conversation_state,
                'success': True,
                'show_interface': False
            }
        
        # The generate_final_results_message already includes filter information, no need to duplicate
        
        # # OLD CODE - Skip install type and pricing questions
        # # Check result count for install type question
        # result_count = self.get_actual_result_count(conversation_state['applied_filters'])
        # 
        # if result_count > 20:
        #     if target_person == 'you':
        #         bot_message = f"Thank you for the clarification! I found {result_count} tools that could help. The list might be quite long. Would you prefer built-in tools (already on your device) or are you okay with installing new software?"
        #     else:
        #         bot_message = f"Thank you for the clarification! I found {result_count} tools that could help {target_person}. The list might be quite long. Would you prefer built-in tools (already on {target_person}'s device) or are you okay with installing new software?"
        # else:
        #     conversation_state['step'] = 'pricing_question'
        #     if target_person == 'you':
        #         bot_message = "Perfect! I found some tools that might help. Do you need to filter by pricing, or would you prefer to see all options? You can specify things like 'free tools only' or 'subscription is okay'."
        #     else:
        #         bot_message = f"Perfect! I found some tools that might help {target_person}. Do you need to filter by pricing, or would you prefer to see all options? You can specify things like 'free tools only' or 'subscription is okay'."
        
        conversation_state['conversation_history'].append({
            'role': 'bot',
            'message': bot_message
        })
        
        return {
            'bot_message': bot_message,
            'state': conversation_state,
            'success': True,
            'show_interface': True if conversation_state['step'] == 'show_results' else False,
            'request_sorting': True if conversation_state['step'] == 'show_results' else False
        }

    # def handle_install_type_question(self, user_message, conversation_state):
    #     """
    #     Handle install type preferences or sorting choice
    #     """
    #     install_analysis_prompt = f"""
    # The user said: "{user_message}"
    # 
    # Determine their installation preference:
    # 1. Built-in tools only (already on device)
    # 2. Installable tools only (okay with downloading/installing)
    # 3. Both types are fine
    # 
    # Examples:
    # - "built-in tools" → choice: "built_in", install_types: ["builtIn"]
    # - "I can install software" → choice: "installable", install_types: ["installable"]
    # - "either is fine" → choice: "both", install_types: ["builtIn", "installable"]
    # 
    # Respond with JSON:
    # {{
    #     "choice": "built_in" or "installable" or "both",
    #     "install_types": ["builtIn"] or ["installable"] or ["builtIn", "installable"]
    # }}
    # """
    #     
    #     analysis = self.get_ai_analysis(install_analysis_prompt)
    #     choice = analysis.get('choice', 'both')
    #     
    #     conversation_state['step'] = 'pricing_question'
    #     if choice != 'both':
    #         conversation_state['applied_filters']['installTypes'] = analysis.get('install_types', [])
    #     
    #     # Get the target person for appropriate pronouns
    #     target_person = conversation_state.get('target_person', 'you')
    #     
    #     if target_person == 'you':
    #         bot_message = "Great! Now, do you need to filter by pricing, or would you prefer to see all options? You can specify things like 'free tools only', 'subscription is okay', etc."
    #     else:
    #         bot_message = f"Great! Now, do you need to filter by pricing, or would you prefer to see all options for {target_person}? You can specify things like 'free tools only', 'subscription is okay', etc."
    #     
    #     conversation_state['conversation_history'].append({
    #         'role': 'bot',
    #         'message': bot_message
    #     })
    #     
    #     return {
    #         'bot_message': bot_message,
    #         'state': conversation_state,
    #         'success': True,
    #         'show_interface': False
    #     }

    # def handle_pricing_question(self, user_message, conversation_state):
    #     """
    #     Handle pricing preferences or final sorting choice
    #     """
    #     pricing_analysis_prompt = f"""
    # The user said: "{user_message}"
    # 
    # Determine their pricing preference:
    # 1. Free tools only
    # 2. Free trial acceptable 
    # 3. Lifetime license acceptable
    # 4. Subscription acceptable
    # 5. All pricing options (no specific preference)
    # 
    # Map to: free, freeTrial, lifetimeLicense, subscription
    # 
    # Examples:
    # - "show me free tools" → choice: "specific_pricing", pricing_options: ["free"]
    # - "free or trial is fine" → choice: "specific_pricing", pricing_options: ["free", "freeTrial"]
    # - "show me all options" → choice: "all_pricing", pricing_options: []
    # 
    # Respond with JSON:
    # {{
    #     "choice": "specific_pricing" or "all_pricing",
    #     "pricing_options": ["free"] or ["free", "freeTrial"] etc or []
    # }}
    # """
    #     
    #     analysis = self.get_ai_analysis(pricing_analysis_prompt)
    #     choice = analysis.get('choice', 'all_pricing')
    #     
    #     if choice == 'specific_pricing':
    #         conversation_state['applied_filters']['purchaseOptions'] = analysis.get('pricing_options', [])
    #     
    #     # After pricing question, go directly to showing results
    #     conversation_state['step'] = 'show_results'
    #     
    #     # Get actual result count to show in message
    #     result_count = self.get_actual_result_count(conversation_state['applied_filters'])
    #     
    #     bot_message = self.generate_final_results_message(conversation_state, include_relevance_note=False)
    #     
    #     conversation_state['conversation_history'].append({
    #         'role': 'bot',
    #         'message': bot_message
    #     })
    #     
    #     return {
    #         'bot_message': bot_message,
    #         'state': conversation_state,
    #         'success': True,
    #         'show_interface': True
    #     }



    def handle_show_results(self, user_message, conversation_state):
        """
        Handle follow-up when results are shown. Always sort by relevance automatically.
        """
        # Always trigger relevance sorting and inform the user
        conversation_state['requested_sorting'] = True

        bot_message = self.generate_final_results_message(conversation_state, include_relevance_note=False)

        conversation_state['conversation_history'].append({
            'role': 'bot',
            'message': bot_message
        })

        return {
            'bot_message': bot_message,
            'state': conversation_state,
            'success': True,
            'show_interface': True,
            'request_sorting': True
        }



    def get_actual_result_count(self, filters):
        """
        Get the actual number of results based on applied filters from catalog.json
        """
        try:
            # Convert filter format for filtering
            selected_filters = {
                "selectedFunctions": filters.get("functions", []),
                "selectedSupportedPlatforms": filters.get("platforms", []),
                "selectedInstallTypes": filters.get("installTypes", []),
                "selectedPurchaseOptions": filters.get("purchaseOptions", [])
            }
            
            # Get filtered tools from catalog.json
            filtered_results = self.get_filtered_tools_from_catalog(selected_filters)
            return len(filtered_results)
            
        except Exception as e:
            print(f"Error getting actual result count: {e}")
            return 0

    def generate_final_results_message(self, conversation_state):
        """
        Generate the final message with instructions and tutorial
        """

        # Compute the number of matching results based on current filters
        try:
            matching_count = self.get_actual_result_count(conversation_state.get('applied_filters', {}))
        except Exception:
            matching_count = 0

        message = f""" Click on any item in the list on the right to learn more about it<br><br>

✅ <strong>There are {matching_count} items that match. </strong><br>
If you would like to make the list shorter you can use the checkboxes under  “Built in or Installed?”  Or  “Purchase Options" to explore only items for each of those categories."""

        return message

    def get_ai_analysis(self, prompt):
        """
        Get AI analysis using Gemma2:9B model via Ollama
        """
        try:
            # Lightweight prompt length logging
            try:
                print(f"[AI] Prompt length: {len(prompt)} chars")
            except Exception:
                pass
            ollama_data = {
                "model": "gemma2:9b",
                "prompt": prompt,
                "stream": False,
                "temperature": 0.0,
                "top_p": 0.1,
                "top_k": 1,
                "seed": 42
            }
            
            ollama_request = urllib.request.Request(
                'http://localhost:11434/api/generate',
                data=json.dumps(ollama_data).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            
            with urllib.request.urlopen(ollama_request) as response:
                ollama_response = json.loads(response.read().decode('utf-8'))
                ai_response = ollama_response.get('response', '')
                
                # Try to parse JSON from AI response
                try:
                    json_start = ai_response.find('{')
                    json_end = ai_response.rfind('}') + 1
                    
                    if json_start != -1 and json_end > json_start:
                        json_str = ai_response[json_start:json_end]
                        parsed = json.loads(json_str)
                        # Log minimal info about parsed JSON
                        try:
                            print(f"[AI] Parsed JSON keys: {list(parsed.keys())[:6]}")
                        except Exception:
                            pass
                        return parsed
                    else:
                        print("[AI] No JSON detected in model response")
                        return {}
                except Exception as parse_err:
                    print(f"[AI] JSON parse error: {parse_err}")
                    return {}
                    
        except Exception as e:
            print(f"Error in AI analysis: {e}")
            return {}

    def handle_download_setup(self):
        """Handle setup package download requests with on-disk caching."""
        import zipfile
        import tempfile
        from urllib.parse import urlparse, parse_qs

        try:
            # Parse query parameters
            parsed_url = urlparse(self.path)
            query_params = parse_qs(parsed_url.query)
            platform = query_params.get('platform', [''])[0]

            if platform not in ['windows', 'macos', 'linux']:
                self.send_error(400, f"Unsupported platform: {platform}")
                return

            # Cache directory and cached zip path
            CACHE_DIR = Path('./setup_cache')
            CACHE_DIR.mkdir(parents=True, exist_ok=True)
            cached_zip_path = CACHE_DIR / f"ollama-chatbot-setup-{platform}.zip"

            # If cached zip exists, serve it immediately
            if cached_zip_path.exists() and cached_zip_path.is_file():
                print(f"[SETUP] Serving cached {platform} setup package")
                self.send_response(200)
                self.send_header('Content-Type', 'application/zip')
                self.send_header('Content-Disposition', f'attachment; filename="ollama-chatbot-setup-{platform}.zip"')
                self.send_header('Content-Length', str(cached_zip_path.stat().st_size))
                self.end_headers()
                with open(cached_zip_path, 'rb') as f:
                    shutil.copyfileobj(f, self.wfile)
                return

            print(f"[SETUP] Generating {platform} setup package (no cache found)...")

            # Ensure installer is cached
            if not self.ensure_installer_cached(platform):
                print(f"[SETUP] Warning: Could not cache {platform} installer, will use original URLs")

            # Create temporary directory for the package
            with tempfile.TemporaryDirectory() as temp_dir:
                package_dir = Path(temp_dir) / f"ollama-chatbot-setup-{platform}"
                package_dir.mkdir()

                # Create platform-specific files
                if platform == 'windows':
                    install_script = self.create_windows_install_script()
                    (package_dir / "INSTALL-CHATBOT.ps1").write_text(install_script, encoding='utf-8')
                    batch_content = self.create_batch_file()
                    (package_dir / "INSTALL-CHATBOT.bat").write_text(batch_content, encoding='utf-8')
                    
                    # Bundle Ollama installer
                    if self.ensure_installer_cached(platform):
                        installer_filename = INSTALLER_URLS[platform].split('/')[-1]
                        installer_path = INSTALLER_CACHE_DIR / installer_filename
                        if installer_path.exists():
                            shutil.copy2(installer_path, package_dir / installer_filename)
                            print(f"[SETUP] Bundled {installer_filename} in Windows package")
                elif platform == 'macos':
                    install_script = self.create_macos_install_script()
                    (package_dir / "install-chatbot.sh").write_text(install_script, encoding='utf-8')
                    import stat
                    script_path = package_dir / "install-chatbot.sh"
                    script_path.chmod(script_path.stat().st_mode | stat.S_IEXEC)
                    
                    # Bundle Ollama installer
                    if self.ensure_installer_cached(platform):
                        installer_filename = INSTALLER_URLS[platform].split('/')[-1]
                        installer_path = INSTALLER_CACHE_DIR / installer_filename
                        if installer_path.exists():
                            shutil.copy2(installer_path, package_dir / installer_filename)
                            print(f"[SETUP] Bundled {installer_filename} in macOS package")
                elif platform == 'linux':
                    install_script = self.create_linux_install_script()
                    (package_dir / "install-chatbot.sh").write_text(install_script, encoding='utf-8')
                    import stat
                    script_path = package_dir / "install-chatbot.sh"
                    script_path.chmod(script_path.stat().st_mode | stat.S_IEXEC)
                    
                    # Bundle Ollama installer
                    if self.ensure_installer_cached(platform):
                        installer_filename = INSTALLER_URLS[platform].split('/')[-1]
                        installer_path = INSTALLER_CACHE_DIR / installer_filename
                        if installer_path.exists():
                            shutil.copy2(installer_path, package_dir / installer_filename)
                            print(f"[SETUP] Bundled {installer_filename} in Linux package")

                # Create README file for all platforms
                readme_content = self.create_readme_content(platform)
                (package_dir / "README.txt").write_text(readme_content, encoding='utf-8')

                # Create zip file into cache
                with tempfile.TemporaryDirectory() as zip_temp_dir:
                    temp_zip_path = Path(zip_temp_dir) / f"ollama-chatbot-setup-{platform}.zip"
                    with zipfile.ZipFile(temp_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                        for file_path in package_dir.rglob('*'):
                            if file_path.is_file():
                                arcname = file_path.relative_to(package_dir.parent)
                                zipf.write(file_path, arcname)
                    # Move to cache atomically
                    shutil.move(str(temp_zip_path), str(cached_zip_path))

                # Serve the cached file we just created
                self.send_response(200)
                self.send_header('Content-Type', 'application/zip')
                self.send_header('Content-Disposition', f'attachment; filename="ollama-chatbot-setup-{platform}.zip"')
                self.send_header('Content-Length', str(cached_zip_path.stat().st_size))
                self.end_headers()
                with open(cached_zip_path, 'rb') as f:
                    shutil.copyfileobj(f, self.wfile)

                print(f"[SETUP] {platform.title()} setup package generated and cached successfully")

        except Exception as e:
            print(f"[SETUP] Error generating setup package: {e}")
            self.send_error(500, f"Error generating setup package: {str(e)}")

    def handle_installer_download(self):
        """Handle installer file downloads from cache"""
        try:
            # Extract filename from path
            filename = self.path.split('/')[-1]
            installer_path = INSTALLER_CACHE_DIR / filename
            
            if not installer_path.exists():
                self.send_error(404, "Installer not found")
                return
            
            # Serve the installer file
            self.send_response(200)
            self.send_header('Content-Type', 'application/octet-stream')
            self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
            self.send_header('Content-Length', str(installer_path.stat().st_size))
            self.end_headers()
            
            with open(installer_path, 'rb') as f:
                shutil.copyfileobj(f, self.wfile)
                
        except Exception as e:
            print(f"[INSTALLER] Error serving installer: {e}")
            self.send_error(500, f"Error serving installer: {str(e)}")

    def ensure_installer_cached(self, platform):
        """Ensure installer for platform is downloaded and cached"""
        if platform not in INSTALLER_URLS:
            return False
            
        installer_filename = INSTALLER_URLS[platform].split('/')[-1]
        installer_path = INSTALLER_CACHE_DIR / installer_filename
        
        # Create cache directory if it doesn't exist
        INSTALLER_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        
        # Download if not cached
        if not installer_path.exists():
            try:
                print(f"[INSTALLER] Downloading {platform} installer...")
                urllib.request.urlretrieve(INSTALLER_URLS[platform], installer_path)
                print(f"[INSTALLER] {platform} installer cached successfully")
                return True
            except Exception as e:
                print(f"[INSTALLER] Failed to download {platform} installer: {e}")
                return False
        
        return True

    def create_macos_install_script(self):
        """Create the macOS installation script"""
        return '''#!/bin/bash
# Ollama Chatbot One-Click Installation Script for macOS
# This script will automatically install Ollama and download required models

set -e  # Exit on any error

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
CYAN='\\033[0;36m'
NC='\\033[0m' # No Color

echo -e "${GREEN}Starting Ollama Chatbot Setup for macOS...${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${BLUE}Installation started at: $(date)${NC}"
echo ""

# Check if running with appropriate permissions
if [[ $EUID -eq 0 ]]; then
    echo -e "${YELLOW}Warning: Running as root is not recommended for this installation.${NC}"
    echo -e "${YELLOW}This script will prompt for sudo when needed.${NC}"
    echo ""
fi

# Check if Homebrew is installed (recommended but not required)
if command -v brew &> /dev/null; then
    echo -e "${GREEN}Homebrew detected - using brew for installation${NC}"
    HOMEBREW_AVAILABLE=true
else
    echo -e "${YELLOW}Homebrew not detected - will use direct download method${NC}"
    HOMEBREW_AVAILABLE=false
fi

# Check if Ollama is already installed
echo -e "${CYAN}Checking for existing Ollama installation...${NC}"
if command -v ollama &> /dev/null; then
    echo -e "${GREEN}Ollama is already installed at: $(which ollama)${NC}"
    VERSION=$(ollama --version 2>/dev/null || echo "unknown")
    echo -e "${GREEN}Version: $VERSION${NC}"
else
    echo -e "${CYAN}Downloading and installing Ollama...${NC}"
    
    if [ "$HOMEBREW_AVAILABLE" = true ]; then
        echo -e "${CYAN}Installing Ollama via Homebrew...${NC}"
        brew install ollama
        echo -e "${GREEN}Ollama installed successfully via Homebrew!${NC}"
    else
        echo -e "${CYAN}Installing Ollama via direct download...${NC}"
        
        # Use bundled Ollama installer
        SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        BUNDLED_INSTALLER="$SCRIPT_DIR/Ollama-darwin.zip"
        
        if [ -f "$BUNDLED_INSTALLER" ]; then
            echo -e "${GREEN}Using bundled Ollama installer...${NC}"
            DOWNLOAD_PATH="$BUNDLED_INSTALLER"
        else
            echo -e "${YELLOW}Bundled installer not found, downloading...${NC}"
            OLLAMA_URL="https://ollama.com/download/Ollama-darwin.zip"
            TEMP_DIR=$(mktemp -d)
            DOWNLOAD_PATH="$TEMP_DIR/Ollama-darwin.zip"
            curl -L -o "$DOWNLOAD_PATH" "$OLLAMA_URL"
        fi
        
        echo -e "${CYAN}Extracting Ollama...${NC}"
        unzip -q "$DOWNLOAD_PATH" -d "$TEMP_DIR"
        
        echo -e "${CYAN}Installing Ollama to /Applications...${NC}"
        if [ -d "/Applications/Ollama.app" ]; then
            echo -e "${YELLOW}Removing existing Ollama installation...${NC}"
            rm -rf "/Applications/Ollama.app"
        fi
        
        cp -R "$TEMP_DIR/Ollama.app" "/Applications/"
        
        # Add Ollama CLI to PATH
        OLLAMA_CLI_PATH="/Applications/Ollama.app/Contents/Resources/ollama"
        if [ -f "$OLLAMA_CLI_PATH" ]; then
            echo -e "${CYAN}Creating symbolic link for ollama command...${NC}"
            sudo ln -sf "$OLLAMA_CLI_PATH" "/usr/local/bin/ollama"
        fi
        
        # Clean up
        rm -rf "$TEMP_DIR"
        
        echo -e "${GREEN}Ollama installed successfully!${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}IMPORTANT: Starting Ollama service...${NC}"
    echo -e "${YELLOW}This will launch Ollama in the background.${NC}"
fi

# Kill any existing Ollama processes to prevent conflicts
echo -e "${CYAN}Stopping any existing Ollama processes...${NC}"
pkill -f ollama || true
sleep 2
echo -e "${GREEN}Cleared existing Ollama processes${NC}"

# Start Ollama service
echo -e "${CYAN}Starting Ollama service...${NC}"
if [ "$HOMEBREW_AVAILABLE" = true ]; then
    # Start with brew services if available
    brew services start ollama || {
        echo -e "${YELLOW}Brew services failed, starting manually...${NC}"
        nohup ollama serve > /dev/null 2>&1 &
    }
else
    # Start manually
    nohup ollama serve > /dev/null 2>&1 &
fi

sleep 5
echo -e "${GREEN}Ollama service started${NC}"

# Verify service is responsive
echo -e "${CYAN}Verifying Ollama service...${NC}"
ATTEMPTS=0
MAX_ATTEMPTS=15
SERVICE_READY=false

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${GREEN}Ollama service is responsive and ready!${NC}"
        SERVICE_READY=true
        break
    else
        ATTEMPTS=$((ATTEMPTS + 1))
        if [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; then
            echo -e "${YELLOW}Waiting for Ollama service to be ready... (attempt $ATTEMPTS/$MAX_ATTEMPTS)${NC}"
            sleep 3
        else
            echo -e "${YELLOW}Ollama service is taking longer than expected, but continuing...${NC}"
            break
        fi
    fi
done

if [ "$SERVICE_READY" = false ]; then
    echo -e "${YELLOW}WARNING: Ollama service may not be fully ready${NC}"
    echo -e "${YELLOW}Model downloads may take longer or fail${NC}"
fi

# Check if models are installed
echo -e "${CYAN}Checking for required models...${NC}"

MODELS_NEEDED=("gemma2:9b" "nomic-embed-text")
MODELS_TO_DOWNLOAD=()

for MODEL in "${MODELS_NEEDED[@]}"; do
    if ollama list 2>/dev/null | grep -q "$MODEL"; then
        echo -e "${GREEN}Model $MODEL is already installed${NC}"
    else
        echo -e "${YELLOW}Model $MODEL needs to be downloaded${NC}"
        MODELS_TO_DOWNLOAD+=("$MODEL")
    fi
done

# Download missing models
if [ ${#MODELS_TO_DOWNLOAD[@]} -gt 0 ]; then
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}DOWNLOADING MODELS${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo -e "${YELLOW}This will download ${#MODELS_TO_DOWNLOAD[@]} model(s):${NC}"
    for MODEL in "${MODELS_TO_DOWNLOAD[@]}"; do
        echo -e "${BLUE}  - $MODEL${NC}"
    done
    echo ""
    echo -e "${YELLOW}IMPORTANT: This may take 10-30 minutes depending on your internet speed.${NC}"
    echo -e "${YELLOW}Please be patient and do not close this terminal.${NC}"
    echo ""
    read -p "Press Enter to start downloading models..."
    
    MODEL_COUNT=0
    for MODEL in "${MODELS_TO_DOWNLOAD[@]}"; do
        MODEL_COUNT=$((MODEL_COUNT + 1))
        echo ""
        echo -e "${CYAN}[$MODEL_COUNT/${#MODELS_TO_DOWNLOAD[@]}] Downloading $MODEL...${NC}"
        echo -e "${YELLOW}This may take several minutes...${NC}"
        
        if ollama pull "$MODEL"; then
            echo -e "${GREEN}Successfully downloaded $MODEL!${NC}"
        else
            echo -e "${RED}Failed to download $MODEL${NC}"
        fi
    done
    
    echo ""
    echo -e "${GREEN}Model downloads completed!${NC}"
else
    echo -e "${GREEN}All required models are already installed${NC}"
fi

# Test the installation
echo -e "${CYAN}Testing installation...${NC}"
if ollama list > /dev/null 2>&1; then
    echo -e "${GREEN}Ollama is working correctly!${NC}"
    echo -e "${CYAN}Installed models:${NC}"
    ollama list
else
    echo -e "${RED}Installation test failed${NC}"
    echo -e "${YELLOW}Please check that Ollama is running and try again${NC}"
fi

echo ""
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Your local AI chatbot is now ready to use!${NC}"
echo -e "${CYAN}You can now use your chatbot application.${NC}"
echo ""
echo -e "${CYAN}Ollama API is available at: http://localhost:11434${NC}"
echo ""
echo -e "${BLUE}To start Ollama manually in the future:${NC}"
if [ "$HOMEBREW_AVAILABLE" = true ]; then
    echo -e "${BLUE}  brew services start ollama${NC}"
else
    echo -e "${BLUE}  ollama serve${NC}"
fi
echo ""
echo -e "${BLUE}To stop Ollama:${NC}"
if [ "$HOMEBREW_AVAILABLE" = true ]; then
    echo -e "${BLUE}  brew services stop ollama${NC}"
else
    echo -e "${BLUE}  pkill ollama${NC}"
fi
echo ""
echo -e "${GREEN}Installation completed successfully!${NC}"
'''

    def create_linux_install_script(self):
        """Create the Linux installation script"""
        return '''#!/bin/bash
# Ollama Chatbot One-Click Installation Script for Linux
# This script will automatically install Ollama and download required models

set -e  # Exit on any error

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
CYAN='\\033[0;36m'
NC='\\033[0m' # No Color

echo -e "${GREEN}Starting Ollama Chatbot Setup for Linux...${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${BLUE}Installation started at: $(date)${NC}"
echo ""

# Detect Linux distribution
if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO=$ID
    VERSION=$VERSION_ID
    echo -e "${BLUE}Detected Linux distribution: $PRETTY_NAME${NC}"
else
    echo -e "${YELLOW}Cannot detect Linux distribution, proceeding with generic installation${NC}"
    DISTRO="unknown"
fi

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    echo -e "${YELLOW}Running as root - installation will proceed with system-wide changes${NC}"
    SUDO_CMD=""
else
    echo -e "${BLUE}Running as regular user - will use sudo when needed${NC}"
    SUDO_CMD="sudo"
    
    # Check if sudo is available
    if ! command -v sudo &> /dev/null; then
        echo -e "${RED}Error: sudo is not available and not running as root${NC}"
        echo -e "${RED}Please run as root or install sudo${NC}"
        exit 1
    fi
fi

# Check if Ollama is already installed
echo -e "${CYAN}Checking for existing Ollama installation...${NC}"
if command -v ollama &> /dev/null; then
    echo -e "${GREEN}Ollama is already installed at: $(which ollama)${NC}"
    VERSION=$(ollama --version 2>/dev/null || echo "unknown")
    echo -e "${GREEN}Version: $VERSION${NC}"
else
    echo -e "${CYAN}Installing Ollama...${NC}"
    
    # Install dependencies based on distribution
    case $DISTRO in
        ubuntu|debian)
            echo -e "${CYAN}Installing dependencies for Debian/Ubuntu...${NC}"
            $SUDO_CMD apt-get update
            $SUDO_CMD apt-get install -y curl wget
            ;;
        fedora|rhel|centos|rocky|almalinux)
            echo -e "${CYAN}Installing dependencies for RHEL/Fedora...${NC}"
            if command -v dnf &> /dev/null; then
                $SUDO_CMD dnf install -y curl wget
            else
                $SUDO_CMD yum install -y curl wget
            fi
            ;;
        arch|manjaro)
            echo -e "${CYAN}Installing dependencies for Arch Linux...${NC}"
            $SUDO_CMD pacman -S --noconfirm curl wget
            ;;
        opensuse*|sled|sles)
            echo -e "${CYAN}Installing dependencies for openSUSE...${NC}"
            $SUDO_CMD zypper install -y curl wget
            ;;
        *)
            echo -e "${YELLOW}Unknown distribution, assuming curl and wget are available${NC}"
            ;;
    esac
    
    # Use bundled Ollama installer
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    BUNDLED_INSTALLER="$SCRIPT_DIR/ollama-linux-amd64"
    
    if [ -f "$BUNDLED_INSTALLER" ]; then
        echo -e "${GREEN}Using bundled Ollama installer...${NC}"
        chmod +x "$BUNDLED_INSTALLER"
        sudo mv "$BUNDLED_INSTALLER" /usr/local/bin/ollama
    else
        echo -e "${YELLOW}Bundled installer not found, using official install script...${NC}"
        curl -fsSL https://ollama.com/install.sh | sh
    fi
    
    if command -v ollama &> /dev/null; then
        echo -e "${GREEN}Ollama installed successfully!${NC}"
    else
        echo -e "${RED}Ollama installation failed${NC}"
        exit 1
    fi
fi

# Kill any existing Ollama processes to prevent conflicts
echo -e "${CYAN}Stopping any existing Ollama processes...${NC}"
pkill -f ollama || true
sleep 2
echo -e "${GREEN}Cleared existing Ollama processes${NC}"

# Check if systemd is available for service management
if command -v systemctl &> /dev/null && [ -d /etc/systemd/system ]; then
    echo -e "${CYAN}Setting up Ollama as a systemd service...${NC}"
    
    # Create systemd service file if it doesn't exist
    if [ ! -f /etc/systemd/system/ollama.service ]; then
        $SUDO_CMD tee /etc/systemd/system/ollama.service > /dev/null << EOF
[Unit]
Description=Ollama Service
After=network-online.target

[Service]
ExecStart=/usr/local/bin/ollama serve
User=ollama
Group=ollama
Restart=always
RestartSec=3
Environment="PATH=$PATH"

[Install]
WantedBy=default.target
EOF
        
        # Create ollama user if it doesn't exist
        if ! id "ollama" &>/dev/null; then
            $SUDO_CMD useradd -r -s /bin/false -m -d /usr/share/ollama ollama
        fi
        
        $SUDO_CMD systemctl daemon-reload
        $SUDO_CMD systemctl enable ollama
    fi
    
    # Start the service
    echo -e "${CYAN}Starting Ollama service...${NC}"
    $SUDO_CMD systemctl start ollama
    sleep 5
    
    if $SUDO_CMD systemctl is-active --quiet ollama; then
        echo -e "${GREEN}Ollama service started successfully${NC}"
        SYSTEMD_AVAILABLE=true
    else
        echo -e "${YELLOW}Systemd service failed, starting manually...${NC}"
        nohup ollama serve > /dev/null 2>&1 &
        sleep 5
        SYSTEMD_AVAILABLE=false
    fi
else
    echo -e "${CYAN}Starting Ollama manually (systemd not available)...${NC}"
    nohup ollama serve > /dev/null 2>&1 &
    sleep 5
    SYSTEMD_AVAILABLE=false
fi

# Verify service is responsive
echo -e "${CYAN}Verifying Ollama service...${NC}"
ATTEMPTS=0
MAX_ATTEMPTS=15
SERVICE_READY=false

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${GREEN}Ollama service is responsive and ready!${NC}"
        SERVICE_READY=true
        break
    else
        ATTEMPTS=$((ATTEMPTS + 1))
        if [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; then
            echo -e "${YELLOW}Waiting for Ollama service to be ready... (attempt $ATTEMPTS/$MAX_ATTEMPTS)${NC}"
            sleep 3
        else
            echo -e "${YELLOW}Ollama service is taking longer than expected, but continuing...${NC}"
            break
        fi
    fi
done

if [ "$SERVICE_READY" = false ]; then
    echo -e "${YELLOW}WARNING: Ollama service may not be fully ready${NC}"
    echo -e "${YELLOW}Model downloads may take longer or fail${NC}"
fi

# Check if models are installed
echo -e "${CYAN}Checking for required models...${NC}"

MODELS_NEEDED=("gemma2:9b" "nomic-embed-text")
MODELS_TO_DOWNLOAD=()

for MODEL in "${MODELS_NEEDED[@]}"; do
    if ollama list 2>/dev/null | grep -q "$MODEL"; then
        echo -e "${GREEN}Model $MODEL is already installed${NC}"
    else
        echo -e "${YELLOW}Model $MODEL needs to be downloaded${NC}"
        MODELS_TO_DOWNLOAD+=("$MODEL")
    fi
done

# Download missing models
if [ ${#MODELS_TO_DOWNLOAD[@]} -gt 0 ]; then
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}DOWNLOADING MODELS${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo -e "${YELLOW}This will download ${#MODELS_TO_DOWNLOAD[@]} model(s):${NC}"
    for MODEL in "${MODELS_TO_DOWNLOAD[@]}"; do
        echo -e "${BLUE}  - $MODEL${NC}"
    done
    echo ""
    echo -e "${YELLOW}IMPORTANT: This may take 10-30 minutes depending on your internet speed.${NC}"
    echo -e "${YELLOW}Please be patient and do not close this terminal.${NC}"
    echo ""
    read -p "Press Enter to start downloading models..."
    
    MODEL_COUNT=0
    for MODEL in "${MODELS_TO_DOWNLOAD[@]}"; do
        MODEL_COUNT=$((MODEL_COUNT + 1))
        echo ""
        echo -e "${CYAN}[$MODEL_COUNT/${#MODELS_TO_DOWNLOAD[@]}] Downloading $MODEL...${NC}"
        echo -e "${YELLOW}This may take several minutes...${NC}"
        
        if ollama pull "$MODEL"; then
            echo -e "${GREEN}Successfully downloaded $MODEL!${NC}"
        else
            echo -e "${RED}Failed to download $MODEL${NC}"
        fi
    done
    
    echo ""
    echo -e "${GREEN}Model downloads completed!${NC}"
else
    echo -e "${GREEN}All required models are already installed${NC}"
fi

# Test the installation
echo -e "${CYAN}Testing installation...${NC}"
if ollama list > /dev/null 2>&1; then
    echo -e "${GREEN}Ollama is working correctly!${NC}"
    echo -e "${CYAN}Installed models:${NC}"
    ollama list
else
    echo -e "${RED}Installation test failed${NC}"
    echo -e "${YELLOW}Please check that Ollama is running and try again${NC}"
fi

echo ""
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Your local AI chatbot is now ready to use!${NC}"
echo -e "${CYAN}You can now use your chatbot application.${NC}"
echo ""
echo -e "${CYAN}Ollama API is available at: http://localhost:11434${NC}"
echo ""
echo -e "${BLUE}To manage Ollama service:${NC}"
if [ "$SYSTEMD_AVAILABLE" = true ]; then
    echo -e "${BLUE}  Start:  sudo systemctl start ollama${NC}"
    echo -e "${BLUE}  Stop:   sudo systemctl stop ollama${NC}"
    echo -e "${BLUE}  Status: sudo systemctl status ollama${NC}"
else
    echo -e "${BLUE}  Start:  ollama serve${NC}"
    echo -e "${BLUE}  Stop:   pkill ollama${NC}"
fi
echo ""
echo -e "${GREEN}Installation completed successfully!${NC}"
'''

    def handle_check_ollama(self):
        """Handle Ollama accessibility check requests."""
        try:
            # Check if Ollama is accessible
            try:
                with urllib.request.urlopen('http://localhost:11434/api/tags', timeout=5) as response:
                    if response.status == 200:
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.end_headers()
                        self.wfile.write(json.dumps({'accessible': True}).encode())
                        return
            except:
                pass
            
            # Check if we're in offline mode (no internet)
            if not check_internet_connection():
                # In offline mode, assume Ollama should be accessible if installed locally
                # This removes the setup button from the UI in offline scenarios
                print("Offline mode detected - assuming Ollama is accessible for UI purposes")
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'accessible': True, 'offline_mode': True}).encode())
                return
            
            # If we get here, we have internet but Ollama is not accessible
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'accessible': False}).encode())
            
        except Exception as e:
            print(f"Error checking Ollama: {e}")
            self.send_error(500, f"Internal server error: {e}")

    def create_windows_install_script(self):
        """Create the PowerShell installation script"""
        return '''# Ollama Chatbot One-Click Installation Script
# This script will automatically install Ollama and download required models

# Set error action preference to stop on errors
$ErrorActionPreference = "Stop"

# Set window title
$Host.UI.RawUI.WindowTitle = "Ollama Chatbot Setup"

Write-Host "Starting Ollama Chatbot Setup..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Installation started at: $(Get-Date)" -ForegroundColor Gray
Write-Host ""

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "This script needs to run as Administrator!" -ForegroundColor Yellow
    Write-Host "Right-click on this file and select 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Running as Administrator" -ForegroundColor Green

# Check if Ollama is already installed
Write-Host "Checking for existing Ollama installation..." -ForegroundColor Cyan
$ollamaPath = Get-Command ollama -ErrorAction SilentlyContinue

if ($ollamaPath) {
    Write-Host "Ollama is already installed at: $($ollamaPath.Source)" -ForegroundColor Green
    $version = & ollama --version 2>$null
    Write-Host "Version: $version" -ForegroundColor Green
} else {
    Write-Host "Downloading and installing Ollama..." -ForegroundColor Cyan
    
    # Use bundled Ollama installer
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $installerPath = "$scriptDir\\OllamaSetup.exe"
    
    if (Test-Path $installerPath) {
        Write-Host "Using bundled Ollama installer..." -ForegroundColor Green
    } else {
        Write-Host "Bundled installer not found, downloading..." -ForegroundColor Yellow
        $ollamaUrl = "https://ollama.com/download/OllamaSetup.exe"
        $installerPath = "$env:TEMP\\OllamaSetup.exe"
        try {
            Invoke-WebRequest -Uri $ollamaUrl -OutFile $installerPath -UseBasicParsing
            Write-Host "Downloaded successfully!" -ForegroundColor Green
        } catch {
            Write-Host "Download failed: $($_.Exception.Message)" -ForegroundColor Red
            Read-Host "Press Enter to exit"
            exit 1
        }
    }
    
    Write-Host ""
    Write-Host "IMPORTANT: Ollama installer will now open." -ForegroundColor Yellow
    Write-Host "Please follow the installation wizard and close any Ollama windows that open." -ForegroundColor Yellow
    Write-Host "After installation is complete, come back to this window and press Enter." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter when you are ready to start the Ollama installation"
    
    # Run installer and wait for completion
    Write-Host "Starting Ollama installation..." -ForegroundColor Cyan
    $installProcess = Start-Process -FilePath $installerPath -ArgumentList "/S" -PassThru
    $installProcess.WaitForExit()
    
    Write-Host "Ollama installation completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Please close any Ollama windows that may have opened automatically." -ForegroundColor Yellow
    Write-Host "We will now configure Ollama and download the required models." -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Press Enter to continue with model downloads"
    
    # Add Ollama to PATH if not already there
    $ollamaDir = "$env:LOCALAPPDATA\\Programs\\Ollama"
    if (Test-Path $ollamaDir) {
        $currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
        if ($currentPath -notlike "*$ollamaDir*") {
            [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$ollamaDir", "User")
            Write-Host "Added Ollama to PATH" -ForegroundColor Green
        }
    }
    
    # Refresh environment variables
    $env:PATH = [Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [Environment]::GetEnvironmentVariable("PATH", "User")
    
    # Clean up installer
    Remove-Item $installerPath -ErrorAction SilentlyContinue
}

# Kill any existing Ollama processes to prevent loops
Write-Host "Stopping any existing Ollama processes..." -ForegroundColor Cyan
try {
    Get-Process -Name "ollama*" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "Cleared existing Ollama processes" -ForegroundColor Green
} catch {
    # Ignore errors here
}

# Start Ollama service properly
Write-Host "Starting Ollama service..." -ForegroundColor Cyan
try {
    # Start Ollama serve in background
    $ollamaProcess = Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden -PassThru
    Start-Sleep -Seconds 5
    Write-Host "Ollama service started (PID: $($ollamaProcess.Id))" -ForegroundColor Green
    
    # Verify service is responsive
    Write-Host "Verifying Ollama service..." -ForegroundColor Cyan
    $attempts = 0
    $maxAttempts = 15
    $serviceReady = $false
    
    do {
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method GET -TimeoutSec 5
            Write-Host "Ollama service is responsive and ready!" -ForegroundColor Green
            $serviceReady = $true
            break
        } catch {
            $attempts++
            if ($attempts -lt $maxAttempts) {
                Write-Host "Waiting for Ollama service to be ready... (attempt $attempts/$maxAttempts)" -ForegroundColor Yellow
                Start-Sleep -Seconds 3
            } else {
                Write-Host "Ollama service is taking longer than expected, but continuing..." -ForegroundColor Yellow
                break
            }
        }
    } while ($attempts -lt $maxAttempts)
    
    if (-not $serviceReady) {
        Write-Host "WARNING: Ollama service may not be fully ready" -ForegroundColor Yellow
        Write-Host "Model downloads may take longer or fail" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "Error starting Ollama service" -ForegroundColor Yellow
    Write-Host "Attempting to continue with installation..." -ForegroundColor Yellow
}

# Check if models are installed
Write-Host "Checking for required models..." -ForegroundColor Cyan

$modelsNeeded = @("gemma2:9b", "nomic-embed-text")
$modelsToDownload = @()

foreach ($model in $modelsNeeded) {
    $modelList = & ollama list 2>$null
    if ($modelList -like "*$model*") {
        Write-Host "Model $model is already installed" -ForegroundColor Green
    } else {
        Write-Host "Model $model needs to be downloaded" -ForegroundColor Yellow
        $modelsToDownload += $model
    }
}

# Download missing models
if ($modelsToDownload.Count -gt 0) {
    Write-Host "" 
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "DOWNLOADING MODELS" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "This will download $($modelsToDownload.Count) model(s):" -ForegroundColor Yellow
    foreach ($model in $modelsToDownload) {
        Write-Host "  - $model" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "IMPORTANT: This may take 10-30 minutes depending on your internet speed." -ForegroundColor Yellow
    Write-Host "Please be patient and do not close this window." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to start downloading models"
    
    $modelCount = 0
    foreach ($model in $modelsToDownload) {
        $modelCount++
        Write-Host ""
        Write-Host "[$modelCount/$($modelsToDownload.Count)] Downloading $model..." -ForegroundColor Cyan
        Write-Host "This may take several minutes..." -ForegroundColor Yellow
        
        try {
            # Show progress by running ollama pull
            $pullProcess = Start-Process -FilePath "ollama" -ArgumentList "pull", $model -NoNewWindow -Wait -PassThru
            
            if ($pullProcess.ExitCode -eq 0) {
                Write-Host "Successfully downloaded $model!" -ForegroundColor Green
            } else {
                Write-Host "Failed to download $model (Exit Code: $($pullProcess.ExitCode))" -ForegroundColor Red
            }
        } catch {
            Write-Host "Failed to download $model" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Model downloads completed!" -ForegroundColor Green
    
} else {
    Write-Host "All required models are already installed" -ForegroundColor Green
}

# Test the installation
Write-Host "Testing installation..." -ForegroundColor Cyan
try {
    $response = & ollama list 2>$null
    if ($response) {
        Write-Host "Ollama is working correctly!" -ForegroundColor Green
        Write-Host "Installed models:" -ForegroundColor Cyan
        Write-Host $response -ForegroundColor Gray
    } else {
        throw "No response from ollama list"
    }
} catch {
    Write-Host "Installation test failed" -ForegroundColor Red
    Write-Host "Please check that Ollama is running and try again" -ForegroundColor Yellow
}

Write-Host "" 
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Your local AI chatbot is now ready to use!" -ForegroundColor Green
Write-Host "You can now use your chatbot application." -ForegroundColor Cyan
Write-Host ""
Write-Host "Ollama API is available at: http://localhost:11434" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Go back to your web browser" -ForegroundColor Gray
Write-Host "2. Your chatbot should now work locally!" -ForegroundColor Gray
Write-Host ""

# Final cleanup to prevent infinite loops
Write-Host ""
Write-Host "Performing final cleanup..." -ForegroundColor Cyan
try {
    # Kill any extra Ollama processes that might cause loops
    $ollamaProcesses = Get-Process -Name "ollama*" -ErrorAction SilentlyContinue
    if ($ollamaProcesses.Count -gt 1) {
        Write-Host "Found multiple Ollama processes, keeping only the main service..." -ForegroundColor Yellow
        $ollamaProcesses | Sort-Object StartTime | Select-Object -SkipLast 1 | Stop-Process -Force -ErrorAction SilentlyContinue
    }
} catch {
    # Ignore cleanup errors
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "INSTALLATION COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your local AI chatbot is now ready!" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: If you see any Ollama windows opening and closing repeatedly," -ForegroundColor Yellow
Write-Host "please restart your computer to fully complete the setup." -ForegroundColor Yellow
Write-Host ""
Write-Host "You can now:" -ForegroundColor Cyan
Write-Host "1. Go back to your web browser" -ForegroundColor Gray
Write-Host "2. Use your chatbot application" -ForegroundColor Gray
Write-Host "3. The chatbot will connect to Ollama automatically" -ForegroundColor Gray
Write-Host ""

# Keep the window open
Write-Host "Installation log complete." -ForegroundColor Green
Read-Host "Press Enter to close this window"

# Ensure we exit cleanly
exit 0
'''

    def create_readme_content(self, platform='windows'):
        """Create README content for the setup package"""
        if platform == 'windows':
            return '''🤖 Local AI Chatbot Setup for Windows
=====================================

This package contains everything you need to set up your local AI chatbot.

📋 What's Included:
- Automatic Ollama installation
- Gemma2:9b language model download
- Nomic-embed-text embedding model download
- One-click setup script

Quick Start:
1. Right-click on "INSTALL-CHATBOT.bat"
2. Select "Run as administrator"
3. Follow the prompts
4. That's it! Your chatbot will be ready to use.

⚠️  Important Notes:
- You MUST run the installer as administrator
- Make sure you have a stable internet connection
- The download may take 10-30 minutes depending on your connection speed
- The models are approximately 5.4GB in total

🔧 What the installer does:
- Downloads and installs Ollama if not already present
- Starts the Ollama service
- Downloads the required AI models:
  * gemma2:9b (main language model)
  * nomic-embed-text (for embeddings)
- Tests the installation

🌐 After Installation:
- Ollama API will be available at: http://localhost:11434
- Your chatbot application will be able to connect automatically

❓ Troubleshooting:
- If the batch file closes immediately after pressing a key:
  * The PowerShell script should open in a new window
  * Look for a new PowerShell window with the installation progress
  * If no new window appears, try running "INSTALL-CHATBOT.ps1" directly

- If the installation fails:
  * Try running the batch file as administrator
  * Make sure Windows Defender or antivirus isn't blocking the download
  * Check your internet connection
  * Restart your computer if PATH issues occur

- If PowerShell execution is blocked:
  * Open PowerShell as administrator
  * Run: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  * Then try running the installer again

📞 Support:
If you encounter any issues, please contact support or refer to the documentation.

Enjoy your local AI chatbot! 🎉
'''
        elif platform == 'macos':
            return '''🤖 Local AI Chatbot Setup for macOS
====================================

This package contains everything you need to set up your local AI chatbot on macOS.

📋 What's Included:
- Automatic Ollama installation (via Homebrew or direct download)
- Gemma2:9b language model download
- Nomic-embed-text embedding model download
- One-click setup script

Quick Start:
1. Double-click "install-chatbot.sh" or open Terminal
2. If using Terminal: ./install-chatbot.sh
3. Follow the prompts (may ask for password)
4. That's it! Your chatbot will be ready to use.

⚠️  Important Notes:
- The script may request your password for sudo operations
- Make sure you have a stable internet connection
- The download may take 10-30 minutes depending on your connection speed
- The models are approximately 5.4GB in total
- Homebrew installation is recommended but not required

🔧 What the installer does:
- Detects and uses Homebrew if available, otherwise downloads directly
- Downloads and installs Ollama if not already present
- Starts the Ollama service
- Downloads the required AI models:
  * gemma2:9b (main language model)
  * nomic-embed-text (for embeddings)
- Tests the installation

🌐 After Installation:
- Ollama API will be available at: http://localhost:11434
- Your chatbot application will be able to connect automatically

🍺 Homebrew Users:
- If you have Homebrew, the installer will use it automatically
- To install Homebrew: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

❓ Troubleshooting:
- If permission denied: chmod +x install-chatbot.sh
- If script won't run: Right-click → Open With → Terminal
- If Ollama installation fails: Try installing Homebrew first
- For Apple Silicon Macs: All components are compatible

📞 Support:
If you encounter any issues, please contact support or refer to the documentation.

Enjoy your local AI chatbot! 🎉
'''
        elif platform == 'linux':
            return '''🤖 Local AI Chatbot Setup for Linux
===================================

This package contains everything you need to set up your local AI chatbot on Linux.

📋 What's Included:
- Automatic Ollama installation with distribution detection
- Gemma2:9b language model download
- Nomic-embed-text embedding model download
- Systemd service setup (where available)
- One-click setup script

Quick Start:
1. Open Terminal in the extracted folder
2. Run: ./install-chatbot.sh
3. Follow the prompts (may ask for password)
4. That's it! Your chatbot will be ready to use.

⚠️  Important Notes:
- The script may request your password for sudo operations
- Make sure you have a stable internet connection
- The download may take 10-30 minutes depending on your connection speed
- The models are approximately 5.4GB in total
- Supports most major Linux distributions

🔧 What the installer does:
- Detects your Linux distribution automatically
- Installs dependencies (curl, wget) if needed
- Downloads and installs Ollama using the official installer
- Sets up systemd service (if available)
- Downloads the required AI models:
  * gemma2:9b (main language model)
  * nomic-embed-text (for embeddings)
- Tests the installation

🐧 Supported Distributions:
- Ubuntu/Debian (apt)
- Fedora/RHEL/CentOS/Rocky/AlmaLinux (dnf/yum)
- Arch Linux/Manjaro (pacman)
- openSUSE (zypper)
- Other distributions (generic installation)

🌐 After Installation:
- Ollama API will be available at: http://localhost:11434
- Systemd service will be configured (if available)
- Your chatbot application will be able to connect automatically

⚙️  Service Management:
- Start: sudo systemctl start ollama
- Stop: sudo systemctl stop ollama
- Status: sudo systemctl status ollama
- Manual start: ollama serve

❓ Troubleshooting:
- If permission denied: chmod +x install-chatbot.sh
- If sudo not available: Run as root user
- If systemd not available: Service will run manually
- For SELinux systems: May need to configure policies

📞 Support:
If you encounter any issues, please contact support or refer to the documentation.

Enjoy your local AI chatbot! 🎉
'''

    def create_batch_file(self):
        """Create batch file for easy execution"""
        return '''@echo off
title Ollama Chatbot Setup
color 0A

echo.
echo ========================================
echo     OLLAMA CHATBOT INSTALLER
echo ========================================
echo.
echo This will install Ollama and download required models for your AI chatbot.
echo.
echo IMPORTANT: This script needs administrator privileges to install software.
echo If you're not running as administrator, the script will prompt you.
echo.
echo What will happen:
echo - Download and install Ollama (if not already installed)
echo - Download Gemma2:9b model (~5.4GB)
echo - Download nomic-embed-text model (~274MB)
echo - Configure everything automatically
echo.
pause

echo.
echo Starting installation...
echo.

REM Check if we're running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [SUCCESS] Running as Administrator
    goto :run_install
) else (
    echo [INFO] Not running as Administrator, requesting elevation...
    goto :request_admin
)

:request_admin
REM Request administrator privileges and run the PowerShell script
powershell -Command "& {Start-Process PowerShell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"\"%~dp0INSTALL-CHATBOT.ps1\"\"' -Verb RunAs}"
if %errorLevel% == 0 (
    echo.
    echo [SUCCESS] Installation script launched with administrator privileges
    echo Check the new PowerShell window for installation progress.
    echo.
) else (
    echo.
    echo [ERROR] Failed to launch installation script with administrator privileges
    echo Please try running this batch file as administrator manually.
    echo.
)
goto :end

:run_install
REM We're already running as admin, run PowerShell script directly
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0INSTALL-CHATBOT.ps1"
if %errorLevel% == 0 (
    echo.
    echo [SUCCESS] Installation completed successfully!
) else (
    echo.
    echo [ERROR] Installation encountered an error (Exit Code: %errorLevel%)
    echo Please check the output above for details.
)

:end
echo.
echo Press any key to close this window...
pause >nul
'''

def main():
    PORT = 8000
    
    # Check if we're in the right directory
    if not Path('public').exists():
        print("Error: 'public' directory not found. Please run this script from the learnandtry-webapp directory.")
        return
    
    # Check if ollama is accessible
    try:
        with urllib.request.urlopen('http://localhost:11434/api/tags') as response:
            print("✓ Ollama is accessible")
    except:
        print("⚠ Warning: Ollama doesn't seem to be running on localhost:11434")
        print("  Make sure to start ollama before using the AI features")
    
    # Check if Qdrant is accessible
    if VECTOR_SEARCH_AVAILABLE:
        try:
            client = QdrantClient(
                url="https://0cc71459-a784-4e72-80ba-6e37fabd4109.us-east-1-1.aws.cloud.qdrant.io:6333",
                api_key="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.ZHhmETT2uLK_Ba_g_tuffEXORkGPY0FXzariD7GLeag"
            )
            collections = client.get_collections()
            print("✓ Qdrant is accessible")
        except:
            print("⚠ Warning: Could not connect to Qdrant Cloud")
            print("  Vector search features will be limited")
    
    with socketserver.TCPServer(("", PORT), ProxyHandler) as httpd:
        print(f"🚀 Server running at http://localhost:{PORT}")
        print(f"📁 Serving files from: {Path('public').resolve()}")
        if VECTOR_SEARCH_AVAILABLE:
            print("🔍 Vector search with Qdrant integration enabled")
        print("Press Ctrl+C to stop the server")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 Server stopped")

if __name__ == "__main__":
    main() 