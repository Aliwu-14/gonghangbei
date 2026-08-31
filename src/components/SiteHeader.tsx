"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppState } from "@/lib/store";

const NAV_ITEMS = [
  { href: "/", label: "首页" },
  { href: "/welcome", label: "财富规划" },
  { href: "/customer", label: "客户信息" },
  { href: "/plan", label: "我的方案" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { state, dispatch } = useAppState();
  const customer = state.currentCustomer;
  const isLoggedIn = !!customer;
  const name = customer?.demoName?.slice(0, 1) ?? "";
  const genderLabel = customer?.gender === "female" ? "女士" : "先生";

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    dispatch({ type: "RESET" });
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("icbc_wmp_state");
    }
    window.location.href = "/login";
  };

  return (
    <>
      <div className="icbc-topbar-strip" />
      <div className="icbc-utility">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-5 text-xs">
            <span>个人网上银行</span>
            <span className="text-[var(--ink-4)]">|</span>
            <span>欢迎使用 ICBC 财富规划服务</span>
          </div>
          <div className="flex items-center gap-5 text-xs">
            <Link href="/welcome">服务介绍</Link>
            <span className="text-[var(--ink-4)]">|</span>
            <span>客户服务热线 <span className="text-[var(--brand-red)] font-medium">95588</span></span>
          </div>
        </div>
      </div>

      <header className="icbc-nav">
        <Link href="/" className="icbc-logo">
          <span className="icbc-logo-mark">ICBC</span>
          <span className="icbc-logo-text">
            <span className="icbc-logo-title">工商银行</span>
            <span className="icbc-logo-sub">PRIVATE WEALTH</span>
          </span>
        </Link>

        <nav className="icbc-nav-menu">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`icbc-nav-item ${active ? "active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="icbc-nav-right">
          {isLoggedIn ? (
            <>
              <Link href="/customer">尊敬的 {name} {genderLabel}</Link>
              <span className="text-white/30">|</span>
              <a href="/login" onClick={handleLogout} className="cursor-pointer">
                退出
              </a>
            </>
          ) : (
            <>
              <Link href="/login" className="cursor-pointer">
                登录
              </Link>
              <span className="text-white/30">|</span>
              <Link href="/welcome" className="cursor-pointer">
                注册
              </Link>
            </>
          )}
        </div>
      </header>
    </>
  );
}