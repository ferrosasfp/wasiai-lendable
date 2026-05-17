import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';
import { BrandMark, Wordmark } from '@/components/BrandIcon';

export const metadata = { title: 'Iniciar sesión · Cobraya' };

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center w-full max-w-sm gap-4">
      {/* Judge credentials banner — pre-created demo account for hackathon evaluators */}
      <div className="w-full bg-luma-100 border-2 border-luma-600 rounded-2xl p-4">
        <div className="mono text-[10px] uppercase tracking-widest text-luma-600 mb-2">
          ★ ¿Sos juez del hackathon?
        </div>
        <div className="text-sm text-luma-700 font-medium leading-snug mb-3">
          Usá estas credenciales para entrar al app completo:
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
        <h1 className="h1-serif text-luma-700 mb-2">Bienvenida de vuelta</h1>
        <p className="text-sm text-luma-450 mb-6">
          Ingresa para seguir negociando tus facturas.
        </p>
        <LoginForm />
        <p className="text-sm text-luma-450 mt-6 text-center">
          ¿Sin cuenta?{' '}
          <Link href="/signup" className="text-luma-600 underline underline-offset-2">
            Crear una
          </Link>
        </p>
      </div>
    </div>
  );
}
