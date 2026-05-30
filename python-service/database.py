"""
Database module for MongoDB connection using Motor (async driver).
Provides database instance and connection management.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from config import settings
import logging

logger = logging.getLogger(__name__)

# Global MongoDB client and database instances
mongodb_client: AsyncIOMotorClient = None
mongodb_database: AsyncIOMotorDatabase = None


async def connect_to_mongodb():
    """
    Establish connection to MongoDB.
    Called on application startup.
    """
    global mongodb_client, mongodb_database
    
    try:
        logger.info(f"Connecting to MongoDB at {settings.mongodb_url}")
        mongodb_client = AsyncIOMotorClient(settings.mongodb_url)
        mongodb_database = mongodb_client[settings.mongodb_db_name]
        
        # Test the connection
        await mongodb_client.admin.command('ping')
        logger.info(f"Successfully connected to MongoDB database: {settings.mongodb_db_name}")
        
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise


async def close_mongodb_connection():
    """
    Close MongoDB connection.
    Called on application shutdown.
    """
    global mongodb_client
    
    if mongodb_client:
        logger.info("Closing MongoDB connection")
        mongodb_client.close()
        logger.info("MongoDB connection closed")


def get_database() -> AsyncIOMotorDatabase:
    """
    Get the MongoDB database instance.
    
    Returns:
        AsyncIOMotorDatabase: The database instance
    """
    return mongodb_database
