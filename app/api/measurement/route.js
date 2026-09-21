import { sql } from '@/lib/db';
import { ingestBrowserMeasurement } from '@/lib/operations/browser-ingest';

export async function POST(request) { return ingestBrowserMeasurement(request, sql); }
