import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { Card, CardTitle } from './ui/kit'
import {
  isPushSupported, precisaInstalarNoIOS, permissaoAtual, getInscricaoAtual,
  ativarNotificacoes, desativarNotificacoes, enviarNotificacaoTeste,
} from '../lib/push'

const ANTECEDENCIAS = [
  { min: 15,  label: '15 min antes' },
  { min: 30,  label: '30 min antes' },
  { min: 60,  label: '1 hora antes' },
  { min: 120, label: '2 horas antes' },
  { min: 0,   label: 'Não avisar' },
]

const MENSAGENS_ERRO = {
  permissao_negada: 'Notificações bloqueadas. Libere nas configurações do navegador (ícone de cadeado ao lado do endereço).',
  sw_indisponivel: 'Não foi possível ativar agora. Recarregue a página e tente de novo.',
  nao_suportado: 'Este navegador não suporta notificações.',
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 disabled:opacity-50 ${checked ? 'ac-bg' : 'bg-gray-200'}`}
    >
      {/* cor inline: o dark mode global remapeia bg-white pra cinza escuro */}
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-0'}`}
        style={{ backgroundColor: '#fff' }}
      />
    </button>
  )
}

export default function NotificacoesCard() {
  const { profile, updateProfile } = useAuth()
  const toast = useToast()
  const [ativo, setAtivo] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [ocupado, setOcupado] = useState(false)

  const suportado = isPushSupported()
  const instalarIOS = precisaInstalarNoIOS()
  const bloqueado = permissaoAtual() === 'denied'
  const antecedencia = profile?.notif_antecedencia_min ?? 60
  const resumo = profile?.notif_resumo_diario ?? true

  useEffect(() => {
    getInscricaoAtual().then(sub => {
      setAtivo(!!sub && permissaoAtual() === 'granted')
      setCarregando(false)
    })
  }, [])

  async function alternar(ligar) {
    setOcupado(true)
    try {
      if (ligar) {
        await ativarNotificacoes()
        setAtivo(true)
        enviarNotificacaoTeste().catch(() => {})
        toast('Notificações ativadas neste aparelho!')
      } else {
        await desativarNotificacoes()
        setAtivo(false)
        toast('Notificações desativadas neste aparelho.', 'info')
      }
    } catch (err) {
      toast(MENSAGENS_ERRO[err?.message] || 'Erro ao configurar notificações.', 'error')
    } finally {
      setOcupado(false)
    }
  }

  async function salvarPreferencia(campos) {
    const { error } = await updateProfile(campos)
    if (error) toast('Erro ao salvar.', 'error')
  }

  async function testar() {
    setOcupado(true)
    try {
      const res = await enviarNotificacaoTeste()
      if (!res?.enviados) toast('Nenhum aparelho recebeu. Desative e ative de novo.', 'error')
    } catch {
      toast('Erro ao enviar teste.', 'error')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Card className="p-4 space-y-3">
      <CardTitle>Notificações</CardTitle>
      <p className="text-xs text-gray-400 -mt-2">
        Receba um aviso no celular antes de cada serviço agendado, mesmo com o app fechado.
      </p>

      {!suportado || instalarIOS ? (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-xl p-3">
          {instalarIOS
            ? 'No iPhone, as notificações só funcionam com o ClimaPro na tela de início: toque em Compartilhar → "Adicionar à Tela de Início" e abra o app por lá.'
            : MENSAGENS_ERRO.nao_suportado}
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-gray-800">Ativar neste aparelho</p>
              {bloqueado && !ativo && (
                <p className="text-xs text-red-500 mt-0.5">{MENSAGENS_ERRO.permissao_negada}</p>
              )}
            </div>
            <Toggle checked={ativo} onChange={alternar} disabled={carregando || ocupado} />
          </div>

          {ativo && (
            <>
              <div className="border-t border-gray-100 pt-3">
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Avisar antes do serviço</label>
                <select
                  className="input-field"
                  value={antecedencia}
                  onChange={e => salvarPreferencia({ notif_antecedencia_min: Number(e.target.value) })}
                >
                  {ANTECEDENCIAS.map(a => <option key={a.min} value={a.min}>{a.label}</option>)}
                </select>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-gray-800">Resumo do dia às 7h</p>
                  <p className="text-xs text-gray-400">Lista os serviços agendados para hoje</p>
                </div>
                <Toggle checked={resumo} onChange={v => salvarPreferencia({ notif_resumo_diario: v })} />
              </div>

              <button
                type="button"
                onClick={testar}
                disabled={ocupado}
                className="w-full text-center text-sm font-semibold ac-text py-2 rounded-xl active:opacity-70 disabled:opacity-50"
              >
                Enviar notificação de teste
              </button>
            </>
          )}
        </>
      )}
    </Card>
  )
}
