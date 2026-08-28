import io, json, os, smtplib, uuid, logging, sys
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Any, Optional
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session
from openpyxl import load_workbook, Workbook
from apscheduler.schedulers.background import BackgroundScheduler
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi_cache import FastAPICache, Coder
from fastapi_cache.backends.inmemory import InMemoryBackend
from fastapi_cache.decorator import cache
from .config import settings
from .db import db, SessionLocal
from .models import Base, User, Record, AuditLog, Approval, ReportSchedule, ReportRun, Notification
from .security import pwd, hash_password, verify_password, token_for, require_user, require, ROLE_RANK
from .security import oauth2
from jose import JWTError, jwt

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)
app=FastAPI(
    title='MInT AICS PMO Control API',
    version='4.0.0',
    description='Production-oriented PMO API for the MInT/AICS 3-Year Project Control System. Provides comprehensive project management capabilities including task tracking, risk management, budget control, EVM analysis, and approval workflows.',
    docs_url='/docs',
    redoc_url='/redoc',
    openapi_tags=[
        {
            'name': 'Authentication',
            'description': 'User authentication and token management endpoints'
        },
        {
            'name': 'Users',
            'description': 'User management and role-based access control'
        },
        {
            'name': 'Records',
            'description': 'CRUD operations for project data records'
        },
        {
            'name': 'Approvals',
            'description': 'Approval workflow and decision management'
        },
        {
            'name': 'Audit',
            'description': 'Audit log and compliance tracking'
        },
        {
            'name': 'Reports',
            'description': 'Report generation and scheduling'
        },
        {
            'name': 'System',
            'description': 'Health checks and system information'
        }
    ]
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(CORSMiddleware,allow_origins=[x.strip() for x in settings.cors_origins.split(',') if x.strip()],allow_credentials=True,allow_methods=['GET','POST','PUT','PATCH','DELETE'],allow_headers=['Authorization','Content-Type'])

@app.on_event("startup")
async def startup_event():
    FastAPICache.init(InMemoryBackend(), prefix="pmo-cache")
    logger.info("Starting MInT AICS PMO Control API v4.0.0")
    logger.info(f"CORS origins: {settings.cors_origins}")
    logger.info(f"Database configured: {settings.database_url.split('@')[1] if '@' in settings.database_url else 'unknown'}")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down MInT AICS PMO Control API")

def json_safe(v): return v.isoformat() if isinstance(v,datetime) else v
def audit(s,u,action,etype,eid,before=None,after=None,ip=None): s.add(AuditLog(user_id=u.id,action=action,entity_type=etype,entity_id=eid,before_data=before,after_data=after,ip_address=ip))
def notify(s,user_id,title,message,typ='info'): s.add(Notification(user_id=user_id,title=title,message=message,type=typ))

def seed_admin():
    s=SessionLocal()
    try:
        if not s.scalar(select(User).where(User.username==settings.admin_username)):
            s.add(User(username=settings.admin_username,full_name='System Administrator',password_hash=hash_password(settings.admin_password),role='admin'))
            s.commit()
    finally: s.close()
# Alembic creates the schema before the application starts.
seed_admin()

class UserCreate(BaseModel): username:str; full_name:str; password:str=Field(min_length=8); role:str='viewer'
class UserUpdate(BaseModel): full_name:Optional[str]=None; role:Optional[str]=None; active:Optional[bool]=None
class PasswordChange(BaseModel): current_password:str; new_password:str=Field(min_length=8)
class RecordIn(BaseModel): external_id:Optional[str]=None; data:dict[str,Any]=Field(default_factory=dict); status:str='draft'
class ApprovalIn(BaseModel): approver_role:str='approver'; comment:Optional[str]=None
class DecisionIn(BaseModel): status:str; comment:Optional[str]=None
class ScheduleIn(BaseModel): name:str; frequency:str='weekly'; recipients:list[EmailStr]=[]; report_type:str='status'; active:bool=True

@app.get('/api/health', tags=['System'])
def health(s:Session=Depends(db)):
    try: count=s.scalar(select(func.count(User.id))); return {'status':'ok','database':'connected','users':count,'time':datetime.now(timezone.utc)}
    except Exception as e: 
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(503,'Database unavailable')

@app.post('/api/auth/token', tags=['Authentication'])
@limiter.limit("5/minute")
def login(form:OAuth2PasswordRequestForm=Depends(),s:Session=Depends(db),request: Request = None):
    u=s.scalar(select(User).where(User.username==form.username))
    if not u: 
        logger.warning(f"Failed login attempt for username: {form.username}")
        raise HTTPException(401,'Invalid credentials')
    if not u.active:
        logger.warning(f"Login attempt for inactive user: {form.username}")
        raise HTTPException(401,'Account is inactive')
    if not verify_password(form.password,u.password_hash):
        logger.warning(f"Failed password verification for user: {form.username}")
        raise HTTPException(401,'Invalid credentials')
    u.last_login=datetime.now(timezone.utc);s.commit()
    logger.info(f"Successful login for user: {form.username}")
    return {'access_token':token_for(u),'token_type':'bearer','user':{'id':u.id,'username':u.username,'full_name':u.full_name,'role':u.role}}
@app.get('/api/auth/me', tags=['Authentication'])
def me(u=Depends(require_user)): return {'id':u.id,'username':u.username,'full_name':u.full_name,'role':u.role,'active':u.active,'last_login':u.last_login}
@app.post('/api/auth/change-password', tags=['Authentication'])
@limiter.limit("3/hour")
def change_password(body:PasswordChange,u=Depends(require_user),s:Session=Depends(db),request: Request = None):
    if not verify_password(body.current_password,u.password_hash): 
        logger.warning(f"Failed password change attempt for user: {u.username}")
        raise HTTPException(400,'Current password is incorrect')
    u.password_hash=hash_password(body.new_password);audit(s,u,'PASSWORD_CHANGE','user',u.id);s.commit()
    logger.info(f"Password changed successfully for user: {u.username}")
    return {'status':'changed'}

@app.post('/api/users', tags=['Users'])
@limiter.limit("10/minute")
def create_user(body:UserCreate,u=Depends(require('admin')),s:Session=Depends(db),request: Request = None):
    if body.role not in ROLE_RANK: 
        logger.warning(f"Invalid role attempted: {body.role}")
        raise HTTPException(400,'Invalid role')
    if s.scalar(select(User).where(User.username==body.username)): 
        logger.warning(f"Username already exists: {body.username}")
        raise HTTPException(409,'Username already exists')
    x=User(username=body.username,full_name=body.full_name,password_hash=hash_password(body.password),role=body.role);s.add(x);s.flush();audit(s,u,'CREATE','user',x.id,None,{'username':x.username,'role':x.role});s.commit()
    logger.info(f"User created: {body.username}")
    return {'id':x.id,'username':x.username,'role':x.role}
@app.get('/api/users', tags=['Users'])
def users(u=Depends(require('admin')),s:Session=Depends(db)):
    return [{'id':x.id,'username':x.username,'full_name':x.full_name,'role':x.role,'active':x.active,'last_login':x.last_login,'created_at':x.created_at} for x in s.scalars(select(User).order_by(User.username)).all()]
@app.patch('/api/users/{user_id}', tags=['Users'])
def update_user(user_id:str,body:UserUpdate,u=Depends(require('admin')),s:Session=Depends(db)):
    x=s.get(User,user_id)
    if not x: 
        logger.warning(f"User not found for update: {user_id}")
        raise HTTPException(404,'User not found')
    before={'full_name':x.full_name,'role':x.role,'active':x.active}
    if body.role is not None:
        if body.role not in ROLE_RANK: 
            logger.warning(f"Invalid role attempted for user update: {body.role}")
            raise HTTPException(400,'Invalid role')
        x.role=body.role
    if body.full_name is not None:x.full_name=body.full_name
    if body.active is not None:
        if x.id==u.id and not body.active: 
            logger.warning(f"Self-deactivation attempt by user: {u.username}")
            raise HTTPException(400,'You cannot deactivate yourself')
        x.active=body.active
    audit(s,u,'UPDATE','user',x.id,before,{'full_name':x.full_name,'role':x.role,'active':x.active});s.commit()
    logger.info(f"User updated: {x.username}")
    return {'status':'updated'}

@app.get('/api/modules', tags=['Records'])
@cache(expire=60)
async def modules(u=Depends(require_user),s:Session=Depends(db)):
    return [{'module':m,'count':c} for m,c in s.execute(select(Record.module,func.count(Record.id)).group_by(Record.module).order_by(Record.module)).all()]
@app.get('/api/records/{module}', tags=['Records'])
def list_records(module:str,limit:int=Query(500,le=2000),offset:int=0,status:Optional[str]=None,q:Optional[str]=None,u=Depends(require_user),s:Session=Depends(db)):
    query=select(Record).where(Record.module==module)
    if status:query=query.where(Record.status==status)
    if q:query=query.where(Record.data.cast(str).ilike(f'%{q}%'))
    rs=s.scalars(query.order_by(Record.updated_at.desc()).offset(offset).limit(limit)).all()
    return [{'id':r.id,'external_id':r.external_id,'data':r.data,'status':r.status,'version':r.version,'updated_at':r.updated_at} for r in rs]
@app.post('/api/records/{module}', tags=['Records'])
def create_record(module:str,body:RecordIn,u=Depends(require('editor','project_manager','approver','admin')),s:Session=Depends(db)):
    r=Record(module=module,external_id=body.external_id,data=body.data,status=body.status,created_by=u.id);s.add(r);s.flush();audit(s,u,'CREATE','record',r.id,None,body.data);s.commit()
    logger.info(f"Record created in module {module} by user {u.username}")
    return {'id':r.id,'version':r.version,'data':r.data,'status':r.status}
@app.put('/api/records/{module}/{record_id}', tags=['Records'])
def update_record(module:str,record_id:str,body:RecordIn,u=Depends(require('editor','project_manager','approver','admin')),s:Session=Depends(db)):
    r=s.get(Record,record_id)
    if not r or r.module!=module: 
        logger.warning(f"Record not found for update: {record_id} in module {module}")
        raise HTTPException(404,'Record not found')
    if r.status=='approved' and u.role not in ('approver','admin'): 
        logger.warning(f"Unauthorized attempt to update approved record {record_id} by user {u.username}")
        raise HTTPException(409,'Approved records require approver/admin')
    before=r.data;r.data=body.data;r.external_id=body.external_id;r.status=body.status;r.version+=1;audit(s,u,'UPDATE','record',r.id,before,body.data);s.commit()
    logger.info(f"Record updated: {record_id} in module {module} by user {u.username}")
    return {'id':r.id,'version':r.version,'data':r.data,'status':r.status}
@app.delete('/api/records/{module}/{record_id}', tags=['Records'])
def delete_record(module:str,record_id:str,u=Depends(require('project_manager','admin')),s:Session=Depends(db)):
    r=s.get(Record,record_id)
    if not r or r.module!=module: 
        logger.warning(f"Record not found for deletion: {record_id} in module {module}")
        raise HTTPException(404,'Record not found')
    audit(s,u,'DELETE','record',r.id,r.data,None);s.delete(r);s.commit()
    logger.info(f"Record deleted: {record_id} in module {module} by user {u.username}")
    return {'deleted':record_id}

@app.post('/api/records/{record_id}/approval', tags=['Approvals'])
def request_approval(record_id:str,body:ApprovalIn,u=Depends(require('editor','project_manager','approver','admin')),s:Session=Depends(db)):
    r=s.get(Record,record_id)
    if not r:
        logger.warning(f"Record not found for approval request: {record_id}")
        raise HTTPException(404,'Record not found')
    if body.approver_role not in ('approver','admin'):
        logger.warning(f"Invalid approver role attempted: {body.approver_role}")
        raise HTTPException(400,'Invalid approver role')
    a=Approval(record_id=record_id,requested_by=u.id,approver_role=body.approver_role,comment=body.comment);s.add(a);s.flush()
    r.status='pending_approval'
    targets=s.scalars(select(User).where(User.active==True,User.role.in_([body.approver_role,'admin']))).all()
    for target in targets:notify(s,target.id,'Approval requested',f'Record {record_id} requires {body.approver_role} approval.','approval')
    audit(s,u,'SUBMIT_APPROVAL','approval',a.id,None,{'record_id':record_id,'role':body.approver_role});s.commit()
    logger.info(f"Approval requested for record {record_id} by user {u.username}")
    return {'approval_id':a.id,'status':a.status}
@app.get('/api/approvals', tags=['Approvals'])
def approvals(status:Optional[str]=None,u=Depends(require_user),s:Session=Depends(db)):
    q=select(Approval).order_by(Approval.requested_at.desc())
    if status:q=q.where(Approval.status==status)
    return [{'id':a.id,'record_id':a.record_id,'requested_by':a.requested_by,'approver_role':a.approver_role,'status':a.status,'comment':a.comment,'requested_at':a.requested_at,'decided_at':a.decided_at} for a in s.scalars(q).all()]
@app.post('/api/approvals/{approval_id}/decision', tags=['Approvals'])
def decide(approval_id:str,body:DecisionIn,u=Depends(require('approver','admin')),s:Session=Depends(db)):
    if body.status not in ('approved','rejected'):
        logger.warning(f"Invalid decision status attempted: {body.status}")
        raise HTTPException(400,'Decision must be approved or rejected')
    a=s.get(Approval,approval_id)
    if not a or a.status!='pending':
        logger.warning(f"Pending approval not found: {approval_id}")
        raise HTTPException(404,'Pending approval not found')
    a.status=body.status;a.comment=body.comment;a.decided_at=datetime.now(timezone.utc);r=s.get(Record,a.record_id)
    if r:r.status=body.status
    notify(s,a.requested_by,'Approval decision',f'Record {a.record_id} was {body.status}.','approval')
    audit(s,u,'APPROVAL_DECISION','approval',a.id,None,{'status':body.status,'comment':body.comment});s.commit()
    logger.info(f"Approval decision made: {body.status} for approval {approval_id} by user {u.username}")
    return {'status':body.status}

@app.get('/api/audit-logs', tags=['Audit'])
def audit_logs(limit:int=Query(100,le=500),offset:int=0,u=Depends(require('admin','approver')),s:Session=Depends(db)):
    return [{'id':x.id,'user_id':x.user_id,'action':x.action,'entity_type':x.entity_type,'entity_id':x.entity_id,'ip_address':x.ip_address,'created_at':x.created_at} for x in s.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)).all()]
