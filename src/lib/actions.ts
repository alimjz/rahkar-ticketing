import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { AppError, hashPassword } from './auth';
import { actionable, visible, permissions, PERMISSIONS, STATES, type Store, type User, type Ticket, type Permission } from './model';
const type=z.enum(['SR','IR','CR','TASK']), priority=z.enum(['LOW','MEDIUM','HIGH','CRITICAL']), status=z.enum(['OPEN','IN_PROGRESS','WAITING','RESOLVED','CLOSED']);
const id=z.string().min(1).max(100), text=z.string().trim().min(1);
const perm=z.enum(Object.keys(PERMISSIONS) as [Permission,...Permission[]]);
const actionSchema=z.discriminatedUnion('action',[
z.object({action:z.literal('create'),subject:text.max(300),description:text.max(20000),type,priority,team_id:id,sla_hours:z.number().int().min(1).max(87600).nullable().optional(),deadline_at:z.string().datetime().nullable().optional()}),
z.object({action:z.literal('transition'),ticket_id:id,status,resolution:z.string().trim().max(4000).optional()}),
z.object({action:z.literal('assign'),ticket_id:id,team_id:id,assignee_id:id.nullable()}),
z.object({action:z.literal('comment'),ticket_id:id,body:text.max(10000)}),
z.object({action:z.literal('worklog'),ticket_id:id,minutes:z.number().int().min(1).max(1440),note:text.max(2000)}),
z.object({action:z.literal('team'),id:id.optional(),name:text.max(120),code:z.string().regex(/^[A-Z0-9_-]{2,12}$/),description:z.string().max(500),color:z.string().regex(/^#[0-9a-fA-F]{6}$/),active:z.boolean()}),
z.object({action:z.literal('user'),id:id.optional(),name:text.max(160),email:z.string().email().max(254),team_id:id,role_id:id,password:z.string().min(12).max(128).optional(),active:z.boolean()}),
z.object({action:z.literal('role'),id:id.optional(),name:text.max(100),permissions:z.array(perm)}),
z.object({action:z.literal('settings'),settings:z.object({timezone:z.literal('Asia/Tehran'),weekends:z.array(z.number().int().min(0).max(6)).max(6),holidays:z.array(z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s),title:text.max(160)})).max(1000),sla:z.object({SR:z.object({LOW:z.number(),MEDIUM:z.number(),HIGH:z.number(),CRITICAL:z.number()}),IR:z.object({LOW:z.number(),MEDIUM:z.number(),HIGH:z.number(),CRITICAL:z.number()}),CR:z.object({LOW:z.number(),MEDIUM:z.number(),HIGH:z.number(),CRITICAL:z.number()})})})}),
z.object({action:z.literal('workflow'),type,transitions:z.array(z.object({from:status,to:status})).min(1).max(25)})
]);
export function execute(s:Store,u:User,input:unknown){
const parsed=actionSchema.safeParse(input);
if(!parsed.success)throw new AppError('اطلاعات فرم معتبر نیست. فیلدها و مقادیر واردشده را بررسی کنید.');
const a=parsed.data, now=new Date().toISOString(), p=permissions(s,u);
const require=(permission:Permission)=>{if(!p.includes(permission))throw new AppError('مجوز انجام این عملیات را ندارید.',403);};
const ticket=(ticketId:string)=>{const t=s.tickets.find(t=>t.id===ticketId);if(!t||!visible(s,u,t))throw new AppError('درخواست پیدا نشد.',404);return t;};
const audit=(t:Ticket,action:string)=>{t.updated_at=now;s.history.push({id:randomUUID(),ticket_id:t.id,user_id:u.id,action,created_at:now});};
const team=(teamId:string)=>{if(!s.teams.some(t=>t.id===teamId&&t.active))throw new AppError('تیم فعال را انتخاب کنید.');};
switch(a.action){
case 'create':{
require('tickets.create');team(u.team_id);team(a.type==='TASK'?u.team_id:a.team_id);
if(a.deadline_at&&new Date(a.deadline_at)<=new Date())throw new AppError('مهلت باید در آینده باشد.');
const t:Ticket={id:randomUUID(),number:Math.max(1000,...s.tickets.map(t=>t.number))+1,subject:a.subject,description:a.description,type:a.type,priority:a.priority,status:'OPEN',requester_id:u.id,source_team_id:u.team_id,team_id:a.type==='TASK'?u.team_id:a.team_id,assignee_id:a.type==='TASK'?u.id:null,created_at:now,updated_at:now,resolved_at:null,resolution:'',sla_hours:a.type==='TASK'?null:a.type==='CR'?(a.deadline_at?null:a.sla_hours??s.settings.sla.CR[a.priority]):s.settings.sla[a.type][a.priority],deadline_at:a.type==='CR'?a.deadline_at??null:null};
s.tickets.push(t);audit(t,'درخواست ثبت شد.');return {id:t.id};
}
case 'transition':{
require('tickets.transition');const t=ticket(a.ticket_id);if(!actionable(s,u,t))throw new AppError('تغییر وضعیت فقط برای تیم رسیدگی‌کننده مجاز است.',403);
if(!s.settings.workflows[t.type].some(f=>f.from===t.status&&f.to===a.status))throw new AppError('این تغییر در گردش کار مجاز نیست.');
if(['RESOLVED','CLOSED'].includes(a.status)&&!a.resolution&&!t.resolution)throw new AppError('شرح نتیجه را وارد کنید.');
const was=t.status;t.status=a.status;if(a.resolution)t.resolution=a.resolution;
t.resolved_at=['RESOLVED','CLOSED'].includes(a.status)?t.resolved_at??now:null;
audit(t,'وضعیت از «'+STATES[was]+'» به «'+STATES[a.status]+'» تغییر کرد.');return {};
}
case 'assign':{
require('tickets.assign');const t=ticket(a.ticket_id);if(!actionable(s,u,t)||t.type==='TASK')throw new AppError('مجوز تخصیص این درخواست را ندارید.',403);team(a.team_id);
if(a.assignee_id&&!s.users.some(x=>x.id===a.assignee_id&&x.team_id===a.team_id&&x.active))throw new AppError('مسئول باید عضو فعال تیم مقصد باشد.');
t.team_id=a.team_id;t.assignee_id=a.assignee_id;audit(t,'درخواست به '+s.teams.find(x=>x.id===a.team_id)!.name+' / '+(s.users.find(x=>x.id===a.assignee_id)?.name||'بدون مسئول')+' تخصیص یافت.');return {};
}
case 'comment':{require('tickets.comment');const t=ticket(a.ticket_id);s.comments.push({id:randomUUID(),ticket_id:t.id,user_id:u.id,body:a.body,created_at:now});audit(t,'دیدگاه جدید ثبت شد.');return {};}
case 'worklog':{require('tickets.worklog');const t=ticket(a.ticket_id);if(!actionable(s,u,t))throw new AppError('مجوز ثبت زمان این درخواست را ندارید.',403);s.work_logs.push({id:randomUUID(),ticket_id:t.id,user_id:u.id,minutes:a.minutes,note:a.note,created_at:now});audit(t,'زمان کار ثبت شد.');return {};}
case 'team':{
require('teams.manage');if(s.teams.some(t=>t.code===a.code&&t.id!==a.id))throw new AppError('کد تیم تکراری است.');
const {action:_,...value}=a;
if(a.id){const t=s.teams.find(t=>t.id===a.id);if(!t)throw new AppError('تیم پیدا نشد.',404);if(!a.active&&(s.users.some(x=>x.team_id===t.id&&x.active)||s.tickets.some(x=>x.team_id===t.id&&!['CLOSED','RESOLVED'].includes(x.status))))throw new AppError('ابتدا اعضا و درخواست‌های باز تیم را منتقل کنید.');Object.assign(t,value);}else s.teams.push({...value,id:randomUUID()});return {};
}
case 'user':{
require('users.manage');team(a.team_id);
if(!s.roles.some(r=>r.id===a.role_id))throw new AppError('نقش معتبر نیست.');
if(!p.includes('roles.manage')&&s.roles.find(r=>r.id===a.role_id)!.permissions.some(permission=>!p.includes(permission)))throw new AppError('برای اعطای دسترسی مدیر، مجوز مدیریت نقش لازم است.',403);
if(s.users.some(x=>x.email.toLowerCase()===a.email.toLowerCase()&&x.id!==a.id))throw new AppError('این ایمیل قبلاً ثبت شده است.');
const existing=s.users.find(x=>x.id===a.id);
if(a.id&&!existing)throw new AppError('کاربر پیدا نشد.',404);
if(existing?.role_id==='admin'&&!p.includes('roles.manage'))throw new AppError('ویرایش مدیر مجاز نیست.',403);
if(a.id===u.id&&(!a.active||a.role_id!==u.role_id))throw new AppError('نقش یا وضعیت حساب فعلی خود را تغییر ندهید.');
if(!a.id&&!a.password)throw new AppError('رمز عبور حداقل ۱۲ نویسه لازم است.');
const value={name:a.name,email:a.email.toLowerCase(),team_id:a.team_id,role_id:a.role_id,active:a.active,...(a.password?{password_hash:hashPassword(a.password)}:{})};
if(existing){if(existing.team_id!==a.team_id&&s.tickets.some(t=>t.assignee_id===existing.id&&t.type!=='TASK'&&t.team_id!==a.team_id&&!['CLOSED','RESOLVED'].includes(t.status)))throw new AppError('ابتدا درخواست‌های باز این کاربر را دوباره تخصیص دهید.');Object.assign(existing,value);}else s.users.push({...value,id:randomUUID(),auth_provider:'local'});return {};
}
case 'role':{
require('roles.manage');if(a.id==='admin')throw new AppError('نقش مدیر سامانه ثابت است.');
if(a.id===u.role_id)throw new AppError('نقش فعال خود را تغییر ندهید.');
const value={name:a.name,permissions:[...new Set(a.permissions)]};
if(a.id){const r=s.roles.find(r=>r.id===a.id);if(!r)throw new AppError('نقش پیدا نشد.',404);Object.assign(r,value);}else s.roles.push({...value,id:randomUUID()});return {};
}
case 'settings':{
require('settings.manage');
for(const policy of Object.values(a.settings.sla))for(const hours of Object.values(policy))if(!Number.isInteger(hours)||hours<1||hours>87600)throw new AppError('ساعت SLA باید عدد صحیح بین ۱ و ۸۷۶۰۰ باشد.');
s.settings={...s.settings,...a.settings};return {};
}
case 'workflow':{
require('workflows.manage');
if(a.transitions.some(x=>x.from===x.to))throw new AppError('مبدأ و مقصد نباید یکسان باشند.');
s.settings.workflows[a.type]=a.transitions;return {};
}
}
}
