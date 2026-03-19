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

## Script Index

### `diagnostic/` — Read-only inspection
Scripts that only read and report on Mango state. Safe to run at any time with no side effects.

| Script | Description |
|---|---|
| [checkPointDataTypes.js](diagnostic/checkPointDataTypes.js) | Validates that running data points' current values match their configured data types |
| [detectPointValueCacheProxy.js](diagnostic/detectPointValueCacheProxy.js) | Prints the class name and write rate of the point value cache proxy |
| [event-count-monitoring.js](diagnostic/event-count-monitoring.js) | Monitors event counts by type and sets alarm data points based on thresholds |
| [findDuplicateLineProtocolPoints.js](diagnostic/findDuplicateLineProtocolPoints.js) | Identifies duplicate measurement-field key combinations on a data source (requires Line Protocol module) |
| [get_point_values.js](diagnostic/get_point_values.js) | Retrieves and prints point values for all data points from the last month |
| [getLogConfigFile.js](diagnostic/getLogConfigFile.js) | Retrieves and prints the current Log4j logging configuration |
| [hasSpaceXidCheck.js](diagnostic/hasSpaceXidCheck.js) | Checks all XIDs across data points, data sources, roles, publishers, event handlers, and users for spaces |
| [ias_tsdb_lock_owner.js](diagnostic/ias_tsdb_lock_owner.js) | Uses reflection to access and print the lock owner from the IAS TSDB implementation |
| [list-http-sessions.js](diagnostic/list-http-sessions.js) | Lists all active HTTP sessions with username, session ID, last request time, and expiration status |
| [printStackTraceWorkerThread.js](diagnostic/printStackTraceWorkerThread.js) | Prints stack traces for worker threads in the medium priority thread pool |
| [query_points.js](diagnostic/query_points.js) | Queries and exports data points from the 'Mango Internal' device as JSON |
| [relfectionExample.js](diagnostic/relfectionExample.js) | Demonstrates reflection access to the EventManager's private fields |
| [running-publisher-points.js](diagnostic/running-publisher-points.js) | Investigates which points are running on a specific publisher using reflection |

### `logging/` — Logging and JVM configuration
Scripts that adjust log levels or trigger JVM-level operations. Reversible and low risk.

| Script | Description |
|---|---|
| [clear-jetty-buffer-pool.js](logging/clear-jetty-buffer-pool.js) | Mitigates a Jetty buffer pool memory bug (versions 9.4.36–9.4.45) by clearing WebSocket buffer pools |
| [increase_log_level.js](logging/increase_log_level.js) | Changes the log level for a specific logger to DEBUG |
| [submitWorkItem.js](logging/submitWorkItem.js) | Submits work items to the medium priority thread pool |
| [suggestGarbageCollection.js](logging/suggestGarbageCollection.js) | Suggests garbage collection and provides jcmd instructions for GC logging |

### `export/` — Export and reporting
Scripts that generate output (CSV, JSON, etc.) or serve data via the HTTP response. Read-only with respect to Mango state.

| Script | Description |
|---|---|
| [convert_server_configuration_to_simulation.js](export/convert_server_configuration_to_simulation.js) | Reads a Mango configuration export and converts non-virtual data sources to virtual for simulation |
| [convert_to_virtual.js](export/convert_to_virtual.js) | Converts data sources and their data points to virtual data sources with simulated change types |
| [echo-json.js](export/echo-json.js) | Reads JSON from the request body and echoes it back in the response |
| [export_users_csv.js](export/export_users_csv.js) | Exports users matching an organization query to a downloadable CSV file |
| [globalContext.js](export/globalContext.js) | Demonstrates shared memory with locks and timer tasks across script executions |
| [httpGetRequest.js](export/httpGetRequest.js) | Makes an HTTP GET request to Mango using token auth to retrieve users |
| [point-value-report-csv.js](export/point-value-report-csv.js) | Queries matching data points and exports the last 12 hours of minutely rollup data to CSV |
| [runPurgeDefinition.js](export/runPurgeDefinition.js) | Executes a purge definition from the module registry (requires Access module) |

