const toChars = str =>
  str.match(/([\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d\\/#&.:=?%@~_]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-ntqry=><~])))*./g)

const toChunks = (str, size) => {
  const chars = toChars(str)
  if (!chars) return []
  let chunks = [], chunk = []
  for (const char of chars) {
    if (chunk.length == size) {
      chunks.push(chunk.join(''))
      chunk = []
    } else {
      chunk.push(char)
    }
  }
  if (chunk.length) {
    chunks.push(chunk.join(''))
  }
  return chunks
}

module.exports = toChunks