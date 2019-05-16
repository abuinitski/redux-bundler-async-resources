export function nameToUnderscoreCase(name) {
  return name
    .replace(/\.?([A-Z]+)/g, (x, y) => '_' + y.toLowerCase())
    .replace(/^_/, '')
    .toUpperCase()
}