@app.get('/api/notifications', tags=['System'])
def notifications(u=Depends(require_user),s:Session=Depends(db)):
    return [{'id':n.id,'title':n.title,'message':n.message,'type':n.type,'read':n.read,'created_at':n.created_at} for n in s.scalars(select(Notification).where(Notification.user_id==u.id).order_by(Notification.created_at.desc()).limit(100)).all()]
@app.post('/api/notifications/{notification_id}/read', tags=['System'])
def mark_read(notification_id:str,u=Depends(require_user),s:Session=Depends(db)):
    n=s.get(Notification,notification_id)
    if not n or n.user_id!=u.id:raise HTTPException(404,'Notification not found')
    n.read=True;s.commit();return {'status':'read'}

@app.post('/api/import/master-workbook', tags=['Records'])
@limiter.limit("10/hour")
def import_workbook(file:UploadFile=File(...),u=Depends(require('project_manager','admin')),s:Session=Depends(db),request: Request = None):
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB limit
    raw=file.file.read()
    if len(raw) > MAX_FILE_SIZE:
        raise HTTPException(413, f'File size exceeds maximum allowed size of {MAX_FILE_SIZE // (1024*1024)}MB')
    wb=load_workbook(io.BytesIO(raw),data_only=True);summary=[]
    keys=('Task ID','Risk ID','Issue ID','Milestone ID','Decision ID','Change ID','WBS ID')
    for ws in wb.worksheets:
        headers=[c.value for c in ws[1]]
        if not any(headers):continue
        rows=[]
        for values in ws.iter_rows(min_row=2,values_only=True):
            if any(v is not None for v in values): rows.append({str(headers[i]):json_safe(values[i]) for i in range(len(headers)) if headers[i] is not None})
        for row in rows:
            ext=next((str(row[k]) for k in keys if k in row and row[k] is not None),None)
            existing=s.scalar(select(Record).where(Record.module==ws.title,Record.external_id==ext)) if ext else None
            if existing:before=existing.data;existing.data=row;existing.version+=1;audit(s,u,'IMPORT_UPDATE','record',existing.id,before,row)
            else:r=Record(module=ws.title,external_id=ext,data=row,status='draft',created_by=u.id);s.add(r);s.flush();audit(s,u,'IMPORT_CREATE','record',r.id,None,row)
        summary.append({'module':ws.title,'rows':len(rows)})
    audit(s,u,'IMPORT_WORKBOOK','workbook',None,None,{'filename':file.filename,'sheets':summary});s.commit();return {'file':file.filename,'sheets':summary}

