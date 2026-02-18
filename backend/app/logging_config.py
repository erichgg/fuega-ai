"""Structured logging configuration."""
import os
import structlog
import logging


def setup_logging(log_level: str = "INFO"):
    """Configure structured logging for the application."""
    is_dev = os.getenv("ENVIRONMENT", "development") == "development"
    renderer = structlog.dev.ConsoleRenderer() if is_dev else structlog.processors.JSONRenderer()
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.dev.set_exc_info,
            structlog.processors.TimeStamper(fmt="iso"),
            renderer,
        ],
        wrapper_class=structlog.make_filtering_bound_logger(getattr(logging, log_level, logging.INFO)),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
