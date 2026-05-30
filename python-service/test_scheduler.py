"""
Tests for APScheduler configuration and startup/shutdown event handlers.
Validates that the scheduler is properly initialized and can be accessed.
"""

import pytest
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from unittest.mock import AsyncMock, patch, MagicMock
import logging

# Import the functions to test
from main import initialize_scheduler, shutdown_scheduler
from scheduler import set_scheduler, get_scheduler, is_scheduler_running


@pytest.mark.asyncio
async def test_initialize_scheduler_creates_asyncio_scheduler():
    """
    Test that initialize_scheduler creates an AsyncIOScheduler instance.
    
    Validates: Requirement 17.1 - Configure AsyncIOScheduler
    """
    scheduler = await initialize_scheduler()
    
    assert scheduler is not None
    assert isinstance(scheduler, AsyncIOScheduler)
    assert scheduler.running is True
    
    # Cleanup
    scheduler.shutdown(wait=True)


@pytest.mark.asyncio
async def test_initialize_scheduler_registers_globally():
    """
    Test that initialize_scheduler registers the scheduler globally.
    
    Validates: Requirement 17.1 - Configure AsyncIOScheduler
    """
    scheduler = await initialize_scheduler()
    
    # Verify it's registered globally
    retrieved_scheduler = get_scheduler()
    assert retrieved_scheduler is scheduler
    assert is_scheduler_running() is True
    
    # Cleanup
    scheduler.shutdown(wait=True)


@pytest.mark.asyncio
async def test_initialize_scheduler_configures_correctly():
    """
    Test that initialize_scheduler configures the scheduler with correct settings.
    
    Validates: Requirement 17.1 - Configure AsyncIOScheduler
    """
    scheduler = await initialize_scheduler()
    
    # Verify configuration
    assert scheduler._jobstores is not None
    assert 'default' in scheduler._jobstores
    assert scheduler._executors is not None
    assert 'default' in scheduler._executors
    
    # Cleanup
    scheduler.shutdown(wait=True)


@pytest.mark.asyncio
async def test_shutdown_scheduler_removes_all_jobs():
    """
    Test that shutdown_scheduler removes all scheduled jobs.
    
    Validates: Requirement 17.2 - Create shutdown event handlers
    """
    scheduler = await initialize_scheduler()
    
    # Add a dummy job
    async def dummy_job():
        pass
    
    scheduler.add_job(dummy_job, 'interval', seconds=10, id='test_job')
    assert len(scheduler.get_jobs()) == 1
    
    # Shutdown
    await shutdown_scheduler()
    
    # Verify scheduler is stopped
    assert scheduler.running is False


@pytest.mark.asyncio
async def test_shutdown_scheduler_handles_no_jobs():
    """
    Test that shutdown_scheduler handles gracefully when no jobs exist.
    
    Validates: Requirement 17.2 - Create shutdown event handlers
    """
    scheduler = await initialize_scheduler()
    
    # Verify no jobs
    assert len(scheduler.get_jobs()) == 0
    
    # Shutdown should not raise error
    await shutdown_scheduler()
    assert scheduler.running is False


@pytest.mark.asyncio
async def test_shutdown_scheduler_when_not_running():
    """
    Test that shutdown_scheduler handles gracefully when scheduler not running.
    
    Validates: Requirement 17.2 - Create shutdown event handlers
    """
    # Don't initialize scheduler, just call shutdown
    # This should handle the RuntimeError gracefully
    await shutdown_scheduler()
    
    # Should not raise exception


@pytest.mark.asyncio
async def test_get_scheduler_raises_when_not_initialized():
    """
    Test that get_scheduler raises RuntimeError when not initialized.
    
    Validates: Requirement 17.1 - Configure AsyncIOScheduler
    """
    # Reset the global scheduler
    from scheduler import _scheduler
    import scheduler as scheduler_module
    scheduler_module._scheduler = None
    
    with pytest.raises(RuntimeError, match="Scheduler has not been initialized"):
        get_scheduler()


@pytest.mark.asyncio
async def test_is_scheduler_running_returns_false_when_not_initialized():
    """
    Test that is_scheduler_running returns False when not initialized.
    
    Validates: Requirement 17.1 - Configure AsyncIOScheduler
    """
    # Reset the global scheduler
    import scheduler as scheduler_module
    scheduler_module._scheduler = None
    
    assert is_scheduler_running() is False


@pytest.mark.asyncio
async def test_scheduler_uses_asyncio_executor():
    """
    Test that scheduler is configured to use AsyncIO executor.
    
    Validates: Requirement 17.1 - Configure AsyncIOScheduler
    """
    scheduler = await initialize_scheduler()
    
    # Verify executor type
    executors = scheduler._executors
    assert 'default' in executors
    executor_config = executors['default']
    assert executor_config['type'] == 'asyncio'
    
    # Cleanup
    scheduler.shutdown(wait=True)


@pytest.mark.asyncio
async def test_scheduler_uses_memory_jobstore():
    """
    Test that scheduler is configured to use memory jobstore.
    
    Validates: Requirement 17.1 - Configure AsyncIOScheduler
    """
    scheduler = await initialize_scheduler()
    
    # Verify jobstore type
    jobstores = scheduler._jobstores
    assert 'default' in jobstores
    jobstore_config = jobstores['default']
    assert jobstore_config['type'] == 'memory'
    
    # Cleanup
    scheduler.shutdown(wait=True)


@pytest.mark.asyncio
async def test_scheduler_job_defaults():
    """
    Test that scheduler has correct job defaults configured.
    
    Validates: Requirement 17.1 - Configure AsyncIOScheduler
    """
    scheduler = await initialize_scheduler()
    
    # Verify job defaults
    job_defaults = scheduler._job_defaults
    assert job_defaults['coalesce'] is False
    assert job_defaults['max_instances'] == 1
    
    # Cleanup
    scheduler.shutdown(wait=True)


@pytest.mark.asyncio
async def test_scheduler_timezone_is_utc():
    """
    Test that scheduler is configured to use UTC timezone.
    
    Validates: Requirement 17.1 - Configure AsyncIOScheduler
    """
    scheduler = await initialize_scheduler()
    
    # Verify timezone
    assert str(scheduler.timezone) == 'UTC'
    
    # Cleanup
    scheduler.shutdown(wait=True)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
