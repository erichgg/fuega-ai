"""Async message bus for inter-agent communication."""
import asyncio
import fnmatch
from typing import Callable, Any
from collections import defaultdict
import structlog

logger = structlog.get_logger()


class MessageBus:
    """Simple pub/sub message bus with wildcard pattern support.

    Subscribe with exact event names or glob patterns:
    - "workflow.started" matches only that exact event
    - "workflow.*" matches "workflow.started", "workflow.completed", etc.
    - "*" matches everything
    """

    MAX_HISTORY = 1000

    def __init__(self):
        self._subscribers: dict[str, list[Callable]] = defaultdict(list)
        self._history: list[dict] = []

    def subscribe(self, pattern: str, handler: Callable):
        self._subscribers[pattern].append(handler)
        logger.debug("bus_subscribe", pattern=pattern, handler=handler.__name__)

    async def publish(self, event: str, data: Any = None, source: str = "system"):
        message = {"event": event, "data": data, "source": source}
        self._history.append(message)
        if len(self._history) > self.MAX_HISTORY:
            self._history = self._history[-self.MAX_HISTORY:]

        logger.info("bus_publish", bus_event=event, source=source)

        tasks = []
        for pattern, handlers in self._subscribers.items():
            if fnmatch.fnmatch(event, pattern):
                for handler in handlers:
                    if asyncio.iscoroutinefunction(handler):
                        tasks.append(handler(message))
                    else:
                        handler(message)

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    def get_history(self, limit: int = 50) -> list[dict]:
        return self._history[-limit:]


message_bus = MessageBus()