@app.get('/api/reports/status', tags=['Reports'])
@cache(expire=30)
async def status_report(u=Depends(require_user),s:Session=Depends(db)):
    counts={m:c for m,c in s.execute(select(Record.module,func.count(Record.id)).group_by(Record.module)).all()}
    risks=s.scalars(select(Record).where(Record.module=='Risk Register')).all();issues=s.scalars(select(Record).where(Record.module=='Issue Register')).all();tasks=s.scalars(select(Record).where(Record.module=='Task Register')).all()
    return {'generated_at':datetime.now(timezone.utc),'record_counts':counts,'open_risks':sum(1 for r in risks if str(r.data.get('Status','')).lower()!='closed'),'open_issues':sum(1 for r in issues if str(r.data.get('Status','')).lower()!='closed'),'tasks':len(tasks)}

def build_xlsx(s):
    wb=Workbook();wb.remove(wb.active)
    modules=s.scalars(select(Record.module).distinct().order_by(Record.module)).all()
    for module in modules:
        rows=s.scalars(select(Record).where(Record.module==module).order_by(Record.updated_at)).all();ws=wb.create_sheet(module[:31]);allkeys=[]
        for r in rows:
            for k in r.data:
                if k not in allkeys:allkeys.append(k)
        ws.append(allkeys)
        for r in rows:ws.append([r.data.get(k) for k in allkeys])
        ws.freeze_panes='A2';ws.auto_filter.ref=ws.dimensions
    out=io.BytesIO();wb.save(out);out.seek(0);return out

