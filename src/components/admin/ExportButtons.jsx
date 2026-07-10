import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import { autoTable } from 'jspdf-autotable'

function paraCSV(rows) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escapar = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escapar(r[h])).join(','))].join('\n')
}

function baixar(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Exporta os `rows` (array de objetos simples) em CSV, Excel e PDF. */
export default function ExportButtons({ rows, filename = 'analytics' }) {
  function exportarCSV() {
    baixar(new Blob([paraCSV(rows)], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`)
  }

  function exportarExcel() {
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Dados')
    XLSX.writeFile(wb, `${filename}.xlsx`)
  }

  function exportarPDF() {
    const doc = new jsPDF()
    const headers = rows.length ? Object.keys(rows[0]) : []
    autoTable(doc, {
      head: [headers],
      body: rows.map((r) => headers.map((h) => String(r[h] ?? ''))),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [2, 132, 199] },
    })
    doc.save(`${filename}.pdf`)
  }

  const semDados = !rows?.length

  return (
    <div className="flex gap-2">
      <button onClick={exportarCSV} disabled={semDados} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40">CSV</button>
      <button onClick={exportarExcel} disabled={semDados} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40">Excel</button>
      <button onClick={exportarPDF} disabled={semDados} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40">PDF</button>
    </div>
  )
}
