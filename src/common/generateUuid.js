export default function generateUuid() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ (getRandomValue() & (15 >> (c / 4)))).toString(16)
  )
}

function getRandomValue() {
  if (window && window.crypto) {
    return crypto.getRandomValues(new Uint8Array(1))[0]
  }
  return Math.random() * Math.pow(2, 8)
}