def build_pdf(s):
    buf=io.BytesIO();doc=SimpleDocTemplate(buf,pagesize=landscape(A4),rightMargin=28,leftMargin=28,topMargin=28,bottomMargin=28);styles=getSampleStyleSheet();story=[Paragraph('MInT / AICS PMO Management Report',styles['Title']),Paragraph(datetime.now(timezone.utc).strftime('Generated %Y-%m-%d %H:%M UTC'),styles['Normal']),Spacer(1,12)]
    counts={m:c for m,c in s.execute(select(Record.module,func.count(Record.id)).group_by(Record.module)).all()};data=[['Module','Records']]+[[m,str(c)] for m,c in counts.items()]
    t=Table(data,repeatRows=1);t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#17365d')),('TEXTCOLOR',(0,0),(-1,0),colors.white),('GRID',(0,0),(-1,-1),.4,colors.grey),('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
    story += [Paragraph('Register coverage',styles['Heading2']),t,Spacer(1,12),Paragraph('This report summarizes the PostgreSQL source of truth. Detailed registers can be exported as Excel.',styles['BodyText'])];doc.build(story);buf.seek(0);return buf

def create_report(s,u,fmt='xlsx',schedule_id=None):
    os.makedirs(settings.report_dir,exist_ok=True);stamp=datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S');ext=fmt.lower();filename=f'mint_aics_pmo_status_{stamp}.{ext}';content=build_xlsx(s) if ext=='xlsx' else build_pdf(s)
    path=os.path.join(settings.report_dir,filename);open(path,'wb').write(content.getvalue());run=ReportRun(schedule_id=schedule_id,report_type='status',format=ext,status='completed',filename=filename,created_by=u.id);s.add(run);return run,path
