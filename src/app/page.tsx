import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto px-8 py-16 max-w-5xl text-center">
      <div className="icbc-topbar-strip w-24 mx-auto mb-12" />
      <div className="text-xs text-[var(--ink-3)] tracking-[0.32em] mb-4">INDUSTRIAL AND COMMERCIAL BANK OF CHINA</div>
      <h1 className="text-5xl font-bold text-[var(--brand-red)] tracking-wider mb-3" style={{ fontFamily: "var(--font-sans)" }}>
        中国工商银行
      </h1>
      <div className="text-base text-[var(--ink-2)] tracking-[0.16em] mb-10">财 富 规 划 服 务</div>
      <div className="inline-block w-24 h-px bg-[var(--brand-gold)] mb-10" />

      <p className="text-sm text-[var(--ink-2)] leading-loose max-w-xl mx-auto mb-12">
        基于您的风险承受能力与人生目标，依托工商银行专业投研体系，为您提供覆盖资产配置、产品遴选、传承规划的综合性财富顾问服务。
      </p>

      <Link href="/login" className="btn btn-primary btn-lg inline-flex">
        登录财富规划系统
      </Link>

      <div className="grid grid-cols-3 gap-px bg-[var(--line)] border border-[var(--line)] mt-16 max-w-3xl mx-auto">
        {[
          { t: "01", h: "了解客户", d: "风险偏好与生命周期" },
          { t: "02", h: "方案设计", d: "科学的资产配置模型" },
          { t: "03", h: "陪伴执行", d: "动态再平衡与长期守护" },
        ].map((s) => (
          <div key={s.t} className="bg-white p-6 text-left">
            <div className="text-xs text-[var(--brand-red)] tracking-[0.16em] mb-2">{s.t}</div>
            <div className="text-base text-[var(--ink)] font-medium mb-1">{s.h}</div>
            <div className="text-xs text-[var(--ink-3)]">{s.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}