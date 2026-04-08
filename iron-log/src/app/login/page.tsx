import { LoginForm } from "./LoginForm";

export const metadata = { title: "Entrar · Felippe's Log" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <header className="mb-10">
          <p className="label mb-2">Acesso privado</p>
          <h1 className="display text-[40px] leading-[1.05]">
            Felippe&apos;s
            <br />
            Log
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-4 leading-relaxed">
            Esta instância é pessoal. Informe a senha para continuar.
          </p>
        </header>

        <LoginForm next={next} />
      </div>
    </div>
  );
}
