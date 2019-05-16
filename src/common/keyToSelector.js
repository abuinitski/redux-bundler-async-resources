import nameToCapitalizedCase from './nameToCapitalizedCase'

export default function keyToSelector(key) {
  return `select${nameToCapitalizedCase(key)}`
}
