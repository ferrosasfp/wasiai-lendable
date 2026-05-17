import Link from 'next/link';
import { SignupForm } from '@/components/auth/signup-form';
import { BrandMark, Wordmark } from '@/components/BrandIcon';

export const metadata = { title: 'Crear cuenta · Cobraya' };

export default function SignupPage() {
  return (
    <div className="flex flex-col items-center w-full max-w-sm gap-4">
      {/* Judge credentials banner — pre-created demo account for hackathon evaluators */}
      <div className="w-full bg-luma-100 border-2 border-luma-600 rounded-2xl p-4">
        <div className="mono text-[10px] uppercase tracking-widest text-luma-600 mb-2">
          ★ ¿Sos juez del hackathon?
        </div>
        <div className="text-sm text-luma-700 font-medium leading-snug mb-3">
          No necesitás crear cuenta. Usá estas credenciales en{' '}
          <Link
            href="/login"
            className="text-luma-600 underline underline-offset-2"
          >
            /login
          </Link>
          :
        </div>
        <div className="bg-luma-50 border border-luma-200 rounded-lg p-3 mono text-xs text-luma-700 space-y-1">
          <div>
            <span className="text-luma-450">email:</span>{' '}
            <span className="font-semibold select-all">juez@cobraya.mx</span>
          </div>
          <div>
            <span className="text-luma-450">password:</span>{' '}
            <span className="font-semibold select-all">cobraya2026</span>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Link
            href="/demo"
            className="mono text-[11px] uppercase tracking-widest text-luma-600 underline underline-offset-2"
          >
            o probá el demo público sin login →
          </Link>
        </div>
      </div>

      <div className="auth-card w-full">
        <div className="flex flex-col items-center mb-6">
          <BrandMark className="w-14 h-14 text-luma-600 mb-3" />
          <Wordmark className="text-3xl text-luma-700" />
        </div>
        <h1 className="h1-serif text-luma-700 mb-2">Crea tu cuenta</h1>
        <p className="text-sm text-luma-450 mb-6">
          Tu factura líquida en 30 segundos. Sin trámites.
        </p>
        <SignupForm />
        <p className="text-sm text-luma-450 mt-6 text-center">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-luma-600 underline underline-offset-2">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
