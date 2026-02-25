// Shared types for the Trades feature — used by API routes and client components

export type TradeFill = {
  id: string
  fillTime: string
  side: string
  quantity: number
  price: string
  commission: string | null
}

export type TradeTag = {
  id: string
  name: string
  color: string | null
}

export type Trade = {
  id: string
  accountId: string
  instrumentId: string | null
  rootSymbol: string
  tradingDay: string
  entryTime: string
  exitTime: string | null
  durationSeconds: number | null
  sessionId: string | null
  side: string
  entryQty: number
  exitQty: number
  avgEntryPrice: string
  avgExitPrice: string | null
  isOpen: boolean
  grossPnl: string
  commissionTotal: string
  feesTotal: string
  netPnl: string
  rMultiple: string | null
  grade: string | null
  strategyId: string | null
  outcome: string | null
  notes: string | null
  tradingviewLink: string | null
  fillsCount: number
  fills: TradeFill[]
  tags: TradeTag[]
}

export type Strategy = {
  id: string
  name: string
  isActive: boolean
}
