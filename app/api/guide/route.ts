export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '../../../src/lib/prisma';
import { DEFAULT_GUIDE_SECTIONS, GuideSection } from '../../../src/lib/guideData';

/**
 * GET /api/guide
 * 返回教程章节内容。优先使用管理员在 SystemConfig 中保存的覆盖内容，
 * 未配置的章节回退到代码内的默认模板。
 */
export async function GET() {
  try {
    const configs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: 'guide_section_' } },
    });

    const overrideMap: Record<string, GuideSection> = {};
    for (const config of configs) {
      try {
        overrideMap[config.key] = JSON.parse(config.value) as GuideSection;
      } catch {
        // 忽略格式错误的记录
      }
    }

    const sections = DEFAULT_GUIDE_SECTIONS.map((section) => {
      const key = `guide_section_${section.id}`;
      return overrideMap[key] ?? section;
    });

    return NextResponse.json({ sections });
  } catch {
    // DB 不可用时返回默认内容，保证页面不崩溃
    return NextResponse.json({ sections: DEFAULT_GUIDE_SECTIONS });
  }
}