### `modify/` — Modify existing data
Scripts that update existing entities (permissions, point values, configurations). Run on a dev/test instance.

| Script | Description |
|---|---|
| [Remove_Duplicated_SeriesId.js](modify/Remove_Duplicated_SeriesId.js) | Finds data points with duplicate series IDs from a CSV and assigns unique series IDs |
| [add_role_to_read_permission.js](modify/add_role_to_read_permission.js) | Adds a role to the read permissions for a set of data points |
| [change_event_detectors.js](modify/change_event_detectors.js) | Converts UPDATE type event detectors to MULTISTATE_STATE detectors |
| [check-and-set-unreliable.js](modify/check-and-set-unreliable.js) | Finds unreliable data points in a data source and sets their values to -1 |
| [delete-point-values.js](modify/delete-point-values.js) | Deletes point values for matching data points within a time range (`dryRun = true` by default) |
| [deserialize-data-column.js](modify/deserialize-data-column.js) | Queries the publishers table via jOOQ and deserializes the data column to modify permissions |
| [eventHandlersPermissionRolesChange.js](modify/eventHandlersPermissionRolesChange.js) | Modifies event handler script roles and permissions |
| [modifyEventHandler.js](modify/modifyEventHandler.js) | Updates an event handler's script to load from an external file in the filestore |
| [modifyModbusDataSources.js](modify/modifyModbusDataSources.js) | Updates the max read register count for Modbus data sources matching a name pattern |
| [modifyVoJsonDataField.js](modify/modifyVoJsonDataField.js) | Modifies the JSON data field of a user object |
| [restart-points.js](modify/restart-points.js) | Restarts/enables a group of data points read from a CSV file |
| [set-unreliable-data-point-to-default-value.js](modify/set-unreliable-data-point-to-default-value.js) | Sets unreliable numeric data points that haven't updated recently to a default value |
| [setDataPointValueToZero.js](modify/setDataPointValueToZero.js) | Sets multistate data point values to zero for points listed in a CSV file |
| [setPointValueToInfinity.js](modify/setPointValueToInfinity.js) | Sets a data point's value to positive infinity (update `pointId` before running) |
| [updateSqlTable.js](modify/updateSqlTable.js) | Modifies a database table column default value using jOOQ — use with caution |
| [upgradeDataPoints.js](modify/upgradeDataPoints.js) | Updates data points with specific names to MULTISTATE data type |

### `create-delete/` — Create and delete entities
Scripts that insert or remove data sources, data points, or publishers. Run on a dev/test instance.

| Script | Description |
|---|---|
| [copy-mango-data-point-REST.js](create-delete/copy-mango-data-point-REST.js) | Fetches a data point via REST API, modifies it, and creates a new point on the same data source |
| [copy_data_source.js](create-delete/copy_data_source.js) | Copies a data source and all its data points, creating a disabled duplicate with new XIDs |
| [create-data-points.js](create-delete/create-data-points.js) | Clones a template data point and adds copies to a Persistent TCP publisher |
| [create-points-async.js](create-delete/create-points-async.js) | Creates virtual data sources with points using async insertion and optional historical data generation |
| [create-points-events-comments.js](create-delete/create-points-events-comments.js) | Creates virtual data sources with points, sample events, and user comments for testing |
| [create-tag-config.js](create-delete/create-tag-config.js) | Creates data points from a template with randomly assigned tags |
| [delete-data-points.js](create-delete/delete-data-points.js) | Deletes a group of data points read from a CSV file |
| [delete-data-source.js](create-delete/delete-data-source.js) | Deletes a group of data sources read from a CSV file |

### `benchmarking/` — Performance and load testing
Scripts for high-throughput scenarios. Only run on a dedicated test instance.

