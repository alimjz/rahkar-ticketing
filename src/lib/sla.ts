import { closed, number, type Settings, type Ticket } from './model';
const HOUR=3600000, OFFSET=3.5*HOUR;
export function localDay(ms:number) { return new Date(ms+OFFSET).toISOString().slice(0,10); }
export function isWorking(ms:number,s:Settings) { return !s.weekends.includes(new Date(ms+OFFSET).getUTCDay())&&!s.holidays.some(h=>h.date===localDay(ms)); }
export function elapsedHours(from:string,to:string,incident:boolean,s:Settings):number {
let cursor=new Date(from).getTime(); const end=new Date(to).getTime();
if(end<=cursor) return 0;
if(incident) return (end-cursor)/HOUR;
let total=0;
while(cursor<end) { const dayEnd=(Math.floor((cursor+OFFSET)/(24*HOUR))+1)*24*HOUR-OFFSET; const next=Math.min(dayEnd,end); if(isWorking(cursor,s)) total+=(next-cursor)/HOUR; cursor=next; }
return total;
}
export function sla(t:Ticket,s:Settings,now=new Date().toISOString()) {
if(t.type==='TASK'||(t.sla_hours===null&&!t.deadline_at)) return {label:'بدون SLA',remaining:null,percent:0,tone:'neutral',paused:false};
const end=closed(t)&&t.resolved_at?t.resolved_at:now;
const budget=t.deadline_at?elapsedHours(t.created_at,t.deadline_at,t.type==='IR',s):t.sla_hours!;
const used=elapsedHours(t.created_at,end,t.type==='IR',s);
const remaining=budget-used, overdue=remaining<0;
const paused=!closed(t)&&t.type!=='IR'&&!isWorking(new Date(now).getTime(),s);
const minutes=Math.ceil(Math.abs(remaining)*60);
const duration=minutes>=1440?number(Math.floor(minutes/1440))+' روز و '+number(Math.floor(minutes%1440/60))+' ساعت':number(Math.floor(minutes/60))+' ساعت و '+number(minutes%60)+' دقیقه';
return {label:closed(t)?(overdue?'حل با تأخیر':'در مهلت مقرر'):duration+(overdue?' تأخیر':''),remaining,percent:Math.min(100,Math.max(0,budget?used/budget*100:100)),tone:overdue?'danger':remaining<budget*.2?'warning':'success',paused};
}
