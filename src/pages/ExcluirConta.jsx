export default function ExcluirConta() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">❄️</span>
          <span className="text-xl font-bold text-slate-800">ClimaPro</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-2">Excluir minha conta</h1>
        <p className="text-slate-500 mb-6">
          Para solicitar a exclusão da sua conta e de todos os seus dados, envie um e-mail para o endereço abaixo com o assunto <strong>"Exclusão de conta"</strong> e o e-mail cadastrado no ClimaPro.
        </p>

        <a
          href="mailto:allancamaraln@gmail.com?subject=Exclusão de conta ClimaPro"
          className="block w-full text-center bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          Enviar solicitação
        </a>

        <div className="mt-8 text-sm text-slate-400 space-y-2">
          <p><strong className="text-slate-600">O que será excluído:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Seus dados de perfil (nome, e-mail, telefone)</li>
            <li>Todas as suas ordens de serviço</li>
            <li>Todos os seus clientes cadastrados</li>
            <li>Lembretes e histórico de atividades</li>
          </ul>
          <p className="pt-2">O prazo para exclusão é de até <strong className="text-slate-600">7 dias úteis</strong> após o recebimento da solicitação.</p>
        </div>
      </div>
    </div>
  )
}
