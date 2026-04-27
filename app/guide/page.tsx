'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { DEFAULT_GUIDE_SECTIONS, GuideSection } from '../../src/lib/guideData';

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
                  <span className="text-lg shrink-0">{section.icon}</span>
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
                  <span className="text-4xl">{currentSection.icon}</span>
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
                      <span className="shrink-0 w-8 h-8 rounded-full bg-slate-700 text-slate-300 text-sm font-bold flex items-center justify-center">
                        {step.icon ?? String(index + 1)}
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