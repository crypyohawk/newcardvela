'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DEFAULT_GUIDE_SECTIONS, GuideSection, GuideStep } from '../../../src/lib/guideData';

// ── 工具函数：lines ↔ array ─────────────────────────────────────────
const toLines = (arr?: string[]) => (arr ?? []).join('\n');
const fromLines = (text: string): string[] =>
  text.split('\n').map((s) => s.trim()).filter(Boolean);

// links 格式：每行 "显示文字|URL"
const linksToText = (links?: { text: string; url: string }[]) =>
  (links ?? []).map((l) => `${l.text}|${l.url}`).join('\n');
const textToLinks = (text: string) =>
  text.split('\n').map((line) => {
    const [t, u] = line.split('|');
    return { text: (t ?? '').trim(), url: (u ?? '').trim() };
  }).filter((l) => l.text && l.url);

// ── 空步骤模板 ──────────────────────────────────────────────────────
const emptyStep = (): GuideStep => ({
  title: '',
  icon: '',
  content: '',
  materials: [],
  links: [],
  tips: [],
  warning: '',
});

// ── 步骤编辑表单 ────────────────────────────────────────────────────
function StepEditor({
  step,
  index,
  onChange,
  onRemove,
}: {
  step: GuideStep;
  index: number;
  onChange: (s: GuideStep) => void;
  onRemove: () => void;
}) {
  const up = (patch: Partial<GuideStep>) => onChange({ ...step, ...patch });

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-300">步骤 {index + 1}</span>
        <button
          onClick={onRemove}
          className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition"
        >
          删除此步骤
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs text-slate-400 mb-1">步骤标题 *</label>
          <input
            value={step.title}
            onChange={(e) => up({ title: e.target.value })}
            placeholder="如：第一步：准备材料清单"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">步骤图标（emoji）</label>
          <input
            value={step.icon ?? ''}
            onChange={(e) => up({ icon: e.target.value })}
            placeholder="如：📋 💳 📝"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">主要说明文字 *</label>
        <textarea
          value={step.content}
          onChange={(e) => up({ content: e.target.value })}
          rows={3}
          placeholder="对这一步的描述性文字，向用户说明要做什么..."
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm resize-y"
        />
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">
          📋 材料清单 / 填写规范
          <span className="text-slate-600 ml-1">（每行一项，显示为有序列表）</span>
        </label>
        <textarea
          value={toLines(step.materials)}
          onChange={(e) => up({ materials: fromLines(e.target.value) })}
          rows={4}
          placeholder={'① Gmail 邮箱\n② 美区 VPN 节点\n③ 本平台虚拟卡\n④ 卡内余额 ≥ $22'}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm resize-y font-mono"
        />
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">
          🔗 可点击链接
          <span className="text-slate-600 ml-1">（每行格式：显示文字|完整URL，如 访问官网|https://chat.openai.com）</span>
        </label>
        <textarea
          value={linksToText(step.links)}
          onChange={(e) => up({ links: textToLinks(e.target.value) })}
          rows={2}
          placeholder={'ChatGPT 官网|https://chat.openai.com\n接码平台|https://sms-activate.org'}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm resize-y font-mono"
        />
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">
          💡 注意事项 / 小技巧
          <span className="text-slate-600 ml-1">（每行一条，显示为绿色 ✓ 列表）</span>
        </label>
        <textarea
          value={toLines(step.tips)}
          onChange={(e) => up({ tips: fromLines(e.target.value) })}
          rows={3}
          placeholder={'在无痕模式下操作\nVPN 节点与账单地址所在州保持一致\n卡余额建议比订阅金额多 $3～5'}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm resize-y"
        />
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">
          ⚠️ 警告框
          <span className="text-slate-600 ml-1">（红色警告，可留空）</span>
        </label>
        <input
          value={step.warning ?? ''}
          onChange={(e) => up({ warning: e.target.value })}
          placeholder="如：切勿使用共享账号，否则极易被封禁..."
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}

