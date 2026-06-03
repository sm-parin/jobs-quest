import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Handles OAuth + magic-link + password-reset callbacks.
 * Supabase redirects here with ?code=... after the user authenticates.
 * We exchange the code for a session then redirect to the appropriate page.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // On failure redirect to login with an error indicator
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
