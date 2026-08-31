"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppState } from "@/lib/store";
import { demoCustomers, demoKYC } from "@/lib/mock/data";

export default function LoginPage() {
  const router = useRouter();
  const { dispatch } = useAppState();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [cert, setCert] = useState(true);

  const handleLogin = () => {
    console.log("[ICBC-WMP] click 登录 →", { user, password, cert });
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "icbc-login-input",
        JSON.stringify({ user, password, cert, ts: Date.now() })
      );
    }

    // Demo 模式：把账号当作 customerId，去 demo 数据里找
    const customer = demoCustomers.find(
      (c) => c.customerId === user || user === "" || user === "demo"
    ) || demoCustomers[3]; // 默认李雪梅 DEMO-C0004
    const kyc = demoKYC.find((k) => k.customerId === customer.customerId)!;

    dispatch({
      type: "SET_CUSTOMER",
      payload: { customer, kyc },
    });
    router.push("/welcome");
  };

  return (
    <div className="mx-auto px-8 py-10" style={{ maxWidth: 1100 }}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-[var(--line)] border border-[var(--line)]">
        {/* 左 — 品牌区 */}
        <div className="bg-[var(--brand-red)] text-white p-12" style={{ backgroundImage: "linear-gradient(135deg, var(--brand-red) 0%, var(--brand-red-dark) 100%)" }}>
          <div className="text-xs tracking-[0.16em] mb-4 text-white/70">ICBC PRIVATE WEALTH</div>
          <h1 className="text-3xl font-semibold leading-tight mb-3">
            中国工商银行<br/>财富规划服务
          </h1>
          <div className="w-12 h-px bg-[var(--brand-gold)] mb-6" />
          <p className="text-sm leading-loose text-white/80 mb-8">
            依托工商银行集团投研体系，结合您的财务状况、风险偏好与生活目标，提供专业的资产配置与长期财富陪伴。
          </p>

          <div className="space-y-3 mt-10">
            {[
              "KYC 客户画像 · 风险偏好识别",
              "资产配置 · 科学的金字塔模型",
              "1500+ 产品遴选 · 内部评级体系",
              "行长级签字 · 人工合规复核",
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 border border-[var(--brand-gold)] text-[var(--brand-gold)] flex items-center justify-center text-xs">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-white/90">{t}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-6 border-t border-white/10 text-[11px] text-white/50 leading-relaxed">
            本服务面向工商银行私人银行签约客户开放。新用户请联系您的专属财富顾问完成 KYC 建档。
          </div>
        </div>

        {/* 右 — 登录区 */}
        <div className="bg-white p-12">
          <div className="text-xs tracking-[0.16em] text-[var(--ink-3)] mb-2">SECURE LOGIN</div>
          <h2 className="text-2xl text-[var(--ink)] font-semibold mb-1">用户登录</h2>
          <p className="text-xs text-[var(--ink-3)] mb-8">请使用您的手机银行账号或财富顾问下发的邀请码登录</p>

          <div className="space-y-5">
            <div>
              <label className="label">账号</label>
              <input className="input" placeholder="请输入手机号或账号" value={user} onChange={(e) => setUser(e.target.value)} />
            </div>
            <div>
              <label className="label">登录密码</label>
              <div className="input-group">
                <input type="password" placeholder="请输入登录密码" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-[var(--ink-2)]">
                <input type="checkbox" className="accent-[var(--brand-red)]" defaultChecked />
                <span>记住账号</span>
              </label>
              <Link href="#" className="text-[var(--brand-red)] hover:underline">忘记密码?</Link>
            </div>

            <label className="flex items-start gap-2 text-xs text-[var(--ink-2)] cursor-pointer p-3 border border-[var(--line)]">
              <input type="checkbox" checked={cert} onChange={(e) => setCert(e.target.checked)} className="accent-[var(--brand-red)] mt-0.5" />
              <span className="leading-relaxed">我已阅读并同意《<Link href="#" className="text-[var(--brand-red)]">财富规划服务协议</Link>》《<Link href="#" className="text-[var(--brand-red)]">风险揭示书</Link>》并确认投资风险自担。</span>
            </label>

            <button onClick={handleLogin} className="btn btn-primary btn-block btn-lg">
              登 录
            </button>

            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-[var(--ink-3)]">首次使用?</span>
              <Link
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleLogin();
                }}
                className="text-[var(--brand-red)]"
              >
                直接进入演示 →
              </Link>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-[var(--line)] grid grid-cols-3 gap-4 text-center text-[11px] text-[var(--ink-3)]">
            <div>
              <div className="font-mono text-[var(--brand-red)] text-base mb-1">95588</div>
              <div>客服热线</div>
            </div>
            <div>
              <div className="text-[var(--brand-gold-deep)] text-base mb-1 font-mono">24h</div>
              <div>全天候响应</div>
            </div>
            <div>
              <div className="text-[var(--ink)] text-base mb-1 font-mono">IPv6</div>
              <div>安全连接</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between text-[11px] text-[var(--ink-3)]">
        <div className="flex items-center gap-2">
          <span className="inline-block w-1 h-1 bg-[var(--brand-red)]"></span>
          <span>本系统采用金融级数据加密，全程监控交易安全</span>
        </div>
        <div className="flex items-center gap-3 font-mono">
          <span>京ICP备 10003424 号</span>
          <span>·</span>
          <span>金融许可证</span>
        </div>
      </div>
    </div>
  );
}