import { readStore, demo } from "@/lib/repository";
import { currentUser, publicUser, errorResponse } from "@/lib/auth";
import { permissions, visible } from "@/lib/model";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const s = await readStore(),
      u = await currentUser(s);
    const p = permissions(s, u);
    const tickets = s.tickets.filter((t) => visible(s, u, t)),
      ids = new Set(tickets.map((t) => t.id));
    return Response.json(
      {
        ...s,
        tickets,
        comments: s.comments.filter((c) => ids.has(c.ticket_id)),
        work_logs: s.work_logs.filter((c) => ids.has(c.ticket_id)),
        history: s.history.filter((c) => ids.has(c.ticket_id)),
        users: s.users.map(publicUser),
        roles: s.roles.map((r) => ({
          ...r,
          permissions:
            r.id === u.role_id || p.includes("roles.manage")
              ? r.permissions
              : [],
        })),
        current_user: publicUser(u),
        demo,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
