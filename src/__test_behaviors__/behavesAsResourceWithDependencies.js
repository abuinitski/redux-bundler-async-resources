import { tapReactors } from '../__mocks__/utils'

export default function behavesAsStalingResource(
  { selectors, actionCreators },
  { fetchActionCreator, fetchPendingSelector, createStore }
) {
  const isPendingForFetch = store => store[fetchPendingSelector]()
  const isStale = store => store[selectors.isStale]()
  const isPresent = store => store[selectors.isPresent]()
  const triggerFetch = store => store[fetchActionCreator]()

  describe('dependency keys', () => {
    describe('with one dependency', () => {
      test('does not try to fetch while dependencies are not satisfied', () => {
        const { store } = createStore({ dependencyKey: 'currentPage' })
        expect(isPendingForFetch(store)).toBe(false)
      })

      test('triggers pending state as soon as dependency is resolved', async () => {
        const { store } = createStore({ dependencyKey: 'currentPage' })
        store.doChangePaging({ currentPage: 1 })
        await tapReactors()
        expect(isPendingForFetch(store)).toBe(true)
      })

      test('clears the store when dependency changes', async () => {
        const { store, apiMock } = createStore({ dependencyKey: 'currentPage' })
        store.doChangePaging({ currentPage: 1 })
        await tapReactors()
        triggerFetch(store)
        await apiMock.resolveAllFetchRequests()

        store.doChangePaging({ currentPage: 2 })
        await tapReactors()
        expect(isPresent(store)).toBe(false)
      })

      test('stales a resource instead of clearing it with "stale" option', async () => {
        const { store, apiMock } = createStore({ dependencyKey: { key: 'currentPage', staleOnChange: true } })
        store.doChangePaging({ currentPage: 1 })
        await tapReactors()
        triggerFetch(store)
        await apiMock.resolveAllFetchRequests()

        store.doChangePaging({ currentPage: 2 })
        await tapReactors()

        expect(isPresent(store)).toBe(true)
        expect(isStale(store)).toBe(true)
      })

      test('allows to enable passing down blank values', async () => {
        const { store } = createStore({ dependencyKey: { key: 'currentPage', allowBlank: true } })
        await tapReactors()
        expect(isPendingForFetch(store)).toBe(true)
      })

      test.todo('mixes in dependency values into getPromise call')
    })

    describe('with multiple dependencies', () => {
      test('does not try to fetch while dependencies are not satisfied', () => {
        const { store } = createStore({ dependencyKey: ['currentPage', 'pageSize'] })
        expect(isPendingForFetch(store)).toBe(false)
      })

      test('triggers pending state as soon as dependency is resolved', async () => {
        const { store } = createStore({ dependencyKey: ['currentPage', 'pageSize'] })
        store.doChangePaging({ currentPage: 1 })
        await tapReactors()
        await tapReactors()
        expect(isPendingForFetch(store)).toBe(true)
      })

      test('clears the store when dependency changes', async () => {
        const { store, apiMock } = createStore({ dependencyKey: ['currentPage', 'pageSize'] })
        store.doChangePaging({ currentPage: 1 })
        await tapReactors()
        await tapReactors()

        triggerFetch(store)
        await apiMock.resolveAllFetchRequests()

        store.doChangePaging({ currentPage: 2 })
        await tapReactors()
        expect(isPresent(store)).toBe(false)
      })

      test('stales a resource instead of clearing it with "stale" option and allows blank items', async () => {
        const { store } = createStore({
          dependencyKey: [{ key: 'currentPage', allowBlank: true }, { key: 'pageSize', staleOnChange: true }],
        })

        await tapReactors()
        expect(isPendingForFetch(store)).toBe(true)

        store.doChangePaging({ pageSize: 120 })
        await tapReactors()
        expect(isStale(store)).toBe(true)
      })

      test.todo('mixes in dependency values into getPromise call')
    })
  })
}