@app.get('/api/reports/export/{fmt}', tags=['Reports'])
def export_report(fmt:str,u=Depends(require_user),s:Session=Depends(db)):
    from fastapi.responses import StreamingResponse
    if fmt not in ('xlsx','pdf'):raise HTTPException(400,'Supported formats: xlsx, pdf')
    content=build_xlsx(s) if fmt=='xlsx' else build_pdf(s);media='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' if fmt=='xlsx' else 'application/pdf';name=f'mint_aics_pmo_report_{datetime.now(timezone.utc).strftime("%Y%m%d_%H%M")}.{fmt}'
    audit(s,u,'EXPORT_REPORT','report',None,None,{'format':fmt,'filename':name});s.commit();return StreamingResponse(iter([content.getvalue()]),media_type=media,headers={'Content-Disposition':f'attachment; filename="{name}"'})
@app.get('/api/report-runs', tags=['Reports'])
def report_runs(u=Depends(require('project_manager','admin')),s:Session=Depends(db)):
    return [{'id':r.id,'schedule_id':r.schedule_id,'report_type':r.report_type,'format':r.format,'status':r.status,'filename':r.filename,'created_at':r.created_at} for r in s.scalars(select(ReportRun).order_by(ReportRun.created_at.desc()).limit(100)).all()]
