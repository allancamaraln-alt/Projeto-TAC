import { supabase } from './supabase'

// Duplicado deliberadamente de OrdemDetalhe.jsx (resizeFoto) — o módulo
// PMOC não importa nem edita arquivos fora de si mesmo.
export function resizeFoto(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 1280
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * (MAX / width)); width = MAX }
        else { width = Math.round(width * (MAX / height)); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Falha ao processar imagem')), 'image/jpeg', 0.82)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Falha ao carregar imagem')) }
    img.src = url
  })
}

function sanitizeNome(nome) {
  return nome.replace(/[^a-zA-Z0-9.\-_]/g, '_')
}

export async function uploadPmocEvidencia(file, { tecnicoId, execucaoItemId }) {
  const blob = await resizeFoto(file)
  const path = `${tecnicoId}/${execucaoItemId}/${Date.now()}.jpg`
  const { error: uploadError } = await supabase.storage.from('pmoc-evidencias').upload(path, blob, { contentType: 'image/jpeg' })
  if (uploadError) throw uploadError
  const { data: { publicUrl } } = supabase.storage.from('pmoc-evidencias').getPublicUrl(path)
  const { data, error } = await supabase
    .from('pmoc_execucao_fotos')
    .insert({ execucao_item_id: execucaoItemId, tecnico_id: tecnicoId, url: publicUrl })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removerPmocEvidencia(foto) {
  const path = foto.url.split('/pmoc-evidencias/')[1]
  if (path) await supabase.storage.from('pmoc-evidencias').remove([path])
  const { error } = await supabase.from('pmoc_execucao_fotos').delete().eq('id', foto.id)
  if (error) throw error
}

export async function uploadPmocDocumento(file, { tecnicoId, pmocId }) {
  const path = `${tecnicoId}/${pmocId}/${Date.now()}-${sanitizeNome(file.name)}`
  const { error: uploadError } = await supabase.storage.from('pmoc-documentos').upload(path, file, { contentType: file.type || 'application/octet-stream' })
  if (uploadError) throw uploadError
  const { data: { publicUrl } } = supabase.storage.from('pmoc-documentos').getPublicUrl(path)
  const { data, error } = await supabase
    .from('pmoc_documentos')
    .insert({ pmoc_id: pmocId, tecnico_id: tecnicoId, nome: file.name, url: publicUrl, tipo: file.type || '' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removerPmocDocumento(doc) {
  const path = doc.url.split('/pmoc-documentos/')[1]
  if (path) await supabase.storage.from('pmoc-documentos').remove([path])
  const { error } = await supabase.from('pmoc_documentos').delete().eq('id', doc.id)
  if (error) throw error
}
