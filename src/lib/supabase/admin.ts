// src/lib/supabase/admin.ts
//
// SERVER-ONLY Supabase client using the project's `service_role` key.
//
// This client BYPASSES RLS. It must NEVER be imported by any file that ships
// to the browser bundle. Convention enforced by CD-34: only files under
// `src/actions/` (Server Actions, 'use server') or `src/app/**/route.ts`
// (Route Handlers, server-side) may import this module.
//
// Why this file exists (DD-P): the Supabase project `bdwvrwzvsldephfibmuu`
// is shared with wasiai-a2a (production). Flipping the global
// `mailer_autoconfirm` toggle to enable LUM-100 instant-signup would also
// disable email confirmation for ANY other app on the same project. To
// achieve the same LUM-100 UX *per-user* without touching shared config, we
// call `auth.admin.createUser({ email_confirm: true })` server-side. That
// requires the service_role key — hence this isolated client.
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL not configured');
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_KEY not configured');
  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
