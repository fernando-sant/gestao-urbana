// src/app/page.tsx
import Link from 'next/link'

export default function Home() {
  return (
    <main className="max-w-md mx-auto p-6 pt-16 min-h-screen">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold mb-2">Gestão Urbana</h1>
        <p className="text-gray-500 text-sm">
          Registre problemas na sua cidade e acompanhe o atendimento.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Link href="/registrar"
          className="flex items-center gap-3 p-4 border rounded-xl hover:bg-gray-50 transition">
          <span className="text-2xl">📋</span>
          <div>
            <p className="font-medium">Registrar ocorrência</p>
            <p className="text-sm text-gray-500">Informe um problema urbano</p>
          </div>
        </Link>

        <Link href="/mapa"
          className="flex items-center gap-3 p-4 border rounded-xl hover:bg-gray-50 transition">
          <span className="text-2xl">🗺️</span>
          <div>
            <p className="font-medium">Mapa de ocorrências</p>
            <p className="text-sm text-gray-500">Veja os problemas da cidade</p>
          </div>
        </Link>

        <Link href="/minhas-solicitacoes"
          className="flex items-center gap-3 p-4 border rounded-xl hover:bg-gray-50 transition">
          <span className="text-2xl">📂</span>
          <div>
            <p className="font-medium">Minhas solicitações</p>
            <p className="text-sm text-gray-500">Acompanhe seus registros</p>
          </div>
        </Link>

        <Link href="/login"
          className="flex items-center gap-3 p-4 border rounded-xl hover:bg-gray-50 transition">
          <span className="text-2xl">👤</span>
          <div>
            <p className="font-medium">Entrar</p>
            <p className="text-sm text-gray-500">Acesse sua conta</p>
          </div>
        </Link>
      </div>
    </main>
  )
}