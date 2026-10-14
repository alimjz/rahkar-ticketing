export const TYPES = { SR: 'درخواست خدمت', IR: 'رخداد', CR: 'درخواست تغییر', TASK: 'کار شخصی' };
export const PRIORITIES = { LOW: 'کم', MEDIUM: 'متوسط', HIGH: 'زیاد', CRITICAL: 'بحرانی' };
export const STATES = { OPEN: 'باز', IN_PROGRESS: 'در حال انجام', WAITING: 'در انتظار تأیید', RESOLVED: 'حل‌شده', CLOSED: 'بسته‌شده' };
export type TicketType = keyof typeof TYPES;
export type Priority = keyof typeof PRIORITIES;
export type Status = keyof typeof STATES;
export const PERMISSIONS = {
'dashboard.view':'داشبورد','tickets.read':'مشاهده درخواست‌های خود','tickets.team':'مشاهده صندوق تیم','tickets.all':'مشاهده درخواست‌های سازمان','tickets.create':'ثبت درخواست','tickets.assign':'تخصیص و انتقال','tickets.transition':'تغییر وضعیت','tickets.comment':'ثبت دیدگاه','tickets.worklog':'ثبت زمان','reports.view':'گزارش SLA','users.manage':'مدیریت کاربران','teams.manage':'مدیریت تیم‌ها','roles.manage':'مدیریت دسترسی','settings.manage':'تقویم و SLA','workflows.manage':'گردش کار'
} as const;
export type Permission = keyof typeof PERMISSIONS;
export type Team = { id:string; name:string; code:string; description:string; color:string; active:boolean };
export type Role = { id:string; name:string; permissions:Permission[] };
export type User = { id:string; name:string; email:string; team_id:string; role_id:string; active:boolean; password_hash?:string; auth_provider:'local'|'directory'; external_id?:string|null };
export type Ticket = { id:string; number:number; subject:string; description:string; type:TicketType; priority:Priority; status:Status; requester_id:string; source_team_id:string; team_id:string; assignee_id:string|null; created_at:string; updated_at:string; resolved_at:string|null; resolution:string; sla_hours:number|null; deadline_at:string|null };
export type Comment = { id:string; ticket_id:string; user_id:string; body:string; created_at:string };
export type WorkLog = { id:string; ticket_id:string; user_id:string; minutes:number; note:string; created_at:string };
export type History = { id:string; ticket_id:string; user_id:string; action:string; created_at:string };
export type Settings = { timezone:'Asia/Tehran'; weekends:number[]; holidays:{date:string;title:string}[]; sla:Record<'SR'|'IR'|'CR',Record<Priority,number>>; workflows:Record<TicketType,{from:Status;to:Status}[]> };
export type Store = { teams:Team[]; roles:Role[]; users:User[]; tickets:Ticket[]; comments:Comment[]; work_logs:WorkLog[]; history:History[]; settings:Settings };
export type Snapshot = Store & { current_user:User; demo:boolean };
export const closed = (t:Ticket) => ['RESOLVED','CLOSED'].includes(t.status);
export const number = (n:number) => n.toLocaleString('fa-IR');
export const date = (s:string,time=false) => new Intl.DateTimeFormat('fa-IR',{timeZone:'Asia/Tehran',year:'numeric',month:'short',day:'numeric',...(time?{hour:'2-digit',minute:'2-digit'}:{})}).format(new Date(s));
export const key = (t:Ticket) => t.type+'-'+t.number;
export function permissions(s:Store,u:User):Permission[] { return s.roles.find(r=>r.id===u.role_id)?.permissions||[]; }
export function visible(s:Store,u:User,t:Ticket) {
const p=permissions(s,u);
if(!p.includes('tickets.read')) return false;
if(t.type==='TASK') return t.requester_id===u.id;
return t.requester_id===u.id||t.assignee_id===u.id||p.includes('tickets.all')||(p.includes('tickets.team')&&(t.team_id===u.team_id||t.source_team_id===u.team_id));
}
export function actionable(s:Store,u:User,t:Ticket) { return t.type==='TASK'?t.requester_id===u.id:permissions(s,u).includes('tickets.all')||t.assignee_id===u.id||(permissions(s,u).includes('tickets.team')&&t.team_id===u.team_id); }
