import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

type RentalBasis = 'hourly' | 'monthly' | string

type LineItemBase = {
  id?: string
  serialNumber?: number

  vehicleNumber?: string
  vehicleTypeLabel?: string
  vehicleType?: string
  make?: string
  model?: string
  year?: number
  basePrice?: number

  description?: string
  rentalBasis?: RentalBasis

  quantity: number
  unitPrice: number

  taxPercent?: number
  tax?: number
  grossAmount?: number
  lineTaxAmount?: number
  lineTotal?: number
  total?: number

  // invoice-only (per line item)
  amountReceived?: number
}

export type ReadOnlyLineItemsTableVariant = 'quote' | 'invoice' | 'purchaseOrder'

type ReadOnlyLineItemsTableProps = {
  variant: ReadOnlyLineItemsTableVariant
  items: LineItemBase[]
  visibleColumns: Record<string, boolean>
}

function toFixedOrDash(value: number | undefined | null, digits = 2) {
  if (value === undefined || value === null || Number.isNaN(value)) return '-'
  return value.toFixed(digits)
}

function getTaxAmount(item: LineItemBase, gross: number) {
  if (typeof item.lineTaxAmount === 'number') return item.lineTaxAmount
  if (typeof item.tax === 'number') return item.tax
  const pct = typeof item.taxPercent === 'number' ? item.taxPercent : 0
  return gross * (pct / 100)
}

function getTaxPercent(item: LineItemBase, gross: number) {
  if (typeof item.taxPercent === 'number') return item.taxPercent
  const taxAmount = getTaxAmount(item, gross)
  if (!gross || gross <= 0) return 0
  return (taxAmount / gross) * 100
}

function getGross(item: LineItemBase) {
  if (typeof item.grossAmount === 'number') return item.grossAmount
  return (item.quantity || 0) * (item.unitPrice || 0)
}

function getNet(item: LineItemBase, gross: number) {
  if (typeof item.lineTotal === 'number') return item.lineTotal
  // fallback to legacy total
  if (typeof item.total === 'number') return item.total
  return gross + getTaxAmount(item, gross)
}

function formatRentalBasis(basis?: RentalBasis) {
  if (!basis) return '-'
  if (basis === 'hourly') return 'Hourly'
  if (basis === 'monthly') return 'Monthly'
  return String(basis)
}

export function ReadOnlyLineItemsTable({ variant, items, visibleColumns }: ReadOnlyLineItemsTableProps) {
  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-100 border-b">
            <tr>
              {visibleColumns.serialNumber !== false && <th className="text-center p-2">#</th>}
              {visibleColumns.vehicleNumber !== false && <th className="text-left p-2">Vehicle</th>}
              {visibleColumns.vehicleType !== false && <th className="text-left p-2">Type</th>}
              {visibleColumns.makeModel !== false && <th className="text-left p-2">Make/Model</th>}
              {visibleColumns.year !== false && <th className="text-center p-2">Year</th>}
              {visibleColumns.basePrice !== false && <th className="text-right p-2">Base Price</th>}
              {visibleColumns.description !== false && <th className="text-left p-2">Description</th>}
              {visibleColumns.rentalBasis !== false && <th className="text-center p-2">Basis</th>}
              {visibleColumns.quantity !== false && <th className="text-right p-2">Qty</th>}
              {visibleColumns.rate !== false && <th className="text-right p-2">Rate</th>}
              {visibleColumns.grossAmount !== false && <th className="text-right p-2">Gross</th>}
              {visibleColumns.tax !== false && <th className="text-right p-2">Tax%</th>}
              {visibleColumns.netAmount !== false && <th className="text-right p-2">Net</th>}
              {variant === 'invoice' && visibleColumns.amountReceived !== false && (
                <th className="text-right p-2">Received</th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const gross = getGross(item)
              const taxPercent = getTaxPercent(item, gross)
              const net = getNet(item, gross)

              const makeModel =
                item.make && item.model ? `${item.make} ${item.model}` : item.make || item.model || '-'

              // Prefer vehicleNumber; fallback to label
              const vehicleLabel = item.vehicleNumber || item.vehicleTypeLabel || '-'

              return (
                <tr key={item.id ?? `${index}`} className="border-b hover:bg-slate-50">
                  {visibleColumns.serialNumber !== false && (
                    <td className="p-2 text-center text-slate-700">{item.serialNumber ?? index + 1}</td>
                  )}

                  {visibleColumns.vehicleNumber !== false && (
                    <td className="p-2 min-w-[100px] text-slate-700">{vehicleLabel}</td>
                  )}

                  {visibleColumns.vehicleType !== false && (
                    <td className="p-2 text-left text-slate-700 min-w-[80px]">{item.vehicleType || '-'}</td>
                  )}

                  {visibleColumns.makeModel !== false && (
                    <td className="p-2 text-left text-slate-700 min-w-[120px]">{makeModel}</td>
                  )}

                  {visibleColumns.year !== false && (
                    <td className="p-2 text-center text-slate-700 min-w-[60px]">{item.year ?? '-'}</td>
                  )}

                  {visibleColumns.basePrice !== false && (
                    <td className="p-2 text-right text-slate-700 min-w-[80px]">
                      {toFixedOrDash(item.basePrice)}
                    </td>
                  )}

                  {visibleColumns.description !== false && (
                    <td className="p-2 min-w-[120px] text-slate-700">
                      {item.description || item.vehicleTypeLabel || '-'}
                    </td>
                  )}

                  {visibleColumns.rentalBasis !== false && (
                    <td className="p-2 min-w-[90px] text-center text-slate-700">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">{formatRentalBasis(item.rentalBasis)}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Rental basis: Hourly (rate per hour) or Monthly (rate per month)</p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  )}

                  {visibleColumns.quantity !== false && (
                    <td className="p-2 text-right w-[60px] text-slate-700">{item.quantity ?? 0}</td>
                  )}

                  {visibleColumns.rate !== false && (
                    <td className="p-2 text-right w-[80px] text-slate-700">{toFixedOrDash(item.unitPrice)}</td>
                  )}

                  {visibleColumns.grossAmount !== false && (
                    <td className="p-2 text-right text-slate-700 w-[80px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">{toFixedOrDash(gross)}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Gross = Quantity × Rate</p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  )}

                  {visibleColumns.tax !== false && (
                    <td className="p-2 text-right w-[60px] text-slate-700">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">{toFixedOrDash(taxPercent, 2)}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Tax percentage (0-100%). Tax = Gross × Tax% / 100</p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  )}

                  {visibleColumns.netAmount !== false && (
                    <td className="p-2 text-right text-slate-700 font-semibold w-[80px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">{toFixedOrDash(net)}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Net = Gross + Tax</p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  )}

                  {variant === 'invoice' && visibleColumns.amountReceived !== false && (
                    <td className="p-2 text-right w-[80px] text-slate-700">{toFixedOrDash(item.amountReceived || 0)}</td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  )
}

