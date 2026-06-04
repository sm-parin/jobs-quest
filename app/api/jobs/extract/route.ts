import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface ExtractInput {
  text?: string;
  url?: string;
}

interface Confidence {
  company: 'high' | 'low' | null;
  role: 'high' | 'low' | null;
  location: 'high' | 'low' | null;
  salary: 'high' | 'low' | null;
}

/** Strip HTML tags and clean up whitespace from a raw HTML string. */
function stripHtml(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text;
}

/** Extract <title> tag value from HTML. */
function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

function extractCompany(text: string, title: string | null): { value: string | null; confidence: 'high' | 'low' | null } {
  const labeled = [
    /(?:About|At|Join)\s+([A-Z][A-Za-z0-9 &,'-]{1,60}?)(?:\s*[–—\-]|\s*\.|$)/m,
    /([A-Z][A-Za-z0-9 &,'-]{1,60}?)\s+is\s+(?:hiring|looking|seeking)/i,
    /Company(?:\s+Name)?:\s*([^\n,]{2,80})/i,
    /Employer:\s*([^\n,]{2,80})/i,
  ];
  for (const re of labeled) {
    const m = text.match(re);
    if (m?.[1]) return { value: m[1].trim(), confidence: 'high' };
  }
  if (title) {
    const atMatch = title.match(/\bat\s+([A-Z][A-Za-z0-9 &,'-]{1,60}?)(?:\s*[|–—\-]|$)/i);
    if (atMatch?.[1]) return { value: atMatch[1].trim(), confidence: 'low' };
    const dashMatch = title.match(/^([A-Z][A-Za-z0-9 &,'-]{1,60}?)\s*[–—|]\s*/);
    if (dashMatch?.[1]) return { value: dashMatch[1].trim(), confidence: 'low' };
  }
  return { value: null, confidence: null };
}

function extractRole(text: string, title: string | null): { value: string | null; confidence: 'high' | 'low' | null } {
  const labeled = [
    /(?:Job\s+)?Title:\s*([^\n]{3,100})/i,
    /Role:\s*([^\n]{3,100})/i,
    /Position:\s*([^\n]{3,100})/i,
    /Opening:\s*([^\n]{3,100})/i,
  ];
  for (const re of labeled) {
    const m = text.match(re);
    if (m?.[1]) return { value: m[1].trim(), confidence: 'high' };
  }
  const roleRe = /\b((?:Senior|Junior|Lead|Principal|Staff|Mid|Associate|Founding)\s+)?([A-Z][a-z]+ )?(?:Software|Frontend|Backend|Full[- ]?Stack|Data|ML|AI|DevOps|Platform|Site Reliability|Product|UX|UI|Design|Marketing|Sales|Customer|Talent|Recruiting|Finance|Legal|Operations|Growth|Analytics|Mobile|iOS|Android|Cloud|Security)\s+(?:Engineer|Developer|Designer|Manager|Director|Analyst|Lead|Architect|Scientist|Researcher|Specialist|Consultant|Coordinator|Associate|Recruiter|Advisor|Executive|Officer|Intern)\b/i;
  const roleMatch = text.match(roleRe);
  if (roleMatch) return { value: roleMatch[0].trim(), confidence: 'low' };
  if (title) {
    const atMatch = title.match(/^([^|–—\-]+?)\s+(?:at\s+|[|–—])/i);
    if (atMatch?.[1]) return { value: atMatch[1].trim(), confidence: 'low' };
  }
  return { value: null, confidence: null };
}

function extractLocation(text: string): { value: string | null; confidence: 'high' | 'low' | null } {
  const labeled = [
    /Location:\s*([^\n]{2,100})/i,
    /Based\s+in:\s*([^\n]{2,100})/i,
    /Office(?:\s+Location)?:\s*([^\n]{2,100})/i,
    /Work(?:place)?\s+(?:Location|Type):\s*([^\n]{2,100})/i,
  ];
  for (const re of labeled) {
    const m = text.match(re);
    if (m?.[1]) return { value: m[1].trim().replace(/\s+/g, ' '), confidence: 'high' };
  }
  const remoteRe = /\b(Remote(?:\s+\/\s*Hybrid)?|Fully\s+Remote|Work\s+from\s+Home|WFH|Hybrid(?:\s+\(\d+\s+days?\s+(?:in|on-?site)\))?)\b/i;
  const rm = text.match(remoteRe);
  if (rm) return { value: rm[0].trim(), confidence: 'low' };
  const cityRe = /\b([A-Z][a-z]{2,},\s*(?:[A-Z]{2}|[A-Z][a-z]{3,}))\b/;
  const cm = text.match(cityRe);
  if (cm) return { value: cm[1].trim(), confidence: 'low' };
  return { value: null, confidence: null };
}

function extractSalary(text: string): { value: string | null; confidence: 'high' | 'low' | null } {
  const labeled = [
    /(?:Salary|Compensation|CTC|Package|Pay(?:scale)?|Range):\s*([^\n]{2,80})/i,
  ];
  for (const re of labeled) {
    const m = text.match(re);
    if (m?.[1]) return { value: m[1].trim(), confidence: 'high' };
  }
  const currencyPatterns = [
    /\$\d[\d,]*(?:\s*[–—-]\s*\$?\d[\d,]*)?(?:k|K)?(?:\s*(?:per\s+year|\/yr|annually|PA))?/,
    /£\d[\d,]*(?:\s*[–—-]\s*£?\d[\d,]*)?(?:k|K)?/,
    /€\d[\d,]*(?:\s*[–—-]\s*€?\d[\d,]*)?(?:k|K)?/,
    /₹\s*\d[\d,]*(?:\s*[–—-]\s*₹?\s*\d[\d,]*)?(?:\s*(?:LPA|lpa|lakhs?|L))?/,
    /\d+(?:\.\d+)?\s*[–—-]\s*\d+(?:\.\d+)?\s*LPA\b/i,
    /USD\s*\d[\d,]+(?:\s*[–—-]\s*\d[\d,]+)?/i,
  ];
  for (const re of currencyPatterns) {
    const m = text.match(re);
    if (m) return { value: m[0].trim(), confidence: 'low' };
  }
  return { value: null, confidence: null };
}

/** Block SSRF: only allow public HTTPS URLs (no private IPs, localhost, or link-local). */
function isSafeUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, ''); // strip IPv6 brackets
  if (host === 'localhost' || host === '0.0.0.0' || host === '::1') return false;
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a === 127 ||
      (a === 169 && b === 254) ||
      a === 0 ||
      (a === 100 && b >= 64 && b <= 127)
    ) return false;
  }
  return true;
}

/** POST /api/jobs/extract — extract job details from text or URL */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!request.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 });
  }
  const body = await request.json().catch(() => null) as ExtractInput | null;
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

  const hasText = typeof body.text === 'string' && body.text.trim().length > 0;
  const hasUrl = typeof body.url === 'string' && body.url.trim().length > 0;

  if (!hasText && !hasUrl) {
    return NextResponse.json({ error: 'Provide either text or url' }, { status: 400 });
  }
  if (hasText && hasUrl) {
    return NextResponse.json({ error: 'Provide either text or url, not both' }, { status: 400 });
  }
  if (hasText && body.text!.length > 100_000) {
    return NextResponse.json({ error: 'Text input too large' }, { status: 400 });
  }

  let rawText: string;
  let htmlTitle: string | null = null;

  if (hasUrl) {
    if (!isSafeUrl(body.url!)) {
      return NextResponse.json(
        { error: 'Invalid or disallowed URL.' },
        { status: 400 },
      );
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let response: Response;
    try {
      response = await fetch(body.url!, { signal: controller.signal, redirect: 'error' });
    } catch {
      clearTimeout(timeout);
      return NextResponse.json(
        { error: 'Could not fetch the URL. Try pasting the job description text instead.' },
        { status: 400 },
      );
    }
    clearTimeout(timeout);
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Could not fetch the URL. Try pasting the job description text instead.' },
        { status: 400 },
      );
    }
    const html = await response.text();
    htmlTitle = extractTitle(html);
    rawText = stripHtml(html);
  } else {
    rawText = body.text!;
  }

  if (rawText.length < 200) {
    return NextResponse.json(
      { error: 'Page content too short to extract job details.' },
      { status: 400 },
    );
  }

  const company = extractCompany(rawText, htmlTitle);
  const role = extractRole(rawText, htmlTitle);
  const location = extractLocation(rawText);
  const salary = extractSalary(rawText);

  return NextResponse.json({
    data: {
      company: company.value,
      role: role.value,
      location: location.value,
      salary: salary.value,
      confidence: {
        company: company.confidence,
        role: role.confidence,
        location: location.confidence,
        salary: salary.confidence,
      } satisfies Confidence,
    },
  });
}
