"use client";
import { useState } from "react";
import { Brand, Field } from "./ui";
import { ArrowLeft, ShieldCheck } from "lucide-react";
export default function Login({ demo }: { demo: boolean }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function login(body: unknown) {
    setError("");
    setBusy(true);
    try {
      const result = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await result.json();
      if (!result.ok) throw new Error(d.error);
      window.location.href = "/workspace";
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <div className="login-story">
        <Brand />
        <div>
          <span className="eyebrow">فضای مشترک تیم‌ها</span>
          <h1>
            هر درخواست،
            <br />
            یک مسیر روشن.
          </h1>
          <p>
            با ورود به راهکار، کارهای پیش رو، وضعیت درخواست‌ها و فعالیت تیم خود
            را دنبال کنید.
          </p>
          <div className="login-orbit">
            <ShieldCheck size={68} />
          </div>
        </div>
        <small>طراحی‌شده برای همکاری، از اولین درخواست تا آخرین اقدام.</small>
      </div>
      <section className="login-panel">
        <a className="back-link" href="/">
          بازگشت به صفحه اصلی <ArrowLeft size={16} />
        </a>
        <h2>خوش آمدید</h2>
        <p>برای ورود، اطلاعات حساب خود را وارد کنید.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            login({ email: f.get("email"), password: f.get("password") });
          }}
        >
          <Field label="ایمیل سازمانی">
            <input
              name="email"
              type="email"
              dir="ltr"
              autoComplete="username"
              required
              placeholder="name@company.com"
            />
          </Field>
          <Field label="رمز عبور">
            <input
              name="password"
              type="password"
              dir="ltr"
              autoComplete="current-password"
              required
            />
          </Field>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button disabled={busy} className="btn primary full">
            {busy ? "در حال ورود…" : "ورود به حساب"}
            <ArrowLeft size={18} />
          </button>
        </form>
        {demo && (
          <div className="demo-login">
            <b>نسخه نمایشی</b>
            <p>با داده‌های نمونه، نقش‌های مختلف را بررسی کنید.</p>
            <div className="demo-buttons">
              <button
                className="btn light"
                disabled={busy}
                onClick={() => login({ demo: true, user_id: "u-admin" })}
              >
                ورود به‌عنوان مدیر
              </button>
              <button
                className="btn light"
                disabled={busy}
                onClick={() => login({ demo: true, user_id: "u-bss" })}
              >
                کارشناس BSS
              </button>
              <button
                className="btn light"
                disabled={busy}
                onClick={() => login({ demo: true, user_id: "u-support" })}
              >
                درخواست‌دهنده
              </button>
            </div>
            <small>داده‌های نمایشی در همین سرور ذخیره می‌شوند.</small>
          </div>
        )}
      </section>
    </main>
  );
}
