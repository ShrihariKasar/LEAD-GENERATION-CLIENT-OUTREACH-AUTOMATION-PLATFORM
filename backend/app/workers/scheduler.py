import asyncio
import logging
from sqlalchemy import select
from backend.app.database import AsyncSessionLocal
from backend.app.models import Workspace
from backend.app.services.sequence_service import SequenceService

logger = logging.getLogger("threadline.scheduler")

class BackgroundScheduler:
    def __init__(self, interval_seconds: int = 60):
        self.interval_seconds = interval_seconds
        self.is_running = False
        self._task: asyncio.Task = None

    async def _run_loop(self):
        logger.info("Background outreach scheduler started.")
        while self.is_running:
            try:
                async with AsyncSessionLocal() as session:
                    # Get active workspaces
                    ws_stmt = select(Workspace.id)
                    workspaces = (await session.execute(ws_stmt)).scalars().all()
                    
                    for ws_id in workspaces:
                        try:
                            processed = await SequenceService.execute_pending_steps(session, ws_id)
                            if processed > 0:
                                logger.info(f"Workspace {ws_id}: executed {processed} outreach steps.")
                        except Exception as err:
                            logger.error(f"Error processing sequences for workspace {ws_id}: {err}")
            except Exception as e:
                logger.error(f"Scheduler loop error: {e}")
                
            await asyncio.sleep(self.interval_seconds)

    def start(self):
        if not self.is_running:
            self.is_running = True
            self._task = asyncio.create_task(self._run_loop())

    def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()

scheduler = BackgroundScheduler(interval_seconds=60)
