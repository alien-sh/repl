const keys = require("./keys");
const stripAnsi = require("strip-ansi");
const toChunks = require("./to-chunks");

class repl {
  constructor({ stdin, stdout, prompts: { prompt, continuation, newline } }) {
    this.stdin = stdin;
    this.stdout = stdout;
    this.openStdin();
    this.y = 0;
    this.x = 0;
    this.currentInput = "";
    this.currentOutput = "";
    this.prompt = prompt || ">>>";
    this.continuation = continuation || ",,,";
    this.newline = newline || "...";
    this.print();
    this.keyEaters = {};
    this.preEaters = [];
    this.preOutput = "";
    this.postOutput = "";
    this.isBusy = false;
  }
  openStdin() {
    this.stdin.setEncoding("utf8");
    this.stdin.setRawMode(true);
    this.stdin.on("data", key => {
      for (const eater of this.preEaters) {
        eater.call(this, key);
      }
      if (this.isBusy) return;
      if (key == keys.up) {
        if (this.y > 0) {
          this.y--;
          this.stdout.write(key);
          const lines = this.currentInput.split(/\n/);
          if (lines.length < this.y + 1) lines.push("");
          const rows = lines.map(line => this.toRows(line));
          const { row } = this.getCurrentLine(rows);
          const rowWidth = row.length;
          this.xTo(Math.min(this.x, rowWidth));
        }
      } else if (key == keys.down) {
        const lines = this.currentInput.split(/\n/);
        if (lines.length < this.y + 1) lines.push("");
        const rows = lines.map(line => this.toRows(line));
        const rowCount = rows.flat().length;
        if (this.y < rowCount - 1) {
          this.y++;
          this.stdout.write(key);
          const lines = this.currentInput.split(/\n/);
          if (lines.length < this.y + 1) lines.push("");
          const rows = lines.map(line => this.toRows(line));
          const { row } = this.getCurrentLine(rows);
          const rowWidth = row.length;
          this.xTo(Math.min(this.x, rowWidth));
        }
      } else if (key == keys.left) {
        if (this.x > 0) {
          this.x--;
          this.stdout.write(key);
        }
      } else if (key == keys.right) {
        const size = this.stdout.columns - stripAnsi(this.prompt).length - 1;
        if (this.x < size) {
          const lines = this.currentInput.split(/\n/);
          if (lines.length < this.y + 1) lines.push("");
          const rows = lines.map(line => this.toRows(line));
          const { row } = this.getCurrentLine(rows);
          if (this.x < row.length) {
            this.x++;
            this.stdout.write(key);
          }
        }
      } else if (key in this.keyEaters) {
        const eaters = this.keyEaters[key];
        for (const eater of eaters) {
          const shouldContinue = eater.call(this, key);
          if (!shouldContinue) break;
        }
      } else if (key != null) {
        this.insertAtCursor(key);
      }
    });
  }
  getCurrentLine(rows) {
    let rowCount = 0;
    let lineIndex = 0;
    let result;
    for (const line of rows) {
      let rowIndex = 0;
      for (const row of line) {
        result = { row, rowIndex, line, lineIndex };
        if (rowCount++ == this.y) {
          return result;
        }
        rowIndex++;
      }
      lineIndex++;
    }
    result.rowIndex++;
    return result;
  }
  insertAtCursor(key) {
    this.clear();
    if (key == keys.return) {
      key = keys.linefeed;
    }
    this.emptyLine = false;
    const promptLength = stripAnsi(this.prompt).length + 1;
    this.isBackspace = false;
    if (key == keys.backspace) {
      this.isBackspace = true;
      if (this.x != 0 || this.y != 0) {
        const lines = this.currentInput.split(/\n/);
        //if (lines.length < this.y + 1) lines.push('')
        const rows = lines.map(line => this.toRows(line));
        const { columns } = this.stdout;
        const size = columns - stripAnsi(this.prompt).length - 1;
        const { row, line, lineIndex, rowIndex } = this.getCurrentLine(rows);
        const currentLine = line.join("");
        const mutatedLine =
          currentLine.slice(0, rowIndex * size + this.x - 1) +
          currentLine.slice(rowIndex * size + this.x);
        if (rowIndex == 0 && this.x == 0) {
          // merge lines
          rows[lineIndex - 1].push(mutatedLine);
          rows.splice(lineIndex, 1);
          const flatLines = rows.map(line => line.join(""));
          this.currentInput = flatLines.join("\n");
          this.y--;
          this.x =
            rows[lineIndex - 1][rows[lineIndex - 1].length - 2].length % size;
        } else if (this.x == 0) {
          // merge rows
          rows[lineIndex] = [mutatedLine];
          const flatLines = rows.map(line => line.join(""));
          this.currentInput = flatLines.join("\n");
          this.y--;
          this.x = rows[lineIndex][rows[lineIndex].length - 1].length % size;
        } else {
          rows[lineIndex] = [mutatedLine];
          const flatLines = rows.map(line => line.join(""));
          this.currentInput = flatLines.join("\n");
          this.x--;
        }
      }
    } else {
      const lines = this.currentInput.split(/\n/);
      const rows = lines.map(line => this.toRows(line));
      const { columns } = this.stdout;
      const size = columns - promptLength;
      const { row, line, lineIndex, rowIndex } = this.getCurrentLine(rows);
      const currentLine = line.join("");
      const mutatedLine =
        currentLine.slice(0, rowIndex * size + this.x) +
        key +
        currentLine.slice(rowIndex * size + this.x);
      rows[lineIndex] = [mutatedLine];
      const flatLines = rows.map(row => row.join(""));
      this.currentInput = flatLines.join("\n");
      this.x++;
      if (key == keys.linefeed) {
        this.y++;
        this.x = 0;
        this.emptyLine = true;
      } else if (this.x == size) {
        this.y++;
        this.x = 0;
        this.emptyLine = true;
      }
    }
    this.currentOutput = this.currentInput;
    this.preprint();
    this.print();
  }
  size() {
    const promptLength = stripAnsi(this.prompt).length + 1;
    const { columns } = this.stdout;
    const size = columns - promptLength;
    return size;
  }
  toRows(line, padding) {
    // returns [lines([rows])]
    padding =
      padding != undefined ? padding : stripAnsi(this.prompt).length - 1;

    const { columns } = this.stdout;
    const size = columns - padding;
    const rows = toChunks(line, size);

    return rows.length ? rows : [""];
  }
  toZero() {
    const promptLength = stripAnsi(this.prompt).length + 1;
    if (this.y) this.stdout.write(`\u001b[${this.y}A`);
    this.stdout.write(`\u001b[${this.x + promptLength}D`);
    if (this.preOutput) {
      const lines = this.preOutput.split(/\n/);
      const rows = lines.map(line => this.toRows(line, 0));
      const rowCount = rows.flat().length;
      if (rowCount) this.stdout.write(`\u001b[${rowCount}A`);
    }
  }
  xTo(x) {
    const dir = x - this.x > 0 ? "C" : "D";
    const dx = Math.abs(x - this.x);
    if (dx != 0) {
      this.stdout.write(`\u001b[${dx}${dir}`);
      this.x = x;
    }
  }
  toZeroFromEnd() {
    if (this.postOutput) {
      const lines = this.postOutput.split(/\n/);
      const rows = lines.map(line => this.toRows(line, 0));
      const flatRows = rows.flat();
      const rowCount = flatRows.length;
      const { columns } = this.stdout;
      const lastRow = flatRows[flatRows.length - 1];
      const x = stripAnsi(lastRow).length;
      if (rowCount) this.stdout.write(`\u001b[${rowCount}A`);
      if (x) this.stdout.write(`\u001b[${x}D`);
    }
    const lines = this.currentOutput.split(/\n/);
    const rows = lines.map(line => this.toRows(line));
    const flatRows = rows.flat();
    const rowCount = flatRows.length;
    const promptLength = stripAnsi(this.prompt).length + 1;
    const { columns } = this.stdout;
    const size = columns - promptLength;
    const x = stripAnsi(flatRows.pop()).length;
    const y = rowCount - (size == x ? 0 : 1);
    if (y) this.stdout.write(`\u001b[${y}A`);
    if (x) this.stdout.write(`\u001b[${x}D`);
  }
  eraseLine() {
    this.stdout.write("\u001b[K");
  }
  clear() {
    this.toZero();
    this.stdout.write("\u001b[J");
  }
  print() {
    if (this.preOutput) {
      this.stdout.write(this.preOutput + "\n");
    }
    const lines = this.currentOutput.split(/\n/);
    const rows = lines.map(line => this.toRows(line));
    const rowCount = rows.flat().length;
    const [firstLine, ...rest] = rows;
    this.stdout.write(this.prompt + " ");
    this.stdout.write(firstLine.shift());
    for (const row of firstLine) {
      this.stdout.write("\n" + this.continuation + " " + row);
    }
    for (const line of rest) {
      const [firstRow, ...rest] = line;
      this.stdout.write("\n" + this.newline + " " + firstRow);
      for (const row of rest) {
        this.stdout.write("\n" + this.continuation + " " + row);
      }
    }
    if (this.y == rowCount) {
      this.stdout.write("\n" + this.continuation + " ");
    }
    if (this.postOutput) {
      this.stdout.write("\n" + this.postOutput);
    }
    this.toZeroFromEnd();
    if (this.postOutput) {
      const promptLength = stripAnsi(this.prompt).length + 1;
      for (let i = 0; i < promptLength; i++) {
        this.stdout.write(keys.right);
      }
    }
    for (let i = 0; i < this.x; i++) {
      this.stdout.write(keys.right);
    }
    for (let i = 0; i < this.y; i++) {
      this.stdout.write(keys.down);
    }
    if (this.y == rowCount) {
      Array(promptLength)
        .fill(null)
        .map(i => this.stdout.write(keys.right));
    }
  }
  preprint() {
    /*
      You probably want to
      overwrite this function
      by subclassing this
    */
  }
}

module.exports = repl;
