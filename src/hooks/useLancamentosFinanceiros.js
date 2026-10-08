import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

async function fetchLancamentos({ userId, startDate, endDate }) {
  let gastosQ = supabase
    .from('gastos')
    .select('*')
    .eq('tecnico_id', userId)
    .lte('data', endDate)
    .order('data', { ascending: false })
  if (startDate) gastosQ = gastosQ.gte('data', startDate)

  // Só receitas avulsas. Linhas com ordem_id são cópias antigas de
  // pagamentos de OS (gravadas pela IA até out/2026) — esse dinheiro já é
  // contado pelos pagamentos da própria OS, e somá-las de novo duplicava o
  // lucro líquido.
  let receitasQ = supabase
    .from('receitas')
    .select('*')
    .eq('tecnico_id', userId)
    .is('ordem_id', null)
    .lte('data', endDate)
    .order('data', { ascending: false })
  if (startDate) receitasQ = receitasQ.gte('data', startDate)

  const [{ data: gastosData }, { data: receitasData }] = await Promise.all([gastosQ, receitasQ])
  return { gastos: gastosData ?? [], receitas: receitasData ?? [] }
}

// Camada de dados da aba "Financeiro" do Relatório — gastos e receitas
// avulsas lançados manualmente, no mesmo formato de colunas que o executor
// de ferramentas da IA usa (src/lib/ai/tools/financialExecutor.js), pra que
// um lançamento feito por voz/texto e um lançamento manual apareçam e se
// comportem de forma idêntica nesta lista.
export function useLancamentosFinanceiros({ userId, startDate, endDate }) {
  const [gastos, setGastos] = useState([])
  const [receitas, setReceitas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    let cancelado = false
    async function run() {
      setLoading(true)
      const { gastos, receitas } = await fetchLancamentos({ userId, startDate, endDate })
      if (cancelado) return
      setGastos(gastos)
      setReceitas(receitas)
      setLoading(false)
    }
    run()
    return () => { cancelado = true }
  }, [userId, startDate, endDate])

  async function reload() {
    const { gastos, receitas } = await fetchLancamentos({ userId, startDate, endDate })
    setGastos(gastos)
    setReceitas(receitas)
  }

  async function criarGasto({ data, categoria, descricao, valor }) {
    const { error } = await supabase
      .from('gastos')
      .insert({ tecnico_id: userId, data, categoria, descricao, valor: Number(valor) })
    if (error) throw error
    await reload()
  }

  async function atualizarGasto(id, { data, categoria, descricao, valor }) {
    const { error } = await supabase
      .from('gastos')
      .update({ data, categoria, descricao, valor: Number(valor) })
      .eq('id', id)
    if (error) throw error
    await reload()
  }

  async function excluirGasto(id) {
    const { error } = await supabase.from('gastos').delete().eq('id', id)
    if (error) throw error
    await reload()
  }

  async function criarReceita({ data, descricao, valor }) {
    const { error } = await supabase
      .from('receitas')
      .insert({ tecnico_id: userId, data, descricao, valor: Number(valor) })
    if (error) throw error
    await reload()
  }

  async function atualizarReceita(id, { data, descricao, valor }) {
    const { error } = await supabase
      .from('receitas')
      .update({ data, descricao, valor: Number(valor) })
      .eq('id', id)
    if (error) throw error
    await reload()
  }

  async function excluirReceita(id) {
    const { error } = await supabase.from('receitas').delete().eq('id', id)
    if (error) throw error
    await reload()
  }

  const totalGastos = useMemo(() => gastos.reduce((s, g) => s + Number(g.valor), 0), [gastos])
  const totalReceitas = useMemo(() => receitas.reduce((s, r) => s + Number(r.valor), 0), [receitas])
  const porCategoria = useMemo(() => gastos.reduce((acc, g) => {
    acc[g.categoria] = (acc[g.categoria] || 0) + Number(g.valor)
    return acc
  }, {}), [gastos])

  return {
    gastos, receitas, loading,
    totalGastos, totalReceitas, porCategoria,
    criarGasto, atualizarGasto, excluirGasto,
    criarReceita, atualizarReceita, excluirReceita,
    reload,
  }
}
