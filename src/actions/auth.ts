'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { loginSchema, signupSchema } from '@/lib/validation/auth';
import type { ActionResult } from '@/lib/types/actions';

function mapError(code?: string): string {
  if (code === 'invalid_credentials') return 'Correo o contraseña incorrectos.';
  if (code === 'user_already_exists') return 'Este correo ya está registrado.';
  if (code === 'email_exists') return 'Este correo ya está registrado.';
  return 'No se pudo procesar tu solicitud.';
}

export async function signUp(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  // DD-P: admin.createUser per-user with email_confirm:true delivers LUM-100 UX
  // (instant signup, no email-confirm round-trip) WITHOUT toggling the shared
  // project's `mailer_autoconfirm`. The shared Supabase project (bdwvrwzvsldephfibmuu)
  // hosts wasiai-a2a's auth too — flipping the global flag is not safe.
  //
  // DD-O: `user_metadata.app = 'cobraya'` is the guard the trigger
  // `cobraya_handle_new_user()` checks before INSERTing into `cobraya_profiles`.
  // Without this metadata, the trigger no-ops (other apps on the project keep
  // their own signup flows intact).
  const admin = createAdminClient();
  const { error: createErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { app: 'cobraya' },
  });
  if (createErr) {
    console.warn('[cobraya-action]', { action: 'signUp', errorCode: createErr.code });
    return { error: mapError(createErr.code) };
  }

  // Sign-in with the ANON client so the response gets browser session cookies.
  // The admin client doesn't (and shouldn't) emit user cookies.
  const supabase = createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (signInErr) {
    console.warn('[cobraya-action]', { action: 'signUp:signIn', errorCode: signInErr.code });
    return { error: mapError(signInErr.code) };
  }

  redirect('/onboarding/step/1');
}

export async function signIn(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    console.warn('[cobraya-action]', { action: 'signIn', errorCode: error.code });
    return { error: mapError(error.code) };
  }
  redirect('/dashboard');
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
