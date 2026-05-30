"""
Scheduler management module for background tasks.
Provides utilities to access and manage the APScheduler instance.
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
import logging

logger = logging.getLogger(__name__)

# Global scheduler instance
_scheduler: AsyncIOScheduler = None


def set_scheduler(scheduler: AsyncIOScheduler) -> None:
    """
    Set the global scheduler instance.
    
    Args:
        scheduler: The AsyncIOScheduler instance to set globally
    """
    global _scheduler
    _scheduler = scheduler
    logger.debug("Global scheduler instance set")


def get_scheduler() -> AsyncIOScheduler:
    """
    Get the global scheduler instance.
    
    Returns:
        AsyncIOScheduler: The global scheduler instance
        
    Raises:
        RuntimeError: If scheduler has not been initialized
    """
    if _scheduler is None:
        raise RuntimeError("Scheduler has not been initialized. Call set_scheduler() first.")
    return _scheduler


def is_scheduler_running() -> bool:
    """
    Check if the scheduler is currently running.
    
    Returns:
        bool: True if scheduler is running, False otherwise
    """
    if _scheduler is None:
        return False
    return _scheduler.running
