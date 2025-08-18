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
                ProxyHandler._qdrant_client = QdrantClient(url="http://localhost:6333")
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
        """
        try:
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
                "stream": False
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
            client = QdrantClient(url="http://localhost:6333")
            collections = client.get_collections()
            print("✓ Qdrant is accessible")
        except:
            print("⚠ Warning: Qdrant doesn't seem to be running on localhost:6333")
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