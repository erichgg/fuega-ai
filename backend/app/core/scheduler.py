"""APScheduler-based workflow scheduler."""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from backend.app.config import load_yaml_config
from backend.app.database.engine import AsyncSessionLocal
from backend.app.core.workflow_engine import workflow_engine
import structlog

logger = structlog.get_logger()


class WorkflowScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self._setup_workflows()
        self._setup_followup_job()

    def _setup_workflows(self):
        config = load_yaml_config("workflows")
        if not config or "workflows" not in config:
            return

        for name, wf in config["workflows"].items():
            if not wf.get("enabled") or not wf.get("schedule"):
                continue

            parts = wf["schedule"].split()
            if len(parts) == 5:
                trigger = CronTrigger(
                    minute=parts[0],
                    hour=parts[1],
                    day=parts[2],
                    month=parts[3],
                    day_of_week=parts[4],
                    timezone=wf.get("timezone", "America/Mexico_City"),
                )
                self.scheduler.add_job(
                    self._run_workflow,
                    trigger=trigger,
                    args=[name],
                    id=f"workflow_{name}",
                    replace_existing=True,
                )
                logger.info("scheduler_registered", workflow=name, schedule=wf["schedule"])

    def _setup_followup_job(self):
        """Register the daily follow-up check job at 10am Mexico City time."""
        trigger = CronTrigger(
            hour=10,
            minute=0,
            timezone="America/Mexico_City",
        )
        self.scheduler.add_job(
            self._run_daily_followups,
            trigger=trigger,
            id="daily_followups",
            replace_existing=True,
        )
        logger.info("scheduler_registered", job="daily_followups", schedule="0 10 * * *")

    async def _run_daily_followups(self):
        """Execute the daily follow-up check."""
        from backend.app.core.followup import run_daily_followups
        async with AsyncSessionLocal() as db:
            try:
                result = await run_daily_followups(db)
                logger.info("daily_followups_ran", sent=result["sent"], errors=result["errors"])
            except Exception as e:
                logger.error("daily_followups_failed", error=str(e))

    async def _run_workflow(self, workflow_name: str):
        async with AsyncSessionLocal() as db:
            try:
                await workflow_engine.start_workflow(workflow_name, db, trigger="scheduled")
            except Exception as e:
                logger.error("scheduled_workflow_failed", workflow=workflow_name, error=str(e))

    def start(self):
        self.scheduler.start()
        logger.info("scheduler_started")

    def shutdown(self):
        self.scheduler.shutdown()
