import React from 'react'

const AppMock = () => <div data-testid="app-root">App</div>
const mockRender = jest.fn()
const mockCreateRoot = jest.fn(() => ({ render: mockRender }))

jest.mock('../src/App', () => ({
  __esModule: true,
  default: AppMock
}))

jest.mock('react-dom/client', () => ({
  createRoot: mockCreateRoot
}))

describe('index bootstrap', () => {
  beforeEach(() => {
    mockRender.mockReset()
    mockCreateRoot.mockReset()
    mockCreateRoot.mockImplementation(() => ({ render: mockRender }))
    document.body.innerHTML = '<div id="root"></div>'
  })

  it('creates a React root and renders the app tree with providers', () => {
    jest.isolateModules(() => {
      require('../src/index')
    })

    const rootElement = document.getElementById('root')
    expect(mockCreateRoot).toHaveBeenCalledWith(rootElement)
    expect(mockRender).toHaveBeenCalledTimes(1)

    const renderedTree = mockRender.mock.calls[0][0] as React.ReactElement
    expect(React.isValidElement(renderedTree)).toBe(true)
    expect(renderedTree.props.client).toBeTruthy()

    const routerElement = renderedTree.props.children as React.ReactElement
    expect(React.isValidElement(routerElement)).toBe(true)

    const routerChild = Array.isArray(routerElement.props.children)
      ? routerElement.props.children[0]
      : routerElement.props.children

    const appElement = routerChild as React.ReactElement
    expect(appElement?.type).toBe(AppMock)
  })
})