@app.get('/api/report-schedules', tags=['Reports'])
def schedules(u=Depends(require('project_manager','admin')),s:Session=Depends(db)):
    return [{'id':x.id,'name':x.name,'frequency':x.frequency,'recipients':x.recipients,'report_type':x.report_type,'active':x.active,'last_run':x.last_run} for x in s.scalars(select(ReportSchedule).order_by(ReportSchedule.name)).all()]
@app.post('/api/report-schedules', tags=['Reports'])
def create_schedule(body:ScheduleIn,u=Depends(require('project_manager','admin')),s:Session=Depends(db)):
    if body.frequency not in ('daily','weekly','monthly'):raise HTTPException(400,'frequency must be daily, weekly or monthly')
    x=ReportSchedule(name=body.name,frequency=body.frequency,recipients=[str(e) for e in body.recipients],report_type=body.report_type,active=body.active,created_by=u.id);s.add(x);s.flush();audit(s,u,'CREATE','report_schedule',x.id,None,body.model_dump());s.commit();return {'id':x.id}
@app.patch('/api/report-schedules/{schedule_id}', tags=['Reports'])
def update_schedule(schedule_id:str,body:ScheduleIn,u=Depends(require('project_manager','admin')),s:Session=Depends(db)):
    x=s.get(ReportSchedule,schedule_id)
    if not x:raise HTTPException(404,'Schedule not found')
    x.name=body.name;x.frequency=body.frequency;x.recipients=[str(e) for e in body.recipients];x.report_type=body.report_type;x.active=body.active;audit(s,u,'UPDATE','report_schedule',x.id);s.commit();return {'status':'updated'}
