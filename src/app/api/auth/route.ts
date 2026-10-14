import { cookies } from "next/headers";
import { readStore, demo } from "@/lib/repository";
import {
  loginCookie,
  verifyPassword,
  checkOrigin,
  errorResponse,
  AppError,
} from "@/lib/auth";
const attempts = new Map<string, { count: number; until: number }>();
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const body = await req.json();

    const email = String(body.email || "")
      .toLowerCase()
      .slice(0, 254);

    const key = email;
    const record = attempts.get(key);

    if (record && record.until > Date.now() && record.count >= 10)
      throw new AppError(
        "تلاش‌های ورود زیاد است. ۱۵ دقیقه دیگر دوباره تلاش کنید.",
        429,
      );
    const s = await readStore();

    const u =
      demo && body.demo
        ? s.users.find((u) => u.id === body.user_id && u.active)
        : s.users.find(
            (u) => u.email === email && u.active && u.auth_provider === "local",
          );
    if (
      !(demo && body.demo && u) &&
      (!u ||
        typeof body.password !== "string" ||
        body.password.length > 128 ||
        !verifyPassword(body.password, u.password_hash))
    ) {
      if (attempts.size > 10000)
        for (const [k, v] of attempts)
          if (v.until < Date.now()) attempts.delete(k);
      attempts.set(key, {
        count: record && record.until > Date.now() ? record.count + 1 : 1,
        until: Date.now() + 900000,
      });
      throw new AppError("ایمیل یا رمز عبور درست نیست.", 401);
    }
    if (!u) throw new AppError("حساب فعال پیدا نشد.", 401);
    attempts.delete(key);
    await loginCookie(u);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(req: Request) {
  try {
    checkOrigin(req);
    (await cookies()).delete("rahkar_session");
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
