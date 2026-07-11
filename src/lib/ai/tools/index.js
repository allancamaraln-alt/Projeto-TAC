import { FINANCIAL_TOOLS } from './financial'
import { executeTool as executeFinancialTool } from './financialExecutor'
import { OS_TOOLS } from './os'
import { executeOSTool } from './osExecutor'
import { CLIENT_TOOLS } from './clientes'
import { executeClientTool } from './clientesExecutor'
import { LAUDO_TOOLS } from './laudo'
import { executeLaudoTool } from './laudoExecutor'

export const ALL_TOOLS = [...FINANCIAL_TOOLS, ...OS_TOOLS, ...CLIENT_TOOLS, ...LAUDO_TOOLS]

const FINANCIAL_NAMES = new Set(FINANCIAL_TOOLS.map(t => t.function.name))
const OS_NAMES = new Set(OS_TOOLS.map(t => t.function.name))
const CLIENT_NAMES = new Set(CLIENT_TOOLS.map(t => t.function.name))
const LAUDO_NAMES = new Set(LAUDO_TOOLS.map(t => t.function.name))

export async function executeTool(name, args, userId) {
  if (FINANCIAL_NAMES.has(name)) return executeFinancialTool(name, args, userId)
  if (OS_NAMES.has(name)) return executeOSTool(name, args, userId)
  if (CLIENT_NAMES.has(name)) return executeClientTool(name, args, userId)
  if (LAUDO_NAMES.has(name)) return executeLaudoTool(name, args, userId)
  return { error: `Ferramenta desconhecida: ${name}` }
}
