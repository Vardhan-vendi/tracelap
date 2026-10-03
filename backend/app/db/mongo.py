"""
MongoDB Atlas integration and collection management for TRACELAP.
Provides cloud-persistent storage for feedback and product analytics events.
"""
import logging
from typing import Optional, Any
from backend.app.config import settings

logger = logging.getLogger(__name__)

_mongo_client = None
_mongo_db = None
_is_attempted = False

def get_mongo_client():
    global _mongo_client, _is_attempted
    uri = settings.mongodb_uri.strip()
    if not uri:
        return None
    
    if _mongo_client is not None:
        return _mongo_client
    
    if _is_attempted:
        return None
        
    _is_attempted = True
    try:
        import pymongo
        logger.info("Connecting to MongoDB Atlas at %s...", uri.split("@")[-1] if "@" in uri else "configured URI")
        client = pymongo.MongoClient(
            uri,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=10000,
        )
        # Test connection with ping
        client.admin.command("ping")
        _mongo_client = client
        logger.info("Successfully connected to MongoDB Atlas!")
        return _mongo_client
    except Exception as e:
        logger.warning("MongoDB Atlas connection unavailable or failed: %s. Using SQLite fallback.", e)
        _mongo_client = None
        return None

def get_mongo_db():
    global _mongo_db
    if _mongo_db is not None:
        return _mongo_db
    
    client = get_mongo_client()
    if client is None:
        return None
    
    try:
        db_name = settings.mongodb_db_name.strip() or "tracelap"
        db = client[db_name]
        _init_mongo_indexes(db)
        _mongo_db = db
        return _mongo_db
    except Exception as e:
        logger.error("Failed to initialize MongoDB database %s: %s", settings.mongodb_db_name, e)
        return None

def is_mongo_active() -> bool:
    """Returns True if a live MongoDB Atlas connection is established and active."""
    return get_mongo_db() is not None

def _init_mongo_indexes(db: Any) -> None:
    """Ensures optimized indexes for analytics and feedback in MongoDB."""
    try:
        import pymongo
        # Feedbacks indexes
        db.feedbacks.create_index([("created_at", pymongo.DESCENDING)])
        db.feedbacks.create_index([("type", pymongo.ASCENDING)])
        db.feedbacks.create_index([("rating", pymongo.ASCENDING)])
        db.feedbacks.create_index([("display_permission", pymongo.ASCENDING)])
        
        # Analytics indexes
        db.analytics_events.create_index([("created_at", pymongo.DESCENDING)])
        db.analytics_events.create_index([("event_type", pymongo.ASCENDING)])
        db.analytics_events.create_index([("session_id", pymongo.ASCENDING)])
        db.analytics_events.create_index([("feature", pymongo.ASCENDING)])
    except Exception as e:
        logger.warning("Failed to create MongoDB indexes: %s", e)
