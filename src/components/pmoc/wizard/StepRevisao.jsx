import { PERIODICIDADE_LABEL } from '../../../lib/pmoc'
import { REGISTRO_TIPOS, TIPOS_ESTABELECIMENTO } from '../../../lib/pmocTemplates'
import { formatDate } from '../../../lib/format'

function labelDe(lista, value) {
  return lista.find(o => o.value === value)?.label || '—'
}

function Secao({ titulo, onEditar, children }) {
  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{titulo}</h2>
        <button type="button" onClick={onEditar} className="text-xs font-semibold ac-text">Voltar e editar</button>
      </div>
      {children}
    </div>
  )
}

function Linha({ label, value }) {
  if (!value) return null
  return (
    <p className="text-sm text-gray-600">
      <span className="text-gray-400">{label}: </span>
      {value}
    </p>
  )
}

export default function StepRevisao({ dadosGerais, estabelecimento, equipamentos, itens, onEditStep, onSubmit, submitting, erro }) {
  return (
    <div className="px-4 pt-5 space-y-4 pb-8">
      <Secao titulo="Dados gerais" onEditar={() => onEditStep(0)}>
        <Linha label="Cliente" value={dadosGerais.clienteNome} />
        <Linha label="Responsável técnico" value={dadosGerais.responsavel_tecnico} />
        <Linha label="Registro" value={dadosGerais.registro_tipo ? `${labelDe(REGISTRO_TIPOS, dadosGerais.registro_tipo)} ${dadosGerais.registro_numero}` : ''} />
        <Linha label="ART/TRT" value={dadosGerais.art_trt} />
        <Linha label="Início do plano" value={formatDate(dadosGerais.data_inicio)} />
      </Secao>

      <Secao titulo="Estabelecimento" onEditar={() => onEditStep(1)}>
        <Linha label="Nome" value={estabelecimento.nome} />
        <Linha label="CNPJ/CPF" value={estabelecimento.cnpj_cpf} />
        <Linha label="Tipo" value={labelDe(TIPOS_ESTABELECIMENTO, estabelecimento.tipo_estabelecimento)} />
        <Linha label="Endereço" value={[estabelecimento.rua, estabelecimento.numero, estabelecimento.bairro, estabelecimento.cidade].filter(Boolean).join(', ')} />
        <Linha label="Área climatizada" value={estabelecimento.area_climatizada_m2 ? `${estabelecimento.area_climatizada_m2} m²` : ''} />
        <Linha label="Qtd. ambientes" value={estabelecimento.qtd_ambientes} />
      </Secao>

      <Secao titulo="Equipamentos" onEditar={() => onEditStep(2)}>
        <p className="text-sm text-gray-600">{equipamentos.length} equipamento(s) cadastrado(s)</p>
        <ul className="text-sm text-gray-500 space-y-0.5">
          {equipamentos.map(eq => (
            <li key={eq._localId}>• {eq.tag || eq.tipo || 'Equipamento'}{eq.localizacao ? ` — ${eq.localizacao}` : ''}</li>
          ))}
        </ul>
      </Secao>

      <Secao titulo="Plano de manutenção" onEditar={() => onEditStep(3)}>
        <p className="text-sm text-gray-600">{itens.length} atividade(s) programada(s)</p>
        <ul className="text-sm text-gray-500 space-y-0.5">
          {itens.map(item => (
            <li key={item._localId}>• {item.descricao} — {PERIODICIDADE_LABEL[item.periodicidade]}</li>
          ))}
        </ul>
      </Secao>

      {erro && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{erro}</div>}

      <button type="button" onClick={onSubmit} disabled={submitting} className="btn-primary w-full disabled:opacity-60">
        {submitting ? 'Criando PMOC...' : 'Criar PMOC'}
      </button>
    </div>
  )
}
