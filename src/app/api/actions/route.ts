import { mutateStore } from "@/lib/repository";
import { currentUser, checkOrigin, errorResponse, AppError } from "@/lib/auth";
import { execute } from "@/lib/actions";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const text = await req.text();
    if (text.length > 100000)
      throw new AppError("حجم درخواست بیش از حد مجاز است.", 413);
    let input;
    try {
      input = JSON.parse(text);
    } catch {
      throw new AppError("درخواست معتبر نیست.");
    }
    const result = await mutateStore(async (s) =>
      execute(s, await currentUser(s), input),
    );
    return Response.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
