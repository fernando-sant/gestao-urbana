'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }
    checkUser()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <main className="max-w-md mx-auto p-6 pt-16 min-h-screen">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2 text-blue-900">Gestão Urbana 🏙️</h1>
        {user ? (
          <p className="text-gray-600 text-sm">
            Bem-vindo(a) de volta! O que deseja fazer hoje?
          </p>
        ) : (
          <p className="text-gray-500 text-sm">
            Registre problemas na sua cidade e acompanhe o atendimento em tempo real.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {/* SEMPRE VISÍVEL: Mapa */}
        <Link href="/mapa"
          className="flex items-center gap-4 p-5 border rounded-2xl hover:bg-gray-50 transition shadow-sm bg-white">
          <span className="text-3xl">🗺️</span>
          <div>
            <p className="font-semibold text-gray-800">Mapa da Cidade</p>
            <p className="text-xs text-gray-500">Veja o que está acontecendo ao redor</p>
          </div>
        </Link>

        {/* LOGADO: Registrar e Minhas Solicitações */}
        {user ? (
          <>
            <Link href="/registrar"
              className="flex items-center gap-4 p-5 border-2 border-blue-100 rounded-2xl hover:bg-blue-50 transition shadow-sm bg-white">
              <span className="text-3xl">📝</span>
              <div>
                <p className="font-semibold text-blue-900">Registrar ocorrência</p>
                <p className="text-xs text-gray-500">Informe um novo problema urbano</p>
              </div>
            </Link>

            <Link href="/solicitacoes"
              className="flex items-center gap-4 p-5 border rounded-2xl hover:bg-gray-50 transition shadow-sm bg-white">
              <span className="text-3xl">📂</span>
              <div>
                <p className="font-semibold text-gray-800">Minhas solicitações</p>
                <p className="text-xs text-gray-500">Acompanhe seus registros e prazos</p>
              </div>
            </Link>

            <button onClick={handleLogout}
              className="mt-4 text-sm text-red-500 font-medium hover:underline">
              Sair da conta
            </button>
          </>
        ) : (
          /* NÃO LOGADO: Incentivo ao Login/Cadastro */
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mt-4">
            <p className="text-sm text-blue-800 mb-4 font-medium text-center">
              Você precisa estar logado para registrar e acompanhar problemas.
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/login"
                className="w-full bg-blue-600 text-white text-center p-3 rounded-xl font-bold hover:bg-blue-700 transition">
                Entrar
              </Link>
              <Link href="/cadastro"
                className="w-full bg-white border border-blue-600 text-blue-600 text-center p-3 rounded-xl font-bold hover:bg-blue-50 transition">
                Criar conta gratuita
              </Link>
            </div>
          </div>
        )}

        {/* ADMIN SHORTCUT (Opcional - só aparece se você for admin) */}
        {user?.email === 'seu-email-admin@gmail.com' && (
           <Link href="/admin" className="mt-8 text-center text-xs text-gray-400 border-t pt-4 italic">
             Acessar Painel de Gestor
           </Link>
        )}
      </div>
    </main>
  )
}