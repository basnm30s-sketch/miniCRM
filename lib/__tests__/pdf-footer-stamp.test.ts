import { ClientSidePDFRenderer } from '../pdf'

jest.mock('@/lib/api-client', () => ({
  loadBrandingUrls: jest.fn().mockResolvedValue({ logoUrl: null, sealUrl: null, signatureUrl: null }),
  getFileUrl: jest.fn((p: any) => p),
}))

function makeFakeCanvas(width: number, height: number) {
  return {
    width,
    height,
    toDataURL: jest.fn(() => 'data:image/jpeg;base64,FAKE'),
  } as any
}

function makeFakePdf() {
  const calls: Array<{ name: string; args: any[] }> = []

  const pdf = {
    internal: {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    },
    addImage: (...args: any[]) => calls.push({ name: 'addImage', args }),
    addPage: (...args: any[]) => calls.push({ name: 'addPage', args }),
    setFillColor: (...args: any[]) => calls.push({ name: 'setFillColor', args }),
    rect: (...args: any[]) => calls.push({ name: 'rect', args }),
  } as any

  return { pdf, calls }
}

describe('PDF footer stamping', () => {
  it('does not add footer when footerStamp is null', () => {
    const renderer = new ClientSidePDFRenderer() as any
    const { pdf, calls } = makeFakePdf()
    const canvas = makeFakeCanvas(1000, 1200) // small enough for one page

    renderer.addCanvasToPdf(pdf, canvas, null)

    // One main image on first page, no footer stamping ops
    expect(calls.filter(c => c.name === 'addPage')).toHaveLength(0)
    expect(calls.filter(c => c.name === 'rect')).toHaveLength(0)
    expect(calls.filter(c => c.name === 'addImage')).toHaveLength(1)
    expect(calls.find(c => c.name === 'addImage')?.args?.[1]).toBe('JPEG')
  })

  it('stamps footer at bottom of every page for multipage output', () => {
    const renderer = new ClientSidePDFRenderer() as any
    const { pdf, calls } = makeFakePdf()

    // Long content -> multiple pages
    const mainCanvas = makeFakeCanvas(1000, 5000)
    const footerStamp = {
      imgData: 'data:image/png;base64,FOOTER',
      pixelWidth: 1000,
      pixelHeight: 200,
    }

    renderer.addCanvasToPdf(pdf, mainCanvas, footerStamp)

    const addPageCalls = calls.filter(c => c.name === 'addPage')
    expect(addPageCalls.length).toBeGreaterThanOrEqual(1)

    const mainImages = calls.filter(c => c.name === 'addImage' && c.args?.[1] === 'JPEG')
    const footerImages = calls.filter(c => c.name === 'addImage' && c.args?.[1] === 'PNG')
    const rects = calls.filter(c => c.name === 'rect')

    // Footer should be applied once per page (same count as main image pages)
    expect(footerImages).toHaveLength(mainImages.length)
    expect(rects).toHaveLength(mainImages.length)
  })
})

