export const PERIODICIDADES = [
  { value: 'semanal',      label: 'Semanal' },
  { value: 'quinzenal',    label: 'Quinzenal' },
  { value: 'mensal',       label: 'Mensal' },
  { value: 'bimestral',    label: 'Bimestral' },
  { value: 'trimestral',   label: 'Trimestral' },
  { value: 'semestral',    label: 'Semestral' },
  { value: 'anual',        label: 'Anual' },
  { value: 'personalizada', label: 'Personalizada' },
]

export const EQUIPAMENTO_TIPOS = [
  '', 'Split Hi-Wall', 'Split Piso-Teto', 'Cassete', 'Dutado', 'VRF', 'VRV',
  'Self-contained', 'Chiller', 'Fan Coil', 'Rooftop', 'Janela', 'Exaustor',
  'Ventilador', 'Outro',
]

export const FLUIDOS = ['', 'R-410A', 'R-32', 'R-22', 'R-134a', 'R-290', 'R-404A', 'Outro']

export const REGISTRO_TIPOS = [
  { value: '', label: 'Selecione' },
  { value: 'crea', label: 'CREA' },
  { value: 'cau', label: 'CAU' },
  { value: 'cft', label: 'CFT' },
  { value: 'crt', label: 'CRT' },
  { value: 'outro', label: 'Outro' },
]

export const TIPOS_ESTABELECIMENTO = [
  { value: '', label: 'Selecione' },
  { value: 'comercio', label: 'Comércio' },
  { value: 'escritorio', label: 'Escritório' },
  { value: 'clinica', label: 'Clínica' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'escola', label: 'Escola' },
  { value: 'academia', label: 'Academia' },
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'industria', label: 'Indústria' },
  { value: 'igreja', label: 'Igreja' },
  { value: 'residencia', label: 'Residência' },
  { value: 'outro', label: 'Outro' },
]

export const CAPACIDADE_UNIDADES = [
  { value: 'btu', label: 'BTU/h' },
  { value: 'tr', label: 'TR' },
  { value: 'kw', label: 'kW' },
]

export const STATUS_EQUIPAMENTO = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
  { value: 'manutencao', label: 'Em manutenção' },
]

// Catálogo de atividades — só conveniência de UI. O texto final sempre
// vai para o campo `descricao`, então "Outra" com texto customizado
// nunca fica preso a este catálogo.
export const ATIVIDADES_CATALOGO = [
  'Limpeza de filtros',
  'Higienização',
  'Limpeza de evaporadora',
  'Limpeza de condensadora',
  'Verificação elétrica',
  'Verificação de dreno',
  'Verificação de ventiladores',
  'Verificação de componentes',
  'Inspeção visual',
  'Medição de temperatura',
  'Medição de corrente',
  'Verificação de ruídos',
  'Verificação de vazamentos',
  'Troca de filtro',
  'Outra',
]

const ITENS_BASE = [
  { descricao: 'Limpeza dos filtros de ar', periodicidade: 'mensal' },
  { descricao: 'Limpeza da bandeja e verificação do dreno de condensado', periodicidade: 'mensal' },
  { descricao: 'Verificação de ruídos e vibrações anormais', periodicidade: 'mensal' },
  { descricao: 'Limpeza da serpentina evaporadora', periodicidade: 'trimestral' },
  { descricao: 'Limpeza da serpentina condensadora', periodicidade: 'trimestral' },
  { descricao: 'Verificação da carga de fluido refrigerante', periodicidade: 'semestral' },
  { descricao: 'Medição da vazão de ar', periodicidade: 'semestral' },
  { descricao: 'Inspeção das ligações e componentes elétricos', periodicidade: 'semestral' },
  { descricao: 'Inspeção geral do sistema de climatização', periodicidade: 'anual' },
]

// Central/VRF/VRV/Dutado/Chiller/Rooftop têm dutos e casa de máquinas —
// itens extras que não fazem sentido para um Split/Janela isolado.
const ITENS_DUTOS_CASA_MAQUINAS = [
  { descricao: 'Limpeza e inspeção de dutos e grelhas', periodicidade: 'semestral' },
  { descricao: 'Verificação do isolamento térmico de dutos', periodicidade: 'semestral' },
  { descricao: 'Limpeza e organização da casa de máquinas', periodicidade: 'trimestral' },
]

const TIPOS_COM_DUTOS = ['Dutado', 'VRF', 'VRV', 'Self-contained', 'Chiller', 'Rooftop']

export function itensPadrao(tipo) {
  if (!tipo || tipo === 'Outro') return ITENS_BASE
  const extra = TIPOS_COM_DUTOS.includes(tipo) ? ITENS_DUTOS_CASA_MAQUINAS : []
  return [...ITENS_BASE, ...extra]
}
