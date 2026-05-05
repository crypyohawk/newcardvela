'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { DEFAULT_GUIDE_SECTIONS, GuideSection } from '../../src/lib/guideData';
import {
  ClipboardList, FileText, DollarSign, CheckCircle, Key, MapPin,
  Lock, Layers, RefreshCw, Settings, ShieldCheck, CreditCard
} from 'lucide-react';

// 品牌 SVG 图标组件
function SectionBrandIcon({ id, size }: { id: string; size: 'sm' | 'lg' }) {
  const sz = size === 'lg' ? 28 : 16;
  switch (id) {
    case 'chatgpt':
      return (
        <svg width={sz} height={sz} viewBox="0 0 24 24" fill="#10a37f">
          <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.911 6.046 6.046 0 0 0-6.51-2.9 6.065 6.065 0 0 0-4.54-2.02 6.046 6.046 0 0 0-5.774 4.193 6.065 6.065 0 0 0-4.031 2.944 6.046 6.046 0 0 0 .747 7.097 5.985 5.985 0 0 0 .511 4.91 6.046 6.046 0 0 0 6.515 2.9 6.065 6.065 0 0 0 4.544 2.019 6.046 6.046 0 0 0 5.773-4.191 6.065 6.065 0 0 0 4.031-2.944 6.046 6.046 0 0 0-.75-7.097zm-9.022 12.608a4.474 4.474 0 0 1-2.876-1.041c.057-.032.162-.089.23-.131l4.779-2.758a.776.776 0 0 0 .392-.679v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.583 4.543zm-9.661-4.125a4.47 4.47 0 0 1-.535-3.014c.057.033.157.096.23.14l4.779 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.032.062l-4.83 2.786a4.504 4.504 0 0 1-6.235-1.696zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.815-3.354 2.02-1.168a.076.076 0 0 1 .071 0l4.83 2.786a4.494 4.494 0 0 1-.677 8.104v-5.677a.79.79 0 0 0-.429-.69zm2.01-3.023c-.057-.033-.157-.096-.23-.14l-4.779-2.758a.776.776 0 0 0-.78 0L9.316 9.197V6.865a.08.08 0 0 1 .032-.062l4.83-2.787a4.504 4.504 0 0 1 6.72 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.504 4.504 0 0 1 7.375-3.453c-.057.032-.162.088-.23.131l-4.779 2.758a.775.775 0 0 0-.393.678zm1.097-2.365l2.602-1.5 2.607 1.498v2.999l-2.597 1.5-2.607-1.498z"/>
        </svg>
      );
    case 'claude':
      // Anthropic Claude — coral asterisk (6-spoke)
      return (
        <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
          <path d="M12 3v18M3 12h18M5.64 5.64l12.72 12.72M18.36 5.64L5.64 18.36" stroke="#DA7756" strokeWidth={size === 'lg' ? 2.2 : 2.5} strokeLinecap="round"/>
        </svg>
      );
    case 'gemini':
      // Google Gemini — 4-pointed elongated diamond star
      return (
        <svg width={sz} height={sz} viewBox="0 0 24 24" fill="#4285F4">
          <path d="M12 2C11.5 7 9.5 10.5 7 12C9.5 13.5 11.5 17 12 22C12.5 17 14.5 13.5 17 12C14.5 10.5 12.5 7 12 2Z"/>
          <path d="M2 12C7 11.5 10.5 9.5 12 7C13.5 9.5 17 11.5 22 12C17 12.5 13.5 14.5 12 17C10.5 14.5 7 12.5 2 12Z" fill="#4285F4" opacity="0.5"/>
        </svg>
      );
    case 'grok':
      // xAI Grok — bold X
      return (
        <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
          <path d="M4.5 4.5L19.5 19.5M19.5 4.5L4.5 19.5" stroke="#E5E7EB" strokeWidth={size === 'lg' ? 2.8 : 3} strokeLinecap="round"/>
        </svg>
      );
    case 'cursor':
      // Cursor IDE — arrow cursor
      return (
        <svg width={sz} height={sz} viewBox="0 0 24 24">
          <path d="M5 3L19.5 11.5L13 13.5L9.5 21L5 3Z" fill="#007AFF" stroke="#339AF0" strokeWidth="0.8" strokeLinejoin="round"/>
        </svg>
      );
    case 'card-tips':
      return (
        <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
          <rect x="2" y="5" width="20" height="14" rx="2.5" stroke="#818cf8" strokeWidth="1.5"/>
          <path d="M2 9.5h20" stroke="#818cf8" strokeWidth="1.5"/>
          <rect x="5" y="13" width="5" height="2.5" rx="1" fill="#818cf8"/>
          <rect x="12" y="13" width="3" height="2.5" rx="1" fill="#818cf8" opacity="0.5"/>
        </svg>
      );
    case 'preparation':
    default:
      return (
        <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
          <path d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
  }
}

// 步骤图标映射（对应 guideData 中 step.icon 字段）
const STEP_ICON: Record<string, React.ReactNode> = {
  '📋': <ClipboardList className="w-4 h-4" strokeWidth={1.5} />,
  '📝': <FileText className="w-4 h-4" strokeWidth={1.5} />,
  '💰': <DollarSign className="w-4 h-4" strokeWidth={1.5} />,
  '💳': <CreditCard className="w-4 h-4" strokeWidth={1.5} />,
  '✅': <CheckCircle className="w-4 h-4" strokeWidth={1.5} />,
  '🔑': <Key className="w-4 h-4" strokeWidth={1.5} />,
  '🏠': <MapPin className="w-4 h-4" strokeWidth={1.5} />,
  '🔐': <Lock className="w-4 h-4" strokeWidth={1.5} />,
  '🃏': <Layers className="w-4 h-4" strokeWidth={1.5} />,
  '🔄': <RefreshCw className="w-4 h-4" strokeWidth={1.5} />,
  '🔧': <Settings className="w-4 h-4" strokeWidth={1.5} />,
  '🔒': <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />,
};

export default function GuidePage() {
  const [sections, setSections] = useState<GuideSection[]>(DEFAULT_GUIDE_SECTIONS);
  const [activeSection, setActiveSection] = useState<string>('preparation');
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/guide')
      .then((r) => r.json())
      .then((data) => {
        if (data.sections?.length) setSections(data.sections);
      })
      .catch(() => {});
  }, []);

  const currentSection = sections.find((s) => s.id === activeSection) ?? sections[0];

  const goPrev = () => {
    const idx = sections.findIndex((s) => s.id === activeSection);
    if (idx > 0) { setActiveSection(sections[idx - 1].id); setExpandedStep(null); }
  };
  const goNext = () => {
    const idx = sections.findIndex((s) => s.id === activeSection);
    if (idx < sections.length - 1) { setActiveSection(sections[idx + 1].id); setExpandedStep(null); }
  };

  const currentIdx = sections.findIndex((s) => s.id === activeSection);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">
              ← 返回工作台
            </Link>
            <span className="text-slate-700">|</span>
            <span className="text-lg font-semibold">📖 海外 AI 订阅教程</span>
          </div>
          <span className="text-xs text-slate-500 hidden sm:block">保姆级图文指南 · 持续更新</span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-60 shrink-0">
            <div className="lg:sticky lg:top-24 space-y-1">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 px-2">教程目录</p>
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => { setActiveSection(section.id); setExpandedStep(null); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition flex items-center gap-2.5 ${
                    activeSection === section.id
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span className="shrink-0">
                    <SectionBrandIcon id={section.id} size="sm" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-tight truncate">{section.title}</div>
                    {section.price && (
                      <div className="text-xs text-slate-500 leading-tight mt-0.5 hidden lg:block">{section.price}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            <div className={`rounded-2xl border bg-gradient-to-br p-6 mb-6 ${currentSection.color}`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center shrink-0">
                    <SectionBrandIcon id={currentSection.id} size="lg" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{currentSection.title}</h1>
                    <p className="text-slate-400 mt-0.5 text-sm">{currentSection.subtitle}</p>
                  </div>
                </div>
                {currentSection.officialUrl && (
                  <a
                    href={currentSection.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 text-sm font-medium transition"
                  >
                    🌐 访问官网 ↗
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {currentSection.steps.map((step, index) => {
                const stepKey = `${activeSection}-${index}`;
                const isExpanded = expandedStep === stepKey || currentSection.steps.length <= 1;

                return (
                  <div key={stepKey} className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                    <button
                      className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-slate-800/40 transition"
                      onClick={() => setExpandedStep(isExpanded && expandedStep === stepKey ? null : stepKey)}
                    >
                      <span className="shrink-0 w-8 h-8 rounded-full bg-slate-700/80 border border-slate-600 text-slate-300 text-xs font-bold flex items-center justify-center">
                        {step.icon && STEP_ICON[step.icon]
                          ? STEP_ICON[step.icon]
                          : String(index + 1)}
                      </span>
                      <span className="font-semibold text-white flex-1">{step.title}</span>
                      <span className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-6 border-t border-slate-800 space-y-4">
                        <p className="text-slate-300 leading-7 mt-4">{step.content}</p>

                        {step.materials && step.materials.length > 0 && (
                          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-3">📋 所需材料 / 填写规范</p>
                            <ol className="space-y-2">
                              {step.materials.map((item, i) => (
                                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-200 leading-relaxed">
                                  <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-slate-600 text-slate-300 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {step.links && step.links.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {step.links.map((link, i) => (
                              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 px-3 py-1.5 text-xs font-medium transition">
                                {link.text} ↗
                              </a>
                            ))}
                          </div>
                        )}

                        {step.warning && (
                          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex gap-2.5">
                            <span className="text-red-400 shrink-0 mt-0.5">⚠️</span>
                            <p className="text-sm text-red-200 leading-relaxed">{step.warning}</p>
                          </div>
                        )}

                        {step.tips && step.tips.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-slate-500 uppercase tracking-wider">💡 注意事项 / 小技巧</p>
                            <ul className="space-y-1.5">
                              {step.tips.map((tip, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-300 leading-relaxed">
                                  <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex justify-between items-center">
              {currentIdx > 0 ? (
                <button onClick={goPrev} className="text-sm text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
                  ← 上一章：{sections[currentIdx - 1].title}
                </button>
              ) : <div />}
              {currentIdx < sections.length - 1 ? (
                <button onClick={goNext} className="rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2.5 text-sm font-medium transition">
                  下一章：{sections[currentIdx + 1].title} →
                </button>
              ) : (
                <Link href="/dashboard" className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-medium transition">
                  去开卡订阅 →
                </Link>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}