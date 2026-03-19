# Script Compatibility — Mango 5.7.x

Status key:
- ✅ **Compatible** — tested and working
- ❌ **Broken** — tested, needs fixes
- ⚠️ **Untested** — not yet evaluated
- 🚫 **N/A** — not a standalone runnable script (template or intentionally dangerous)

---

## `diagnostic/` — Read-only inspection
Scripts that only read and report on Mango state. Safe to run at any time with no side effects.

| Script | Status | Notes |
|---|---|---|
| `checkPointDataTypes.js` | ⚠️ | |
| `detectPointValueCacheProxy.js` | ⚠️ | |
| `event-count-monitoring.js` | ⚠️ | |
| `findDuplicateLineProtocolPoints.js` | ⚠️ | |
| `get_point_values.js` | ⚠️ | |
| `getLogConfigFile.js` | ⚠️ | |
| `getPointAttributes.js` | ⚠️ | |
| `hasSpaceXidCheck.js` | ⚠️ | |
| `ias_tsdb_lock_owner.js` | ⚠️ | |
| `list-http-sessions.js` | ⚠️ | |
| `ping-data-source.js` | ⚠️ | |
| `printStackTraceWorkerThread.js` | ⚠️ | |
| `query_points.js` | ⚠️ | |
| `relfectionExample.js` | ⚠️ | |
| `running-publisher-points.js` | ⚠️ | |
| `track-mango-details.js` | ⚠️ | |

---

## `logging/` — Logging and JVM configuration
Scripts that adjust log levels or trigger JVM-level operations. Reversible and low risk.

| Script | Status | Notes |
|---|---|---|
| `clear-jetty-buffer-pool.js` | ⚠️ | |
| `increase_log_level.js` | ⚠️ | |
| `submitWorkItem.js` | ⚠️ | |
| `suggestGarbageCollection.js` | ⚠️ | |

---

## `export/` — Export and reporting
Scripts that generate output (CSV, JSON, etc.) or serve data via the HTTP response. Read-only with respect to Mango state.

| Script | Status | Notes |
|---|---|---|
| `convert_server_configuration_to_simulation.js` | ⚠️ | Generates import JSON |
| `convert_to_virtual.js` | ⚠️ | Generates import JSON |
| `echo-json.js` | ⚠️ | Requires `Access request/response objects` permission |
| `export_users_csv.js` | ⚠️ | |
| `globalContext.js` | ⚠️ | Demonstrates shared script bindings |
| `httpGetRequest.js` | ⚠️ | Makes outbound HTTP request |
| `point-value-report-csv.js` | ⚠️ | |
| `runPurgeDefinition.js` | ⚠️ | |

---

## `modify/` — Modify existing data
Scripts that update existing entities (permissions, point values, configurations, VO fields). Run on a dev/test instance.

| Script | Status | Notes |
|---|---|---|
| `Remove_Duplicated_SeriesId.js` | ⚠️ | |
| `add_role_to_read_permission.js` | ⚠️ | |
| `change_event_detectors.js` | ⚠️ | |
| `check-and-set-unreliable.js` | ⚠️ | Requires `virtual-container.json` in same dir |
| `delete-point-values.js` | ⚠️ | Has `dryRun = true` by default |
| `deserialize-data-column.js` | ⚠️ | |
| `eventHandlersPermissionRolesChange.js` | ⚠️ | |
| `modifyEventHandler.js` | ⚠️ | |
| `modifyModbusDataSources.js` | ⚠️ | Requires Modbus module |
| `modifyVoJsonDataField.js` | ⚠️ | |
| `restart-points.js` | ⚠️ | |
| `set-unreliable-data-point-to-default-value.js` | ⚠️ | |
| `setDataPointValueToZero.js` | ⚠️ | Requires CSV input file |
| `setPointValueToInfinity.js` | ⚠️ | Hardcoded point ID — update before running |
| `unreliable-data-source.js` | ⚠️ | |
| `updateSqlTable.js` | ⚠️ | Direct SQL write — use with caution |
| `upgradeDataPoints.js` | ⚠️ | |