// ── 主页面 ──────────────────────────────────────────────────────────
export default function AdminGuidePage() {
  const [sections, setSections] = useState<GuideSection[]>(DEFAULT_GUIDE_SECTIONS);
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_GUIDE_SECTIONS[0].id);
  const [customizedKeys, setCustomizedKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // 获取 token
  const getToken = () =>
    typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';

  // 加载已保存的配置
  useEffect(() => {
    const token = getToken();
    fetch('/api/admin/config', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.configs) return;
        const keys = new Set<string>();
        const merged = DEFAULT_GUIDE_SECTIONS.map((sec) => {
          const key = `guide_section_${sec.id}`;
          if (data.configs[key]) {
            try {
              const override = JSON.parse(data.configs[key]) as GuideSection;
              keys.add(key);
              return override;
            } catch {}
          }
          return sec;
        });
        setSections(merged);
        setCustomizedKeys(keys);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const currentSection = sections.find((s) => s.id === selectedId) ?? sections[0];
  const currentIdx = sections.findIndex((s) => s.id === selectedId);

  // 更新当前 section 的字段
  const updateSection = (patch: Partial<GuideSection>) => {
    setSections((prev) =>
      prev.map((s) => (s.id === selectedId ? { ...s, ...patch } : s))
    );
  };

  // 更新某个 step
  const updateStep = (idx: number, step: GuideStep) => {
    const steps = [...currentSection.steps];
    steps[idx] = step;
    updateSection({ steps });
  };

  // 添加步骤
  const addStep = () => {
    updateSection({ steps: [...currentSection.steps, emptyStep()] });
  };

  // 删除步骤
  const removeStep = (idx: number) => {
    updateSection({ steps: currentSection.steps.filter((_, i) => i !== idx) });
  };

  // 恢复默认内容
  const resetToDefault = () => {
    const def = DEFAULT_GUIDE_SECTIONS.find((s) => s.id === selectedId);
    if (def) {
      setSections((prev) => prev.map((s) => (s.id === selectedId ? { ...def } : s)));
    }
  };

  // 保存当前章节
  const saveSection = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const token = getToken();
      const key = `guide_section_${selectedId}`;
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key, value: JSON.stringify(currentSection) }),
      });
      if (res.ok) {
        setCustomizedKeys((prev) => new Set([...prev, key]));
        setMessage({ type: 'success', text: `「${currentSection.title}」章节已保存！用户端将立即更新。` });
      } else {
        setMessage({ type: 'error', text: '保存失败，请检查是否已登录管理员账号' });
      }
    } catch {
      setMessage({ type: 'error', text: '保存失败，请检查网络连接' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-slate-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* 导航 */}
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-400 hover:text-white text-sm transition-colors">
              ← 管理后台
            </Link>
            <span className="text-gray-600">|</span>
            <h1 className="text-lg font-bold">📖 教程内容管理</h1>
          </div>
          <div className="flex gap-4 text-sm">
            <a href="/guide" target="_blank" className="text-gray-400 hover:text-white transition-colors">
              预览教程页 ↗
            </a>
            <Link href="/admin/settings" className="text-gray-400 hover:text-white transition-colors">
              系统设置
            </Link>
          </div>
        </div>
      </nav>

      {/* 说明横幅 */}
      <div className="bg-blue-900/30 border-b border-blue-800/50 px-4 py-3">
        <p className="max-w-7xl mx-auto text-sm text-blue-300">
          💡 在此页面编辑每个教程章节的内容。点击左侧章节名称切换编辑，填写后点击「保存此章节」即可在用户端生效。未保存的章节将显示内置默认模板内容。
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl border ${
              message.type === 'success'
                ? 'bg-emerald-900/30 border-emerald-700 text-emerald-300'
                : 'bg-red-900/30 border-red-700 text-red-300'
            }`}
          >
            {message.type === 'success' ? '✅ ' : '❌ '}{message.text}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* 左侧章节列表 */}
          <aside className="lg:w-56 shrink-0">
            <div className="lg:sticky lg:top-6 space-y-1">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 px-2">章节列表</p>
              {sections.map((section) => {
                const key = `guide_section_${section.id}`;
                const isCustomized = customizedKeys.has(key);
                return (
                  <button
                    key={section.id}
                    onClick={() => setSelectedId(section.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition flex items-center gap-2 ${
                      selectedId === section.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    <span>{section.icon}</span>
                    <span className="flex-1 text-sm truncate">{section.title}</span>
                    {isCustomized && (
                      <span className="shrink-0 w-2 h-2 rounded-full bg-emerald-400" title="已自定义" />
                    )}
                  </button>
                );
              })}
              <div className="pt-4 px-2 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  已保存自定义内容
                </span>
              </div>
            </div>
          </aside>

          {/* 右侧编辑区 */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* 章节基本信息 */}
            <div className="bg-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span>{currentSection.icon}</span>
                  <span>编辑章节：{currentSection.title}</span>
                  {customizedKeys.has(`guide_section_${selectedId}`) && (
                    <span className="text-xs bg-emerald-600/30 text-emerald-400 border border-emerald-700/50 rounded px-2 py-0.5">
                      已自定义
                    </span>
                  )}
                </h2>
                <button
                  onClick={resetToDefault}
                  className="text-xs text-slate-400 hover:text-slate-200 border border-slate-600 hover:border-slate-500 rounded-lg px-3 py-1.5 transition"
                >
                  恢复默认内容
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">章节标题 *</label>
                  <input
                    value={currentSection.title}
                    onChange={(e) => updateSection({ title: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">副标题（价格/简介）</label>
                  <input
                    value={currentSection.subtitle}
                    onChange={(e) => updateSection({ subtitle: e.target.value })}
                    placeholder="如：OpenAI 出品 · $20/月 · 使用最广泛"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    官方网站 URL
                    <span className="text-slate-600 ml-1">（章节标题区显示「访问官网」按钮）</span>
                  </label>
                  <input
                    value={currentSection.officialUrl ?? ''}
                    onChange={(e) => updateSection({ officialUrl: e.target.value })}
                    placeholder="https://chat.openai.com"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    价格展示文字
                    <span className="text-slate-600 ml-1">（左侧目录下方小字）</span>
                  </label>
                  <input
                    value={currentSection.price ?? ''}
                    onChange={(e) => updateSection({ price: e.target.value })}
                    placeholder="如：$20/月（Plus）"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* 步骤编辑区 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-200">
                  步骤列表
                  <span className="text-slate-500 text-sm ml-2">（共 {currentSection.steps.length} 步）</span>
                </h3>
              </div>

              {currentSection.steps.map((step, idx) => (
                <StepEditor
                  key={`${selectedId}-step-${idx}`}
                  step={step}
                  index={idx}
                  onChange={(s) => updateStep(idx, s)}
                  onRemove={() => removeStep(idx)}
                />
              ))}

              <button
                onClick={addStep}
                className="w-full rounded-xl border-2 border-dashed border-slate-700 hover:border-slate-500 py-3 text-sm text-slate-500 hover:text-slate-300 transition flex items-center justify-center gap-2"
              >
                + 添加步骤
              </button>
            </div>

            {/* 保存按钮 */}
            <div className="bg-slate-800 rounded-2xl p-6 flex items-center justify-between gap-4">
              <div className="text-sm text-slate-400">
                保存后，用户访问 <code className="text-slate-300 bg-slate-700 px-1.5 py-0.5 rounded">/guide</code> 页面时将立即看到更新后的内容。
              </div>
              <button
                onClick={saveSection}
                disabled={saving}
                className="shrink-0 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-2.5 rounded-xl font-medium transition"
              >
                {saving ? '保存中...' : `保存「${currentSection.title}」`}
              </button>
            </div>

            {/* 章节切换 */}
            <div className="flex justify-between items-center pt-2">
              {currentIdx > 0 && (
                <button
                  onClick={() => setSelectedId(sections[currentIdx - 1].id)}
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  ← 上一章：{sections[currentIdx - 1].title}
                </button>
              )}
              {currentIdx < sections.length - 1 && (
                <button
                  onClick={() => setSelectedId(sections[currentIdx + 1].id)}
                  className="text-sm text-slate-400 hover:text-white ml-auto transition-colors"
                >
                  下一章：{sections[currentIdx + 1].title} →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
