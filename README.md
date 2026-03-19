# script-examples
Script examples for the Mango backend script engine (Graal.js). These scripts run server-side within the JVM and have direct access to Mango's Java APIs.

## Documentation

- [Writing scripts](docs/writing-scripts.md) — How to write filestore scripts: bindings, queries, output, file I/O, HTTP, and more
- [Services reference](docs/services-reference.md) — Complete reference for the `services` and `runtimeContext` bindings
- [Common recipes](docs/recipes.md) — Copy-paste patterns for common tasks (CSV export, point values, HTTP requests, etc.)
- [Compatibility / Migration guide](docs/compatibility.md) — 5.7.x migration guide and per-script compatibility status

## Script event handler
You can use a script as an event handler. Choose the "Script" event handler type. Check the [event handler examples](event-handlers/) for details on how to implement the event handler.

![image](https://user-images.githubusercontent.com/3579645/86482265-d9d49180-bd0e-11ea-82b3-73fa08626e59.png)

## Running the scripts
Save the script file into a file store. When you edit the file you will see a button at the top which you can click to run the file using the selected script engine. A popup dialog will appear and show you the result of running the script.

![image](https://user-images.githubusercontent.com/3579645/82088124-6d45fa80-96ae-11ea-9702-34637e5d0902.png)

## Running scripts via the CLI (`eval_script.py`)

`eval_script.py` is a Python 3 command-line tool that executes a filestore script against the Mango REST API without opening the UI.

### Requirements

- Python 3.6+, no third-party packages needed

### Authentication

**Bearer token:**
```bash
python3 eval_script.py default/script-examples/clearCaches.js --token <token>
```

**Username / password** (creates a session automatically):
```bash
python3 eval_script.py default/script-examples/clearCaches.js --username admin --password admin
```

### Base URL

The default base URL is `http://localhost:8080`. Override it with `--url`:
```bash
python3 eval_script.py default/script-examples/clearCaches.js \
  --url https://developer.radixiot.app:8443 \
  --username admin --password admin
```

### All options

| Option | Description |
|---|---|
| `script_path` | Filestore-relative path, e.g. `default/script-examples/clearCaches.js` |
| `--url` | Mango base URL (default: `http://localhost:8080`) |
| `--token` | Bearer token |
| `--username` / `--password` | Credentials (fetches a session automatically) |
| `--engine` | Script engine: `nashorn`, `graal.js`, etc. |
| `--body` | Request body string, or `@filename` to read from a file |
| `--roles` | Comma-separated role XIDs to run the script with |
| `--verbose` / `-v` | Print HTTP status and response headers to stderr |

### Examples

```bash
# Run clearCaches.js with verbose output
python3 eval_script.py default/script-examples/clearCaches.js \
  --url https://developer.radixiot.app:8443 \
  --username admin --password admin --verbose

# Run a script with a specific engine
python3 eval_script.py default/script-examples/myScript.js \
  --token <token> --engine graal.js

# Pass a request body from a file (available as `reader` in the script)
python3 eval_script.py default/script-examples/myScript.js \
  --token <token> --body @input.json
```

