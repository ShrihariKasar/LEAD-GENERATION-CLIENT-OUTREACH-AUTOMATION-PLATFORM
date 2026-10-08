from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from backend.app.models import Lead, Company, Conversation, Meeting

class SearchService:
    @staticmethod
    async def global_search(db: AsyncSession, workspace_id: str, query: str, limit: int = 10) -> Dict[str, List[Dict[str, Any]]]:
        if not query or len(query.strip()) < 2:
            return {"leads": [], "companies": [], "conversations": [], "meetings": []}
            
        term = f"%{query.strip()}%"
        
        # Search leads
        lead_stmt = select(Lead).where(
            Lead.workspace_id == workspace_id,
            or_(
                Lead.full_name.ilike(term),
                Lead.first_name.ilike(term),
                Lead.last_name.ilike(term),
                Lead.email.ilike(term),
                Lead.company_name.ilike(term),
                Lead.job_title.ilike(term)
            )
        ).limit(limit)
        leads = (await db.execute(lead_stmt)).scalars().all()
        
        # Search companies
        comp_stmt = select(Company).where(
            Company.workspace_id == workspace_id,
            or_(
                Company.name.ilike(term),
                Company.domain.ilike(term),
                Company.industry.ilike(term)
            )
        ).limit(limit)
        companies = (await db.execute(comp_stmt)).scalars().all()
        
        # Search meetings
        meet_stmt = select(Meeting, Lead).join(Lead, Meeting.lead_id == Lead.id).where(
            Meeting.workspace_id == workspace_id,
            or_(
                Meeting.title.ilike(term),
                Lead.full_name.ilike(term),
                Lead.email.ilike(term)
            )
        ).limit(limit)
        meetings = (await db.execute(meet_stmt)).all()
        
        return {
            "leads": [
                {
                    "id": l.id,
                    "name": l.full_name or f"{l.first_name or ''} {l.last_name or ''}".strip(),
                    "email": l.email,
                    "title": l.job_title,
                    "company": l.company_name,
                    "score": l.icp_score,
                    "status": l.lead_status
                }
                for l in leads
            ],
            "companies": [
                {
                    "id": c.id,
                    "name": c.name,
                    "domain": c.domain,
                    "industry": c.industry,
                    "stage": c.stage
                }
                for c in companies
            ],
            "meetings": [
                {
                    "id": m.id,
                    "title": m.title,
                    "start_at": m.start_at,
                    "lead_name": l.full_name or l.email,
                    "status": m.status
                }
                for m, l in meetings
            ]
        }
