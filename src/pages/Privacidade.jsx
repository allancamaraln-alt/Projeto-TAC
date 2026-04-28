import { useNavigate } from 'react-router-dom'

export default function Privacidade() {
  const navigate = useNavigate()

  return (
    <div className="page-container">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-800">Política de Privacidade</h1>
      </div>

      <div className="px-4 pt-6 pb-24 space-y-6 max-w-2xl mx-auto">
        <p className="text-xs text-gray-400">Última atualização: abril de 2026</p>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-800">1. Informações coletadas</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            O ClimaPro coleta apenas as informações necessárias para o funcionamento do aplicativo: nome, e-mail e dados profissionais do técnico, além dos dados de clientes e ordens de serviço cadastrados pelo próprio usuário.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-800">2. Uso das informações</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            As informações são usadas exclusivamente para oferecer as funcionalidades do app: gerenciamento de ordens de serviço, controle de clientes e lembretes de manutenção preventiva. Nenhum dado é vendido ou compartilhado com terceiros.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-800">3. Armazenamento</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Os dados são armazenados de forma segura na plataforma Supabase, com criptografia em trânsito (HTTPS) e em repouso. O acesso é restrito ao próprio usuário autenticado.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-800">4. Dados de terceiros</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Ao cadastrar dados de clientes no app, o técnico é responsável por obter o consentimento necessário dessas pessoas para o armazenamento e uso de suas informações.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-800">5. Exclusão de dados</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            O usuário pode solicitar a exclusão de todos os seus dados a qualquer momento entrando em contato pelo e-mail de suporte. A exclusão é permanente e irreversível.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-800">6. Monitoramento de erros</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Utilizamos o Sentry para monitorar erros técnicos do app. Esse serviço pode coletar informações sobre o dispositivo e o estado do app no momento do erro, sem identificar dados pessoais dos clientes cadastrados.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-gray-800">7. Contato</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Dúvidas sobre privacidade: <span className="ac-text font-medium">allancamaraln@gmail.com</span>
          </p>
        </section>
      </div>
    </div>
  )
}
