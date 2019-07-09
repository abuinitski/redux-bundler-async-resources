import { createSelector } from 'redux-bundler'

import makeAsyncResourceBundleKeys from './makeAsyncResourceBundleKeys'
import keyToSelector from './common/keyToSelector'
import { nameToUnderscoreCase } from './common/nameToUnderscoreCase'

const Defaults = {
  name: undefined, // required
  getPromise: undefined, // required
  actionBaseType: null, // ${toUnderscoreCase(name)}
  retryAfter: 60000, // one minute,
  staleAfter: 900000, // fifteen minutes
  expireAfter: Infinity,
  persist: true,
  dependencyKey: null,
}

const InitialState = {
  isLoading: false,

  data: undefined,
  dataAt: null,
  isStale: false,

  dependencyValues: null,

  error: null,
  errorAt: null,
  errorPermanent: false,
  isReadyForRetry: false,
}

export default function createAsyncResourceBundle(inputOptions) {
  const {
    name,
    getPromise,
    actionBaseType,
    retryAfter,
    expireAfter,
    staleAfter,
    persist,
    dependencyKeys,
    stalingDependencyKeys,
    blankingDependencyKeys,
  } = cookOptionsWithDefaults(inputOptions)

  const baseType = actionBaseType || nameToUnderscoreCase(name)

  const expireEnabled = expireAfter && expireAfter !== Infinity
  const staleEnabled = staleAfter && staleAfter !== Infinity
  const retryEnabled = retryAfter && retryAfter !== Infinity
  const dependenciesEnabled = Boolean(dependencyKeys)

  const { selectors, actionCreators, reactors } = makeAsyncResourceBundleKeys(name)

  const actions = {
    STARTED: `${baseType}_FETCH_STARTED`,
    FINISHED: `${baseType}_FETCH_FINISHED`,
    FAILED: `${baseType}_FETCH_FAILED`,
    CLEARED: `${baseType}_CLEARED`,
    STALE: `${baseType}_STALE`,
    EXPIRED: `${baseType}_EXPIRED`,
    READY_FOR_RETRY: `${baseType}_READY_FOR_RETRY`,
    ADJUSTED: `${baseType}_ADJUSTED`,
    DEPENDENCIES_CHANGED: `${baseType}_DEPENDENCIES_CHANGED`,
  }

  const bundle = {
    name,

    reducer: (state = InitialState, { type, payload }) => {
      if (type === actions.STARTED) {
        return {
          ...state,
          isLoading: true,
        }
      }

      if (type === actions.FINISHED) {
        return {
          ...state,

          isLoading: false,

          data: payload,
          dataAt: Date.now(),
          isStale: false,

          error: null,
          errorAt: null,
          errorPermanent: false,
          isReadyForRetry: false,
        }
      }

      if (type === actions.FAILED) {
        return {
          ...state,

          isLoading: false,

          error: payload,
          errorAt: Date.now(),
          errorPermanent: Boolean(payload.permanent),
          isReadyForRetry: false,
        }
      }

      if (type === actions.CLEARED || type === actions.EXPIRED) {
        return InitialState
      }

      if (type === actions.STALE) {
        return {
          ...state,
          isStale: true,
        }
      }

      if (type === actions.READY_FOR_RETRY) {
        return {
          ...state,
          isReadyForRetry: true,
        }
      }

      if (type === actions.ADJUSTED) {
        if (!state.dataAt) {
          return state
        }

        if (typeof payload === 'function') {
          return {
            ...state,
            data: payload(state.data),
          }
        }

        return {
          ...state,
          data: payload,
        }
      }

      if (type === actions.DEPENDENCIES_CHANGED) {
        const stale =
          Boolean(state.dependencyValues) &&
          (stalingDependencyKeys.size > 0 &&
            changedKeys(state.dependencyValues, payload).every(key => stalingDependencyKeys.has(key)))

        if (stale) {
          return {
            ...state,
            isStale: true,
            dependencyValues: payload,
          }
        } else {
          return {
            ...InitialState,
            dependencyValues: payload,
          }
        }
      }

      return state
    },

    [selectors.raw]: state => state[name],

    [selectors.data]: createSelector(
      selectors.raw,
      ({ data }) => data
    ),

    [selectors.isPresent]: createSelector(
      selectors.raw,
      ({ dataAt }) => Boolean(dataAt)
    ),

    [selectors.isLoading]: createSelector(
      selectors.raw,
      ({ isLoading }) => isLoading
    ),

    [selectors.error]: createSelector(
      selectors.raw,
      ({ error }) => error
    ),

    [selectors.isReadyForRetry]: createSelector(
      selectors.raw,
      ({ isReadyForRetry }) => isReadyForRetry
    ),

    [selectors.retryAt]: createSelector(
      selectors.raw,
      ({ errorAt, errorPermanent }) => {
        if (!errorAt || errorPermanent || !retryEnabled) {
          return null
        }
        return errorAt + retryAfter
      }
    ),

    [selectors.errorIsPermanent]: createSelector(
      selectors.raw,
      ({ errorPermanent }) => errorPermanent
    ),

    [selectors.isStale]: createSelector(
      selectors.raw,
      ({ isStale }) => isStale
    ),

    [selectors.isPendingForFetch]: createSelector(
      selectors.error,
      selectors.isPresent,
      selectors.isStale,
      selectors.isLoading,
      selectors.isReadyForRetry,
      selectors.isDependencyResolved,
      (error, isPresent, isStale, isLoading, isReadyForRetry, isDependencyResolved) => {
        if (!isDependencyResolved || isLoading) {
          return false
        }

        if (error) {
          return isReadyForRetry
        }

        return isStale || !isPresent
      }
    ),

    [actionCreators.doFetch]: () => thunkArgs => {
      const { dispatch, store } = thunkArgs
      dispatch({ type: actions.STARTED })

      let getPromiseArgs = thunkArgs
      if (dependenciesEnabled) {
        getPromiseArgs = {
          ...getPromiseArgs,
          ...store[selectors.dependencyValues](),
        }
      }

      return getPromise(getPromiseArgs).then(
        payload => {
          dispatch({ type: actions.FINISHED, payload })
        },
        error => {
          dispatch({ type: actions.FAILED, payload: error })
        }
      )
    },

    [actionCreators.doClear]: () => ({ type: actions.CLEARED }),

    [actionCreators.doMarkAsStale]: () => ({ type: actions.STALE }),

    [actionCreators.doAdjust]: payload => ({ type: actions.ADJUSTED, payload }),

    persistActions: (persist && [actions.FINISHED, actions.CLEARED, actions.EXPIRED]) || null,
  }

  if (expireEnabled) {
    bundle[reactors.shouldExpire] = createSelector(
      selectors.raw,
      'selectAppTime',
      ({ dataAt }, appTime) => {
        if (dataAt && appTime - dataAt > expireAfter) {
          return { type: actions.EXPIRED }
        }
      }
    )
  }

  if (retryEnabled) {
    bundle[reactors.shouldRetry] = createSelector(
      selectors.retryAt,
      selectors.isReadyForRetry,
      'selectAppTime',
      (retryAt, isReadyForRetry, appTime) => {
        if (!isReadyForRetry && retryAt && appTime >= retryAt) {
          return { type: actions.READY_FOR_RETRY }
        }
      }
    )
  }

  if (staleEnabled) {
    bundle[reactors.shouldBecomeStale] = createSelector(
      selectors.raw,
      'selectAppTime',
      ({ dataAt, isStale }, appTime) => {
        if (!isStale && dataAt && appTime - dataAt > staleAfter) {
          return { type: actions.STALE }
        }
      }
    )
  }

  if (dependenciesEnabled) {
    bundle[selectors.dependencyValues] = createSelector(
        selectors.raw,
        ({ dependencyValues }) => dependencyValues
    )

    bundle[selectors.isDependencyResolved] = createSelector(
      selectors.dependencyValues,
      dependencyValues =>
        Boolean(dependencyValues) &&
        dependencyKeys.every(key => {
          const value = dependencyValues[key]
          return blankingDependencyKeys.has(key) || (value !== null && value !== undefined)
        })
    )

    bundle[reactors.shouldUpdateDependencyValues] = createSelector(
      selectors.dependencyValues,
      ...dependencyKeys.map(keyToSelector),
      (dependencyValues, ...nextDependencyValuesList) => {
        const dependenciesChanged =
          !dependencyValues ||
          dependencyKeys.some((key, keyIndex) => dependencyValues[key] !== nextDependencyValuesList[keyIndex])

        if (dependenciesChanged) {
          const payload = nextDependencyValuesList.reduce(
            (hash, value, index) => ({
              ...hash,
              [dependencyKeys[index]]: value,
            }),
            {}
          )
          return { type: actions.DEPENDENCIES_CHANGED, payload }
        }
      }
    )
  } else {
    const blankDependencyValues = []
    bundle[selectors.dependencyValues] = () => blankDependencyValues
    bundle[selectors.isDependencyResolved] = () => true
  }

  return bundle
}

