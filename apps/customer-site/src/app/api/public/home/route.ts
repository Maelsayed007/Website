import { NextResponse } from 'next/server';
import { fetchPublicHomeData } from '@/lib/storefront/server';

export const revalidate = 180;

export async function GET() {
  try {
    const data = await fetchPublicHomeData();
    return NextResponse.json(
      { data },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=900',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load public home data' },
      { status: 500 }
    );
  }
}
