// Cliente compartilhado para a API do Asaas. Usado por todas as functions
// asaas-*, do mesmo jeito que tracking-dispatch.ts é compartilhado entre
// asaas-webhook e admin-tracking.

const ASAAS_API_URL = Deno.env.get('ASAAS_ENV') === 'sandbox'
  ? 'https://api-sandbox.asaas.com/v3'
  : 'https://api.asaas.com/v3'

function headers() {
  return {
    'Content-Type': 'application/json',
    'access_token': Deno.env.get('ASAAS_ACCESS_TOKEN')!,
  }
}

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10)
}

export type AsaasCustomerInput = {
  name: string
  email: string
  cpfCnpj: string
  phone?: string
}

/** Busca cliente Asaas por CPF/CNPJ (um CPF pode ter só um customer) ou cria um novo. */
export async function createOrGetCustomer(input: AsaasCustomerInput): Promise<string> {
  const searchRes = await fetch(
    `${ASAAS_API_URL}/customers?cpfCnpj=${encodeURIComponent(input.cpfCnpj)}`,
    { headers: headers() }
  )
  const searchData = await searchRes.json()
  if (searchData?.data?.length > 0) return searchData.data[0].id as string

  const createRes = await fetch(`${ASAAS_API_URL}/customers`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      cpfCnpj: input.cpfCnpj,
      ...(input.phone ? { mobilePhone: input.phone.replace(/\D/g, '') } : {}),
    }),
  })
  const customer = await createRes.json()
  if (!customer.id) {
    throw new Error(`Falha ao criar cliente no Asaas: ${JSON.stringify(customer)}`)
  }
  return customer.id as string
}

export type CreatePixPaymentInput = {
  customerId: string
  value: number
  description: string
  externalReference: string
}

export type PixPaymentResult = {
  paymentId: string
  qrCode: string
  qrCodeBase64: string
}

/** Cria uma cobrança Pix e busca o QR code associado (fluxo inline, sem redirecionamento). */
export async function createPixPayment(input: CreatePixPaymentInput): Promise<PixPaymentResult> {
  const paymentRes = await fetch(`${ASAAS_API_URL}/payments`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      customer: input.customerId,
      billingType: 'PIX',
      value: input.value,
      dueDate: todayISODate(),
      description: input.description,
      externalReference: input.externalReference,
    }),
  })
  const payment = await paymentRes.json()
  if (!payment.id) {
    throw new Error(`Falha ao criar pagamento Pix no Asaas: ${JSON.stringify(payment)}`)
  }

  const qrRes = await fetch(`${ASAAS_API_URL}/payments/${payment.id}/pixQrCode`, {
    headers: headers(),
  })
  const qr = await qrRes.json()
  if (!qr.payload) {
    throw new Error(`Falha ao gerar QR code Pix no Asaas: ${JSON.stringify(qr)}`)
  }

  return {
    paymentId: payment.id as string,
    qrCode: qr.payload as string,
    qrCodeBase64: (qr.encodedImage as string) ?? '',
  }
}

/** Consulta o status atual de uma cobrança pelo id. */
export async function getPayment(paymentId: string): Promise<any> {
  const res = await fetch(`${ASAAS_API_URL}/payments/${paymentId}`, { headers: headers() })
  return res.json()
}

export type CreateCheckoutInput = {
  customerId: string
  value: number
  description: string
  externalReference: string
  /** Se informado, cria uma assinatura recorrente (cobrança única quando ausente). */
  subscriptionCycle?: 'MONTHLY' | 'YEARLY'
}

export type CheckoutResult = {
  /** id do pagamento (cobrança avulsa) ou da assinatura, conforme o caso. */
  id: string
  /** URL hospedada pelo Asaas para o cliente inserir os dados do cartão. */
  invoiceUrl: string
  isSubscription: boolean
}

/**
 * Cria uma cobrança (ou assinatura) com billingType UNDEFINED — o Asaas hospeda a
 * página de pagamento (invoiceUrl) e deixa o próprio cliente escolher Pix/cartão/boleto
 * e digitar os dados do cartão no domínio do Asaas. Nenhum dado de cartão passa pelo
 * nosso backend/frontend.
 */
export async function createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult> {
  if (input.subscriptionCycle) {
    const res = await fetch(`${ASAAS_API_URL}/subscriptions`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        customer: input.customerId,
        billingType: 'UNDEFINED',
        cycle: input.subscriptionCycle,
        value: input.value,
        nextDueDate: todayISODate(),
        description: input.description,
        externalReference: input.externalReference,
      }),
    })
    const subscription = await res.json()
    if (!subscription.id) {
      throw new Error(`Falha ao criar assinatura no Asaas: ${JSON.stringify(subscription)}`)
    }

    // A primeira cobrança da assinatura já é gerada automaticamente pelo Asaas —
    // buscamos ela para pegar a invoiceUrl do primeiro pagamento.
    const paymentsRes = await fetch(
      `${ASAAS_API_URL}/subscriptions/${subscription.id}/payments?limit=1`,
      { headers: headers() }
    )
    const paymentsData = await paymentsRes.json()
    const firstPayment = paymentsData?.data?.[0]
    if (!firstPayment?.invoiceUrl) {
      throw new Error(`Assinatura criada mas sem cobrança inicial: ${JSON.stringify(paymentsData)}`)
    }

    return { id: subscription.id as string, invoiceUrl: firstPayment.invoiceUrl as string, isSubscription: true }
  }

  const res = await fetch(`${ASAAS_API_URL}/payments`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      customer: input.customerId,
      billingType: 'UNDEFINED',
      value: input.value,
      dueDate: todayISODate(),
      description: input.description,
      externalReference: input.externalReference,
    }),
  })
  const payment = await res.json()
  if (!payment.invoiceUrl) {
    throw new Error(`Falha ao criar checkout no Asaas: ${JSON.stringify(payment)}`)
  }
  return { id: payment.id as string, invoiceUrl: payment.invoiceUrl as string, isSubscription: false }
}

/**
 * Busca o pagamento pago mais recente para uma referência externa, criado "recentemente".
 * `payment.dateCreated` do Asaas só tem granularidade de dia (sem hora), então não dá pra
 * comparar por milissegundos — em vez disso aceitamos qualquer pagamento pago criado hoje
 * ou ontem (cobre o caso de checkout iniciado perto da virada do dia em UTC). Isso evita
 * reaproveitar por engano um pagamento pago de um ciclo anterior com a mesma referência.
 */
export async function findRecentPaymentByExternalReference(externalReference: string): Promise<any | null> {
  const res = await fetch(
    `${ASAAS_API_URL}/payments?externalReference=${encodeURIComponent(externalReference)}&sort=dateCreated&order=desc&limit=5`,
    { headers: headers() }
  )
  const data = await res.json()
  const candidates = (data?.data ?? []) as any[]

  const hoje = new Date().toISOString().slice(0, 10)
  const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  return candidates.find((p) =>
    isPaidStatus(p.status) && (p.dateCreated === hoje || p.dateCreated === ontem)
  ) ?? null
}

/** true quando o status de cobrança do Asaas indica pagamento confirmado (inclui
 * RECEIVED_IN_CASH, usado quando o pagamento é reconciliado manualmente no painel). */
export function isPaidStatus(status: string): boolean {
  return status === 'CONFIRMED' || status === 'RECEIVED' || status === 'RECEIVED_IN_CASH'
}
