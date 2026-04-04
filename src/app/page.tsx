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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Container Principal Adaptável */}
      <div className="max-w-6xl mx-auto p-6 md:p-12 lg:pt-20">
        
        {/* Header com User Profile */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
              Gestão Urbana <span className="text-blue-600 italic">🏙️</span>
            </h1>
            <p className="text-slate-500 text-lg max-w-md">
              {user 
                ? `Olá, ${user.user_metadata?.full_name || 'Cidadão'}! Como podemos ajudar sua rua hoje?`
                : "Transforme sua cidade relatando problemas em tempo real."}
            </p>
          </div>

          {user && (
            <div className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
              <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                {user.email?.[0].toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-700 truncate max-w-[150px]">{user.email}</span>
                <button onClick={handleLogout} className="text-xs text-red-500 hover:underline text-left">Sair da conta</button>
              </div>
            </div>
          )}
        </header>

        {/* Grid de Ações Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card: Mapa (Sempre visível) */}
          <Link href="/mapa"
            className="group flex flex-col p-8 bg-white border border-slate-200 rounded-[2rem] hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300">
            <span className="text-5xl mb-6 group-hover:scale-110 transition-transform">🗺️</span>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Mapa da Cidade</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Visualize ocorrências em tempo real e áreas em manutenção.</p>
            <div className="mt-6 text-blue-600 font-semibold text-sm inline-flex items-center group-hover:translate-x-2 transition-transform">
              Explorar mapa →
            </div>
          </Link>

          {user ? (
            <>
              {/* Card: Registrar (Destaque) */}
              <Link href="/registrar"
                className="group flex flex-col p-8 bg-blue-600 border border-blue-700 rounded-[2rem] hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-700/30 transition-all duration-300">
                <span className="text-5xl mb-6 group-hover:scale-110 transition-transform">📝</span>
                <h3 className="text-xl font-bold text-white mb-2">Novo Registro</h3>
                <p className="text-blue-100 text-sm leading-relaxed">Viu um buraco, falta de luz ou lixo? Informe a prefeitura agora.</p>
                <div className="mt-6 text-white font-semibold text-sm">
                  Iniciar abertura →
                </div>
              </Link>

              {/* Card: Minhas Solicitações */}
              <Link href="/solicitacao"
                className="group flex flex-col p-8 bg-white border border-slate-200 rounded-[2rem] hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300">
                <span className="text-5xl mb-6 group-hover:scale-110 transition-transform">📂</span>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Meus Chamados</h3>
                <p className="text-slate-500 text-sm leading-relaxed">Acompanhe o status e o histórico de atendimento dos seus pedidos.</p>
                <div className="mt-6 text-blue-600 font-semibold text-sm">Ver histórico →</div>
              </Link>
            </>
          ) : (
            /* Card de Login/CTA quando deslogado */
            <div className="md:col-span-2 lg:col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-[2rem] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-4 text-center md:text-left">
                <h3 className="text-2xl font-bold text-blue-900">Faça parte da mudança</h3>
                <p className="text-blue-700/70 max-w-sm">Crie uma conta para registrar ocorrências e receber notificações sobre a sua rua.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                <Link href="/login"
                  className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 text-center transition-all">
                  Entrar
                </Link>
                <Link href="/cadastro"
                  className="px-8 py-4 bg-white text-blue-600 border border-blue-200 rounded-2xl font-bold hover:bg-blue-50 text-center transition-all">
                  Criar conta
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer Admin Shortcut */}
        {user?.email === 'seu-email-admin@gmail.com' && (
           <div className="mt-16 flex justify-center">
             <Link href="/admin" className="inline-flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-full text-xs font-bold hover:bg-slate-800 transition-colors uppercase tracking-widest">
               🛠️ Painel do Gestor
             </Link>
           </div>
        )}
      </div>
    </main>
  )
}