@app.delete('/api/report-schedules/{schedule_id}', tags=['Reports'])
def delete_schedule(schedule_id:str,u=Depends(require('admin')),s:Session=Depends(db)):
    x=s.get(ReportSchedule,schedule_id)
    if not x:raise HTTPException(404,'Schedule not found')
    s.delete(x);audit(s,u,'DELETE','report_schedule',x.id);s.commit();return {'status':'deleted'}

@app.post('/api/report-schedules/{schedule_id}/run', tags=['Reports'])
def run_schedule(schedule_id:str,u=Depends(require('project_manager','admin')),s:Session=Depends(db)):
    x=s.get(ReportSchedule,schedule_id)
    if not x:raise HTTPException(404,'Schedule not found')
    run,path=create_report(s,u,'xlsx',x.id);x.last_run=datetime.now(timezone.utc);s.commit();return {'id':run.id,'filename':run.filename,'path':path}

@app.post('/api/sync/upsert')
def sync_upsert(payload:list[dict],u=Depends(require('editor','project_manager','admin')),s:Session=Depends(db)):
    results=[]
    for item in payload:
        module=item.get('module');ext=item.get('external_id');data=item.get('data',{})
        if not module:continue
        r=s.scalar(select(Record).where(Record.module==module,Record.external_id==ext)) if ext else None
        if r:before=r.data;r.data=data;r.version+=1;r.status=item.get('status',r.status);audit(s,u,'SYNC_UPDATE','record',r.id,before,data);results.append({'id':r.id,'action':'updated'})
        else:r=Record(module=module,external_id=ext,data=data,status=item.get('status','draft'),created_by=u.id);s.add(r);s.flush();audit(s,u,'SYNC_CREATE','record',r.id,None,data);results.append({'id':r.id,'action':'created'})
    s.commit();return {'results':results,'count':len(results)}


def scheduled_report_job():
    s=SessionLocal();now=datetime.now(timezone.utc)
    try:
        for x in s.scalars(select(ReportSchedule).where(ReportSchedule.active==True)).all():
            # The scheduler is hourly; frequency is enforced from last_run.
            due=x.last_run is None or (x.frequency=='daily' and now-x.last_run>=timedelta(days=1)) or (x.frequency=='weekly' and now-x.last_run>=timedelta(days=7)) or (x.frequency=='monthly' and now-x.last_run>=timedelta(days=30))
            if not due:continue
            admin=s.scalar(select(User).where(User.role=='admin',User.active==True))
            if not admin:continue
            run,path=create_report(s,admin,'xlsx',x.id);x.last_run=now
            for email in x.recipients:
                if settings.smtp_host and settings.smtp_from:
                    try:
                        msg=EmailMessage();msg['Subject']=x.name;msg['From']=settings.smtp_from;msg['To']=email;msg.set_content(f'Attached: {run.filename}');msg.add_attachment(open(path,'rb').read(),maintype='application',subtype='vnd.openxmlformats-officedocument.spreadsheetml.sheet',filename=run.filename)
                        with smtplib.SMTP(settings.smtp_host,settings.smtp_port,timeout=20) as smtp:
                            smtp.starttls();
                            if settings.smtp_username:smtp.login(settings.smtp_username,settings.smtp_password)
                            smtp.send_message(msg)
                    except Exception as e:
                        logger.error(f"Failed to send report email to {email}: {e}")
            s.commit()
    finally:s.close()

scheduler=BackgroundScheduler(timezone='UTC');scheduler.add_job(scheduled_report_job,'interval',hours=1,id='scheduled_reports',replace_existing=True);scheduler.start()
