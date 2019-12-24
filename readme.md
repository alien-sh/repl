# @alien.sh/repl

This is a KISS (Well, I tried) repl. Has the following features:

* Multiline input
* 3 different prompt types: `prompt`, `newline` and line `continuation`
* Hooks (To add extra functionality)

Extra features need to be added via hooks (Or by subclassing the repl, or both).

## Demo

Run

```bash
node demo.js
```

For a simple demo. This demo adds the following features:

* Automatically inserts a ) after (
* A simple tab completion
* Highlights ( and )
* A simple status bar above the prompt

For more complete demos and examples, check out Clio and alien.sh repls.