function cookOptionsWithDefaults(inputOptions) {
  if (process.env.NODE_ENV !== 'production') {
    const { name, getPromise } = inputOptions

    if (!name) {
      throw new Error('createAsyncResourceBundle: name parameter is required')
    }

    if (!getPromise) {
      throw new Error('createAsyncResourceBundle: getPromise parameter is required')
    }
  }

  const { dependencyKey, ...options } = { ...Defaults, ...inputOptions }

  if (Array.isArray(dependencyKey) && dependencyKey.length) {
    options.dependencyKeys = dependencyKey
  } else if (dependencyKey) {
    options.dependencyKeys = [dependencyKey]
  } else {
    delete options.dependencyKeys
  }

  if (options.dependencyKeys) {
    Object.assign(
      options,
      options.dependencyKeys.reduce(
        (enhancements, option) => {
          if (typeof option === 'string') {
            enhancements.dependencyKeys.push(option)
          } else {
            const { key, staleOnChange, allowBlank } = option
            if (staleOnChange) {
              enhancements.stalingDependencyKeys.add(key)
            }
            if (allowBlank) {
              enhancements.blankingDependencyKeys.add(key)
            }
            enhancements.dependencyKeys.push(key)
          }
          return enhancements
        },
        {
          dependencyKeys: [],
          stalingDependencyKeys: new Set(),
          blankingDependencyKeys: new Set(),
        }
      )
    )
  }

  return options
}

function changedKeys(left, right) {
  return Object.keys(left).filter(key => left[key] !== right[key])
}
