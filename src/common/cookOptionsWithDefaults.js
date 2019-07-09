export default function cookOptionsWithDefaults(inputOptions, defaults) {
  if (process.env.NODE_ENV !== 'production') {
    const { name, getPromise } = inputOptions

    if (!name) {
      throw new Error('resource bundle factory: name parameter is required')
    }

    if (!getPromise) {
      throw new Error('resource bundle factory: getPromise parameter is required')
    }
  }

  return { ...defaults, ...inputOptions }
}
