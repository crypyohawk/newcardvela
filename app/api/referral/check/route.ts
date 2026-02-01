import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ valid: false });
    }

    const referrer = await prisma.user.findFirst({
      where: { referralCode: code },
      select: { id: true, username: true }
    });

    if (!referrer) {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({
      valid: true,
      referrerName: referrer.username
    });
  } catch (error) {
    return NextResponse.json({ valid: false });
  }
}
