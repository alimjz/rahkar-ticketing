import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { demo } from "./repository";
import type { Store, User } from "./model";
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
export function verifyPassword(password: string, hash?: string) {
  try {
    const [salt, digest] = (hash || "").split(":");
    if (!salt || !digest) return false;
    return timingSafeEqual(
      Buffer.from(digest, "hex"),
      scryptSync(password, salt, 64),
    );
  } catch {
    return false;
  }
}
function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32)
    throw new Error("AUTH_SECRET must contain at least 32 characters.");
  return s;
}
function sign(s: string) {
  return createHmac("sha256", secret()).update(s).digest("base64url");
}
export async function loginCookie(u: User) {
  const payload = Buffer.from(
    JSON.stringify({
      id: u.id,
      expires: Date.now() + 8 * 3600000,
      version: createHmac("sha256", secret())
        .update(u.password_hash || "demo")
        .digest("hex"),
    }),
  ).toString("base64url");
  (await cookies()).set("rahkar_session", payload + "." + sign(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: 28800,
  });
}
export async function currentUser(s: Store): Promise<User> {
  const token = (await cookies()).get("rahkar_session")?.value;
  try {
    if (!token) throw new Error();
    const [payload, sig] = token.split(".");
    const expected = sign(payload);
    if (
      !sig ||
      sig.length !== expected.length ||
      !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    )
      throw new Error();
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const u = s.users.find((u) => u.id === data.id && u.active);
    if (
      !u ||
      data.expires < Date.now() ||
      data.version !==
        createHmac("sha256", secret())
          .update(u.password_hash || "demo")
          .digest("hex")
    )
      throw new Error();
    return u;
  } catch {
    throw new AppError("برای ادامه وارد حساب خود شوید.", 401);
  }
}
export function checkOrigin(req: Request) {
  const expected = process.env.APP_URL || new URL(req.url).origin;
  if (req.headers.get("origin") !== expected)
    throw new AppError("مبدأ درخواست معتبر نیست.", 403);
}
export function errorResponse(e: unknown) {
  if (e instanceof AppError)
    return Response.json({ error: e.message }, { status: e.status });
  console.error(e instanceof Error ? e.message : "Unknown server error");
  return Response.json(
    {
      error:
        "انجام عملیات ممکن نشد. تنظیمات سرور و اتصال پایگاه داده را بررسی کنید.",
    },
    { status: 500 },
  );
}
export function publicUser(u: User) {
  const { password_hash: _, external_id: __, ...safe } = u;
  return safe;
}
export { demo };