| Script | Description |
|---|---|
| [create-datapoint-events.js](benchmarking/create-datapoint-events.js) | Creates sample events for data points with event detectors for benchmarking |
| [create-datapoints.js](benchmarking/create-datapoints.js) | Creates virtual data sources with points, tags, event detectors, and optional publishers |
| [create-users.js](benchmarking/create-users.js) | Creates benchmark roles and a non-admin benchmark user (idempotent) |
| [generatePointValues.js](benchmarking/generatePointValues.js) | Generates historical point values for specified points over a configurable time period |
| [generatePointValues_rad-3843.js](benchmarking/generatePointValues_rad-3843.js) | Generates random numeric point values over the past 30 minutes at 5-second intervals |
| [query-benchmarks.js](benchmarking/query-benchmarks.js) | Runs performance benchmarks on data point tag queries with admin and non-admin users |
| [setup-performance-test-datasources.js](benchmarking/setup-performance-test-datasources.js) | Creates Persistent TCP data sources configured for performance testing |
| [setup-performance-test-publishers.js](benchmarking/setup-performance-test-publishers.js) | Creates virtual data sources with points and Persistent TCP publishers for performance testing |
| [setup-performance-test-publishers-v5.js](benchmarking/setup-performance-test-publishers-v5.js) | Mango 5.x version with tags, permissions, event detectors, and published points |
| [v4_generatePublisherJsonFromUnpublishedPoints.js](benchmarking/v4_generatePublisherJsonFromUnpublishedPoints.js) | Reads unpublished data points from CSV and generates JSON for distributing them across publishers |

### `event-detectors/` — Event detector management
Scripts that create, edit, or delete event detectors on data points.

| Script | Description |
|---|---|
| [create-event-detectors.js](event-detectors/create-event-detectors.js) | Creates event detectors from a CSV file supporting multiple detector types and configurations |
| [delete-event-detectors.js](event-detectors/delete-event-detectors.js) | Deletes event detectors listed in a CSV file after validating ID and XID match |
| [edit-event-detectors.js](event-detectors/edit-event-detectors.js) | Edits event detector properties (name, limits, alarm levels, duration, handlers) from a CSV file |

### `event-handlers/` — Event handler templates
These are **not standalone scripts**. Load them into a Script-type event handler in the Mango UI.

| Script | Description |
|---|---|
| [event_handler.js](event-handlers/event_handler.js) | Template with callbacks for event raised, acknowledged, and inactive |
| [event_handler_publisher_delay_logging.js](event-handlers/event_handler_publisher_delay_logging.js) | Logs publisher delays between point value timestamp and processing time |
| [event_handler_with_timeout.js](event-handlers/event_handler_with_timeout.js) | Demonstrates setTimeout/clearTimeout usage in an event handler |

### `meta-points/` — Meta point scripts
These are **not standalone scripts**. Use them as the script body in a Meta data point.

| Script | Description |
|---|---|
| [getPointAttributes.js](meta-points/getPointAttributes.js) | Checks if a data point has the UNRELIABLE attribute set |
| [maintenance_event_detection_global_script.js](meta-points/maintenance_event_detection_global_script.js) | Retrieves active maintenance events and checks at the watchlist level |
| [meta-script-to-use-maintenance-event-service.js](meta-points/meta-script-to-use-maintenance-event-service.js) | Checks for active maintenance events at data source, data point, and watchlist levels |
| [ping-data-source.js](meta-points/ping-data-source.js) | Pings hosts specified in point tags and populates meta-point values with ping statistics |
| [track-mango-details.js](meta-points/track-mango-details.js) | Tracks system details (Java version, Mango version, OS info) as meta-point values |
| [unreliable-data-source.js](meta-points/unreliable-data-source.js) | Counts unreliable data points per data source and sets meta-point values accordingly |

### Root — Utility scripts

| Script | Description |
|---|---|
| [clearCaches.js](clearCaches.js) | Clears all in-memory caches — useful when modifying cached entity databases directly |
| [crashMangoOOM.js](crashMangoOOM.js) | **Intentionally crashes Mango with OOM — do not run** |

---

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