---

## `create-delete/` — Create and delete entities
Scripts that insert or remove data sources, data points, or publishers. Run on a dev/test instance. Counts have been reduced to small values for compatibility testing.

| Script | Status | Notes |
|---|---|---|
| `copy-mango-data-point-REST.js` | ⚠️ | Uses REST API internally |
| `copy_data_source.js` | ⚠️ | Requires template DS XID — update `DS_XYZ` before running |
| `create-data-points.js` | ⚠️ | Requires template point XID — update before running; scaled to 5 points |
| `create-points-async.js` | ⚠️ | Scaled to 1 DS × 3 points |
| `create-points-events-comments.js` | ⚠️ | Scaled to 3 points × 3 events |
| `create-tag-config.js` | ⚠️ | Requires template point XID — update before running; scaled to 5 points |
| `delete-data-points.js` | ⚠️ | Requires `data-points-to-delete.csv` in default filestore |
| `delete-data-source.js` | ⚠️ | Requires `data-source-to-delete.csv` in default filestore |

---

## `benchmarking/` — Performance and load testing
Scripts that create large volumes of data or simulate high-throughput scenarios. Only run on a dedicated test instance. Counts have been reduced to small values for compatibility testing.

| Script | Status | Notes |
|---|---|---|
| `create-datapoint-events.js` | ⚠️ | |
| `create-datapoints.js` | ⚠️ | Scaled to 3 points/DS; requires `BENCHMARK_READ`/`BENCHMARK_EDIT` roles (run `create-users.js` first) |
| `create-users.js` | ⚠️ | Creates 2 roles + 1 benchmark user; idempotent |
| `generatePointValues.js` | ⚠️ | Requires specific point XIDs — update before running |
| `generatePointValues_rad-3843.js` | ⚠️ | Scaled to 30 minutes history; requires specific point XIDs |
| `query-benchmarks.js` | ⚠️ | |
| `setup-performance-test-datasources.js` | ⚠️ | Requires Persistent TCP module |
| `setup-performance-test-publishers.js` | ⚠️ | Requires Persistent TCP module |
| `setup-performance-test-publishers-v5.js` | ⚠️ | Mango 5.x version; requires Persistent TCP module |
| `v4_generatePublisherJsonFromUnpublishedPoints.js` | ⚠️ | |

---

## `event-detectors/` — Event detector management
Scripts that create, edit, or delete event detectors on data points.

| Script | Status | Notes |
|---|---|---|
| `create-event-detectors.js` | ⚠️ | |
| `delete-event-detectors.js` | ⚠️ | |
| `edit-event-detectors.js` | ⚠️ | |

---

## `event-handlers/` — Event handler templates
These are **not standalone scripts**. Load them into a Script-type event handler in the Mango UI.

| Script | Status | Notes |
|---|---|---|
| `event_handler.js` | 🚫 | Template — attach to an event handler |
| `event_handler_publisher_delay_logging.js` | 🚫 | Template — attach to an event handler |
| `event_handler_with_timeout.js` | 🚫 | Template — attach to an event handler |

---

## `meta-points/` — Meta point scripts
These are **not standalone scripts**. Use them as the script body in a Meta data point.

| Script | Status | Notes |
|---|---|---|
| `maintenance_event_detection_global_script.js` | 🚫 | Meta point script |
| `meta-script-to-use-maintenance-event-service.js` | 🚫 | Meta point script |

---

## Root — Utility scripts
Scripts at the root level that don't fit a specific group or are special-purpose.

| Script | Status | Notes |
|---|---|---|
| `clearCaches.js` | ✅ | Fixed: use `runtimeContext` binding; `clearCaches(boolean force)` now required |
| `crashMangoOOM.js` | 🚫 | **Intentionally crashes Mango with OOM — do not run** |
