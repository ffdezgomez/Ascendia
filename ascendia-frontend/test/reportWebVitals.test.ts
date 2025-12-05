import { ReportHandler } from 'web-vitals'
import reportWebVitals from '../src/reportWebVitals'

const createMetricMocks = () => ({
  getCLS: jest.fn(),
  getFID: jest.fn(),
  getFCP: jest.fn(),
  getLCP: jest.fn(),
  getTTFB: jest.fn()
})

describe('reportWebVitals', () => {
  it('loads metrics and wires every callback when a handler exists', async () => {
    const handler: ReportHandler = () => {}
    const metricMocks = createMetricMocks()
    const loader = jest.fn(() => Promise.resolve(metricMocks))

    await reportWebVitals(handler, loader)

    expect(loader).toHaveBeenCalledTimes(1)
    expect(metricMocks.getCLS).toHaveBeenCalledWith(handler)
    expect(metricMocks.getFID).toHaveBeenCalledWith(handler)
    expect(metricMocks.getFCP).toHaveBeenCalledWith(handler)
    expect(metricMocks.getLCP).toHaveBeenCalledWith(handler)
    expect(metricMocks.getTTFB).toHaveBeenCalledWith(handler)
  })

  it('returns early when no handler is provided', async () => {
    const metricMocks = createMetricMocks()
    const loader = jest.fn(() => Promise.resolve(metricMocks))

    await reportWebVitals(undefined, loader)

    expect(loader).not.toHaveBeenCalled()
    expect(metricMocks.getCLS).not.toHaveBeenCalled()
    expect(metricMocks.getFID).not.toHaveBeenCalled()
    expect(metricMocks.getFCP).not.toHaveBeenCalled()
    expect(metricMocks.getLCP).not.toHaveBeenCalled()
    expect(metricMocks.getTTFB).not.toHaveBeenCalled()
  })
})
