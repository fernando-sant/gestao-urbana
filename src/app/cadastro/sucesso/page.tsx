'use client'
import Link from 'next/link'

export default function CadastroSucessoPage() {
  return (
    <main className="max-w-md mx-auto p-6 mt-20 text-center">
      <div className="mb-6 flex justify-center">
        <div className="bg-blue-100 p-4 rounded-full">
          <span className="text-4xl">📧</span>
        </div>
      </div>
      
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Quase lá!</h1>
      <p className="text-gray-600 mb-8">
        Enviamos um link de confirmação para o seu e-mail. 
        Por favor, verifique sua caixa de entrada (e a pasta de spam) para ativar sua conta.
      </p>

      <div className="space-y-3">
        <Link 
          href="/login" 
          className="block w-full bg-blue-600 text-white p-3 rounded-xl font-medium hover:bg-blue-700 transition"
        >
          Ir para o Login
        </Link>
        <Link 
          href="/" 
          className="block text-sm text-gray-500 hover:underline"
        >
          Voltar para o início
        </Link>
      </div>
    </main>
  )
}