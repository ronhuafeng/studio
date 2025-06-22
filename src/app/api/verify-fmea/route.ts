import { NextResponse } from 'next/server';
import { runAllRules } from '@/lib/fmea-rules';
import type { ApiResponseType } from '@/types/fmea';
import type { RuleGroup } from '@/lib/fmea-rules';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fmeaJson, fmeaType } = body;

    if (!fmeaJson || !fmeaType) {
      return NextResponse.json(
        { error: 'Missing fmeaJson or fmeaType in request body' },
        { status: 400 }
      );
    }

    if (!['requirements', 'dfmea', 'pfmea'].includes(fmeaType)) {
      return NextResponse.json(
        { error: 'Invalid fmeaType. Must be one of: requirements, dfmea, pfmea' },
        { status: 400 }
      );
    }
    
    // runAllRules now expects the raw JSON string and handles parsing internally
    const results: RuleGroup[] = runAllRules(fmeaJson, fmeaType as ApiResponseType);
    
    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('Error in /api/verify-fmea:', error);
    return NextResponse.json(
      { error: 'An internal server error occurred.', details: (error as Error).message },
      { status: 500 }
    );
  }
}
