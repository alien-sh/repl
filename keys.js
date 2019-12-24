module.exports = {
  up: '\u001b[A',
  down: '\u001b[B',
  left: '\u001b[D',
  right: '\u001b[C',
  return: '\r',
  linefeed: '\n',
  tab: '\t',
  backspace: String.fromCharCode(127),
  ctrl: {
    c: '\u0003'
  }
};

/*
  Position the Cursor: \033[<L>;<C>H or \033[<L>;<C>f (puts the cursor at line L and column C)
  Move the cursor up N lines: \033[<N>A
  Move the cursor down N lines: \033[<N>B
  Move the cursor forward N columns: \033[<N>C
  Move the cursor backward N columns: \033[<N>D
  Clear the screen, move to (0,0): \033[2J
  Erase to end of line: \033[K
  Save cursor position: \033[s
  Restore cursor position: \033[u
  \u001b == \033
  http://ascii-table.com/ansi-escape-sequences-vt-100.php
*/