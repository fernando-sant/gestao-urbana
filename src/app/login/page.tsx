// src/app/login/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [message, setMessage]   = useState('')
  const supabase = createClient()

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage('Email ou senha incorretos.')
    } else {
      router.push('/')
      router.refresh()
    }
    setLoading(false)
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` }
    })
  }

  return (
    <main className="max-w-sm mx-auto p-6 mt-20">
      <h1 className="text-2xl font-semibold mb-6 text-center">Entrar</h1>

      <button onClick={handleGoogleLogin}
        className="w-full border rounded-xl p-3 mb-4 flex items-center justify-center gap-2
                   hover:bg-gray-50 transition font-medium">
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
             width="18" height="18" alt="Google" />
        Continuar com Google
      </button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"/>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-sm text-gray-400">ou</span>
        </div>
      </div>

      <form onSubmit={handleEmailLogin} className="space-y-3">
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
          placeholder="seu@email.com" required
          className="w-full border rounded-xl p-3 text-sm" />
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
          placeholder="Senha" required
          className="w-full border rounded-xl p-3 text-sm" />
        {message && <p className="text-red-600 text-sm">{message}</p>}
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white p-3 rounded-xl font-medium disabled:opacity-50">
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-4">
        Não tem conta?{' '}
        <a href="/cadastro" className="text-blue-600">Cadastre-se</a>
      </p>
    </main>
  )
}