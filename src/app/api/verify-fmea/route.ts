import { NextResponse } from 'next/server';
import { runAllRules } from '@/lib/fmea-rules';
import { parseJsonWithBigInt } from '@/lib/bigint-utils';
import type { FmeaApiResponse, ApiResponseType } from '@/types/fmea';
import type { RuleResult } from '@/lib/fmea-rules';

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

    let parsedData: FmeaApiResponse;
    try {
      parsedData = parseJsonWithBigInt(fmeaJson);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid FMEA JSON data provided', details: (e as Error).message },
        { status: 400 }
      );
    }
    
    const results: RuleResult[] = runAllRules(parsedData, fmeaType as ApiResponseType);
    
    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('Error in /api/verify-fmea:', error);
    return NextResponse.json(
      { error: 'An internal server error occurred.', details: (error as Error).message },
      { status: 500 }
    );
  }
}
