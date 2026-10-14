"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X, Command, ArrowUpRight } from "lucide-react";
export function Brand() {
  return (
    <a className="brand" href="/">
      <span className="brand-mark">
        <Command size={24} />
      </span>
      <span>
        راهکار<small>فضای مشترک تیم‌ها</small>
      </span>
    </a>
  );
}
export function Avatar({
  name,
  size = "normal",
}: {
  name: string;
  size?: string;
}) {
  return (
    <span className={"avatar " + size} aria-label={name}>
      {name
        .split(" ")
        .map((x) => x[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}
export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span className={"pill " + tone}>
      <i />
      {children}
    </span>
  );
}
export function Empty({
  title = "موردی پیدا نشد",
  text = "فیلترها را تغییر دهید یا درخواست جدیدی ثبت کنید.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="empty">
      <Command size={30} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={"modal " + (wide ? "wide" : "")}
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <div>
          <h2 id="dialog-title">{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={onClose}
          aria-label="بستن"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function CardTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-title">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function LinkArrow() {
  return <ArrowUpRight size={16} />;
}
