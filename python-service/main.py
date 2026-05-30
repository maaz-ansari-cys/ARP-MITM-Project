"""
Main FastAPI application for Network Visibility Dashboard.
Handles network operations including ARP scanning and MITM attacks.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from config import settings
from database import connect_to_mongodb, close_mongodb_connection
from scheduler import set_scheduler, get_scheduler, is_scheduler_running

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def initialize_scheduler():
    """
    Initialize and start the APScheduler AsyncIOScheduler.
    
    This function:
    1. Creates an AsyncIOScheduler instance
    2. Configures it to use the current event loop
    3. Starts the scheduler
    4. Registers it globally via set_scheduler()
    
    Returns:
        AsyncIOScheduler: The initialized scheduler instance
    """
    try:
        logger.info("Initializing APScheduler AsyncIOScheduler")
        
        # Create AsyncIOScheduler instance
        scheduler = AsyncIOScheduler()
        
        # Configure scheduler to use the current event loop
        scheduler.configure(
            jobstores={
                'default': {
                    'type': 'memory'
                }
            },
            executors={
                'default': {
                    'type': 'asyncio'
                }
            },
            job_defaults={
                'coalesce': False,
                'max_instances': 1
            },
            timezone='UTC'
        )
        
        # Start the scheduler
        scheduler.start()
        logger.info("APScheduler AsyncIOScheduler started successfully")
        
        # Register globally
        set_scheduler(scheduler)
        logger.info("Scheduler registered globally")
        
        return scheduler
        
    except Exception as e:
        logger.error(f"Failed to initialize scheduler: {e}")
        raise


async def shutdown_scheduler():
    """
    Gracefully shutdown the APScheduler scheduler.
    
    This function:
    1. Checks if scheduler is running
    2. Removes all scheduled jobs
    3. Shuts down the scheduler
    4. Logs the shutdown process
    """
    try:
        if not is_scheduler_running():
            logger.warning("Scheduler is not running, skipping shutdown")
            return
        
        scheduler = get_scheduler()
        logger.info("Shutting down APScheduler")
        
        # Get all scheduled jobs
        jobs = scheduler.get_jobs()
        logger.info(f"Found {len(jobs)} scheduled jobs")
        
        # Remove all jobs
        for job in jobs:
            logger.info(f"Removing job: {job.id}")
            job.remove()
        
        # Shutdown the scheduler
        scheduler.shutdown(wait=True)
        logger.info("APScheduler shutdown complete")
        
    except RuntimeError as e:
        logger.warning(f"Scheduler not initialized: {e}")
    except Exception as e:
        logger.error(f"Error during scheduler shutdown: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    Handles database connections and background tasks.
    
    Startup:
    1. Connects to MongoDB
    2. Initializes APScheduler
    3. Logs successful startup
    
    Shutdown:
    1. Stops all background tasks via scheduler
    2. Closes database connection
    3. Logs successful shutdown
    """
    # Startup
    logger.info("Starting Network Visibility Dashboard Python Service")
    
    try:
        # Connect to MongoDB
        await connect_to_mongodb()
        logger.info("Database connection established")
        
        # Initialize background task scheduler
        await initialize_scheduler()
        logger.info("Background task scheduler initialized")
        
        logger.info("Application startup complete")
        
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down Network Visibility Dashboard Python Service")
    
    try:
        # Stop background tasks
        await shutdown_scheduler()
        logger.info("Background tasks stopped")
        
        # Close database connection
        await close_mongodb_connection()
        logger.info("Application shutdown complete")
        
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")


# Create FastAPI application
app = FastAPI(
    title="Network Visibility Dashboard API",
    description="Python microservice for network operations using Scapy",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS to allow Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """
    Root endpoint for health check.
    
    Returns:
        dict: Service status and information
    """
    return {
        "service": "Network Visibility Dashboard Python Service",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    
    Returns:
        dict: Health status
    """
    return {
        "status": "healthy",
        "database": "connected"
    }


from routers import network_router
app.include_router(network_router, prefix="/network", tags=["network"])


if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"Starting server on {settings.host}:{settings.port}")
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        log_level="info"
    )
