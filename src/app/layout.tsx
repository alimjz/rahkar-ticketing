import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'راهکار | مدیریت درخواست‌ها و خدمات',description:'فضای مشترک تیم‌ها برای مدیریت درخواست‌ها، گردش کار و SLA'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="fa" dir="rtl" data-scroll-behavior="smooth"><body suppressHydrationWarning>{children}</body></html>;}
