const repl = require('./index')
const chalk = require('chalk')

function getWordAt(str, pos) {

  // Perform type conversions.
  str = String(str);
  pos = Number(pos) >>> 0;

  // Search for the word's beginning and end.
  var left = str.slice(0, pos + 1).search(/\S+$/),
    right = str.slice(pos).search(/\s/);

  // The last word in the string is a special case.
  if (right < 0) {
    return str.slice(left);
  }

  // Return the word, using the located bounds to postct it from the string.
  return str.slice(left, right + pos);

}

// custom repl example
class FancyRepl extends repl {
  constructor(...args) {
    super(...args)
    // simple auto complete example
    this.keyEaters['('] = [
      function (key) {
        this.insertAtCursor(key)
        this.insertAtCursor(')')
        this.clear()
        this.x--
        this.preprint()
        this.print()
      }
    ]
    // simple autocomplete
    const autoComplete = ['test', 'tim', 'tom']
    let currentIndex = 0
    let tabbing = false
    this.preEaters.push(function (key) {
      if (!['\t', '\r'].includes(key)) {
        currentIndex = 0
        tabbing = false
      }
    })
    this.preEaters.push(function (key) {
      this.postOutput = ''
      if (key.trim) {
        this.lastKey = key
      }
    })
    this.keyEaters['\t'] = [
      function (key) {
        const position = this.y + this.x * this.size()
        const word = getWordAt(this.currentInput, position)
        this.clear()
        if (word == 't') {
          tabbing = true
          this.postOutput = '\n' + autoComplete.map((item, index) => {
            if (index == currentIndex) {
              return chalk.bgWhiteBright(' ' + item + ' ')
            }
            return ' ' + item + ' '
          }).join('  ')
          currentIndex++
          if (currentIndex > autoComplete.length - 1) {
            currentIndex = 0
          }
        }
        this.preprint()
        this.print()
      }
    ]
    this.keyEaters['\r'] = [
      function (key) {
        if (tabbing) {
          const index = currentIndex == 0 ? autoComplete.length - 1 : currentIndex - 1
          const word = autoComplete[index]
          for (const char of word.slice(1)) {
            this.insertAtCursor(char)
          }
          this.clear()
          this.preprint()
          this.print()
        } else {
          this.insertAtCursor(key)
        }
        tabbing = false
      }
    ]
  }
  preprint() {
    // simple highlighting example
    this.currentOutput = this.currentOutput
      .replace(/\(/g, chalk.red('('))
      .replace(/\)/g, chalk.red(')'))
    // simple top bar example
    this.preOutput = `Input length: ${this.currentInput.length} characters\nLast key: ${this.lastKey}`
  }
}

const { stdin, stdout } = process
const options = {
  stdin, stdout,
  prompts: {
    prompt: chalk.green('>>>'),
    newline: chalk.rgb(200, 200, 200)('...'),
    continuation: chalk.rgb(100, 100, 100)('...')
  }
}

const start = () => new FancyRepl(options)

start()