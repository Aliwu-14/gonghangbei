import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "中国工商银行 · 财富规划 | ICBC Private Wealth",
  description: "中国工商银行财富规划与资产配置服务",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased min-h-screen flex flex-col">
        <AppProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <footer className="bg-[var(--ink)] text-white/60 mt-12 border-t-4 border-[var(--brand-red)]">
            <div className="max-w-7xl mx-auto px-8 py-10">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8 pb-8 border-b border-white/10">
                <div className="col-span-2 md:col-span-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-[var(--brand-gold)] flex items-center justify-center text-[var(--brand-red)] font-bold text-[10px]">ICBC</div>
                    <div className="text-white text-sm tracking-wider">工商银行</div>
                  </div>
                  <div className="text-xs leading-relaxed text-white/40">专业 · 稳健 · 长期</div>
                </div>
                <div>
                  <div className="text-white text-sm mb-3 font-medium">财富服务</div>
                  <div className="space-y-2 text-xs text-white/50">
                    <div className="hover:text-[var(--brand-gold)] cursor-pointer">资产配置规划</div>
                    <div className="hover:text-[var(--brand-gold)] cursor-pointer">退休与传承</div>
                    <div className="hover:text-[var(--brand-gold)] cursor-pointer">全球投资研究</div>
                  </div>
                </div>
                <div>
                  <div className="text-white text-sm mb-3 font-medium">私人银行</div>
                  <div className="space-y-2 text-xs text-white/50">
                    <div className="hover:text-[var(--brand-gold)] cursor-pointer">专属理财产品</div>
                    <div className="hover:text-[var(--brand-gold)] cursor-pointer">家族信托服务</div>
                    <div className="hover:text-[var(--brand-gold)] cursor-pointer">增值权益</div>
                  </div>
                </div>
                <div>
                  <div className="text-white text-sm mb-3 font-medium">客户支持</div>
                  <div className="space-y-2 text-xs text-white/50">
                    <div className="font-mono text-[var(--brand-gold)]">24h 客服 95588</div>
                    <div className="hover:text-[var(--brand-gold)] cursor-pointer">网点预约</div>
                    <div className="hover:text-[var(--brand-gold)] cursor-pointer">风险提示书</div>
                  </div>
                </div>
                <div>
                  <div className="text-white text-sm mb-3 font-medium">信息披露</div>
                  <div className="space-y-2 text-xs text-white/50">
                    <div>基金销售资格证</div>
                    <div>经营证券期货业务许可证</div>
                    <div>金融许可证机构编码</div>
                  </div>
                </div>
              </div>

              <div className="mb-6 pb-6 border-b border-white/10">
                <div className="flex items-start gap-2 text-[11px] text-white/40 leading-relaxed">
                  <span className="inline-block w-1 h-1 mt-1.5 bg-[var(--brand-red)]"></span>
                  <span>投资有风险，理财需谨慎。本财富规划服务基于您的风险承受能力提供资产配置建议，不构成收益承诺，过往业绩不代表未来表现。</span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-white/40 tracking-wider">
                <div className="flex items-center gap-4">
                  <span>© {new Date().getFullYear()} 中国工商银行股份有限公司</span>
                  <span className="text-white/20">|</span>
                  <span>京ICP备 10003424 号</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white/30">本网站支持 IPv6</span>
                  <span className="inline-block w-1.5 h-1.5 bg-[var(--brand-gold)]"></span>
                </div>
              </div>
            </div>
          </footer>
        </AppProvider>
      </body>
    </html>
  );
}