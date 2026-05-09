import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown } from 'lucide-react'
import { normalizeRichTextHtml } from '@/lib/html-normalizer'

type DocGeneratorNotesTermsSectionProps = {
  notes?: string
  terms?: string
  termsExpanded: boolean
  onToggleTerms: () => void
}

export function DocGeneratorNotesTermsSection({
  notes,
  terms,
  termsExpanded,
  onToggleTerms,
}: DocGeneratorNotesTermsSectionProps) {
  const normalizedTerms = normalizeRichTextHtml(terms)

  if (!notes && !normalizedTerms) return null

  return (
    <div className="grid grid-cols-1 gap-4">
      {notes ? (
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2 pt-3 bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Notes</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{notes}</p>
          </CardContent>
        </Card>
      ) : null}

      {normalizedTerms ? (
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2 pt-3 bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div
              className={`prose prose-sm max-w-none text-slate-600 ${!termsExpanded ? 'line-clamp-4' : ''}`}
              dangerouslySetInnerHTML={{ __html: normalizedTerms }}
            />
            {normalizedTerms.length > 200 ? (
              <button
                className="text-blue-600 hover:text-blue-700 text-xs font-medium mt-2 flex items-center"
                onClick={onToggleTerms}
              >
                {termsExpanded ? 'Show Less' : 'Read More'}
                <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${termsExpanded ? 'rotate-180' : ''}`} />
              </button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
