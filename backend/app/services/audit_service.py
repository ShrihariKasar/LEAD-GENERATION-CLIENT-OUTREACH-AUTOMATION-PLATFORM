from typing import Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models import AuditLog

class AuditService:
    @staticmethod
    async def log_event(
        db: AsyncSession,
        workspace_id: str,
        action: str,
        actor_type: str,  # USER, AI, SYSTEM, INTEGRATION, WEBHOOK
        actor_id: Optional[str] = None,
        entity_type: str = "LEAD",
        entity_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """Create an immutable audit log entry."""
        log_entry = AuditLog(
            workspace_id=workspace_id,
            action=action,
            actor_type=actor_type,
            actor_id=actor_id,
            entity_type=entity_type,
            entity_id=entity_id,
            metadata_json=metadata or {},
            created_at=datetime.now(timezone.utc)
        )
        db.add(log_entry)
        await db.flush()
        return log_entry
