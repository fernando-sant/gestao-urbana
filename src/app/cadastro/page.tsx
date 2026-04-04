'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function CadastroPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading]   = useState(false)
  const [message, setMessage]   = useState('')
  const supabase = createClient()

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          full_name: fullName,
          role: 'citizen' 
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Conta criada! Verifique seu e-mail para confirmar.')
      setTimeout(() => router.push('/login'), 3000)
    }
    setLoading(false)
  }

  return (
    <main className="max-w-sm mx-auto p-6 mt-20">
      <h1 className="text-2xl font-semibold mb-6 text-center">Criar Conta</h1>

      <form onSubmit={handleSignUp} className="space-y-3">
        <input type="text" placeholder="Nome completo" required
          value={fullName} onChange={e => setFullName(e.target.value)}
          className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        
        <input type="email" placeholder="seu@email.com" required
          value={email} onChange={e => setEmail(e.target.value)}
          className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        
        <input type="password" placeholder="Sua senha (mín. 6 caracteres)" required
          value={password} onChange={e => setPassword(e.target.value)}
          className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />

        {message && (
          <p className={`text-sm p-2 rounded ${message.includes('Erro') ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50'}`}>
            {message}
          </p>
        )}

        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white p-3 rounded-xl font-medium disabled:opacity-50 hover:bg-blue-700 transition">
          {loading ? 'Criando conta...' : 'Cadastrar'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Já tem uma conta? <a href="/login" className="text-blue-600 font-medium">Entrar</a>
      </p>
    </main>
  )
}