from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session
from .config import settings
from .models import User
pwd=CryptContext(schemes=['bcrypt'], deprecated='auto')
oauth2=OAuth2PasswordBearer(tokenUrl='/api/auth/token')
ROLE_RANK={'viewer':1,'editor':2,'project_manager':3,'approver':4,'admin':5}
def hash_password(v): return pwd.hash(v)
def verify_password(v,h): return pwd.verify(v,h)
def token_for(u):
    exp=datetime.now(timezone.utc)+timedelta(minutes=settings.access_token_minutes)
    return jwt.encode({'sub':u.id,'username':u.username,'role':u.role,'exp':exp},settings.jwt_secret,algorithm=settings.jwt_algorithm)
def current_user(token:str=Depends(oauth2),s:Session=Depends(lambda:None)):
    raise RuntimeError('Dependency override required')
def require_user(token:str=Depends(oauth2)):
    from .db import SessionLocal
    s=SessionLocal()
    try:
        try: p=jwt.decode(token,settings.jwt_secret,algorithms=[settings.jwt_algorithm]); uid=p['sub']
        except JWTError: raise HTTPException(401,'Invalid or expired token')
        u=s.get(User,uid)
        if not u or not u.active: raise HTTPException(401,'Inactive user')
        return u
    finally: s.close()
def require(*roles):
    def dep(u=Depends(require_user)):
        minimum=min(ROLE_RANK[r] for r in roles)
        if u.role not in roles and ROLE_RANK.get(u.role,0)<minimum: raise HTTPException(403,'Insufficient role')
        return u
    return dep
