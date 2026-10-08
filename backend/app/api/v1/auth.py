from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.database import get_db
from backend.app.models import User, Workspace, WorkspaceMember
from backend.app.schemas import UserRegister, UserLogin, Token, UserResponse, WorkspaceResponse
from backend.app.core.security import get_password_hash, verify_password, create_access_token
from backend.app.auth.dependencies import get_current_user
from backend.app.services.audit_service import AuditService

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    # Check email uniqueness
    stmt = select(User).where(User.email == payload.email)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )
        
    user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        is_active=True
    )
    db.add(user)
    await db.flush()
    
    # Create initial workspace
    workspace_name = payload.workspace_name or f"{payload.full_name.split()[0]}'s Workspace"
    slug = payload.email.split("@")[0].lower().replace(".", "-") + "-ws"
    
    # Ensure unique slug
    s_stmt = select(Workspace).where(Workspace.slug == slug)
    if (await db.execute(s_stmt)).scalar_one_or_none():
        slug = f"{slug}-{user.id[:6]}"
        
    workspace = Workspace(
        name=workspace_name,
        slug=slug,
        company_name=workspace_name
    )
    db.add(workspace)
    await db.flush()
    
    # Add user as OWNER
    member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=user.id,
        role="OWNER"
    )
    db.add(member)
    
    await AuditService.log_event(
        db=db,
        workspace_id=workspace.id,
        action="user_registered",
        actor_type="USER",
        actor_id=user.id,
        entity_type="USER",
        entity_id=user.id
    )
    
    await db.commit()
    await db.refresh(user)
    await db.refresh(workspace)
    
    access_token = create_access_token({
        "sub": user.id,
        "workspace_id": workspace.id,
        "role": "OWNER"
    })
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 60 * 24 * 7 * 60,
        "user": user,
        "workspace": workspace
    }

@router.post("/login", response_model=Token)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == payload.email)
    user = (await db.execute(stmt)).scalar_one_or_none()
    
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive."
        )
        
    # Get primary workspace
    m_stmt = select(WorkspaceMember, Workspace).join(Workspace, WorkspaceMember.workspace_id == Workspace.id).where(
        WorkspaceMember.user_id == user.id
    ).order_by(WorkspaceMember.created_at.asc())
    
    res = (await db.execute(m_stmt)).first()
    workspace = None
    role = "SALES_REP"
    if res:
        member, workspace = res
        role = member.role
        
    access_token = create_access_token({
        "sub": user.id,
        "workspace_id": workspace.id if workspace else None,
        "role": role
    })
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 60 * 24 * 7 * 60,
        "user": user,
        "workspace": workspace
    }

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
