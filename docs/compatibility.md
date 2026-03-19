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
| `checkPointDataTypes.js` | ✅ | Fixed: `Common.runtimeManager` → `runtimeContext.getBean(RuntimeManager.class)`; added null guard for points with no current value |
| `detectPointValueCacheProxy.js` | ❌ | `getPointValueCacheDao()` removed from `DatabaseProxy` API with no replacement |
| `event-count-monitoring.js` | ✅ | Runs cleanly; prints warnings if configured data points don't exist (expected on fresh instances) |
| `findDuplicateLineProtocolPoints.js` | ❌ | Requires Line Protocol module; `getMeasurement()` does not exist on other locator types |
| `get_point_values.js` | ✅ | Fixed: `Common.getBean()` → `runtimeContext.getBean(PointValueDao.class)` |
| `getLogConfigFile.js` | ✅ | |
| `hasSpaceXidCheck.js` | ✅ | |
| `ias_tsdb_lock_owner.js` | ✅ | Fixed: `Common.getBean()` → `runtimeContext.getBean(PointValueDao.class)`; requires TSDB module |
| `list-http-sessions.js` | ✅ | |
| `printStackTraceWorkerThread.js` | ❌ | `ThreadPoolExecutor$Worker` access blocked by Graal.js security sandbox; cannot be fixed |
| `query_points.js` | ✅ | |
| `relfectionExample.js` | ✅ | Fixed: `Common.eventManager` → `runtimeContext.getBean(EventManager.class)` |
| `running-publisher-points.js` | ⚠️ | Script is compatible; update hardcoded `publisherXid` to a real value before running |

---

## `logging/` — Logging and JVM configuration
Scripts that adjust log levels or trigger JVM-level operations. Reversible and low risk.

| Script | Status | Notes |
|---|---|---|
| `clear-jetty-buffer-pool.js` | ❌ | Fixed `Common.getBean()` → `runtimeContext.getBean(Lifecycle.class)`; blocked by Graal.js sandbox: `MangoWebSocketHandshakeHandler` class access not permitted |
| `increase_log_level.js` | ✅ | |
| `submitWorkItem.js` | ✅ | Fixed: `Common.backgroundProcessing` → `runtimeContext.getBean(BackgroundProcessing.class)`; `WorkItemPriority` int constants → enum values |
| `suggestGarbageCollection.js` | ✅ | |

---

## `export/` — Export and reporting
Scripts that generate output (CSV, JSON, etc.) or serve data via the HTTP response. Read-only with respect to Mango state.

| Script | Status | Notes                                                                                                                                                                         |
|---|---|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `convert_server_configuration_to_simulation.js` | ⚠️ | Requires `export.json` in default filestore; script itself is compatible                                                                                                      |
| `convert_to_virtual.js` | ✅ |                                                                                                                                                                               |
| `echo-json.js` | ✅ | Requires JSON body in POST request; requires `Access request/response objects` permission                                                                                     |
| `export_users_csv.js` | ✅ |                                                                                                                                                                               |
| `globalContext.js` | ❌ | `hasBinding`/`addBinding`/`getBinding`/`removeBinding` do not exist in filestore script context; no replacement available requires https://github.com/RadixIoT/mango/pull/994 |
| `httpGetRequest.js` | ✅ | Fixed: `HttpBuilder` not available in filestore scripts → `java.net.http.HttpClient`                                                                                          |
| `point-value-report-csv.js` | ✅ | Fixed: `Common.getMillis()` removed → JS arithmetic; `HttpBuilder` → `java.net.http.HttpClient`                                                                               |
| `runPurgeDefinition.js` | ✅ | Fixed: `ModuleRegistry` sandbox-blocked → `runtimeContext.getBean()`; `Common.timer` → `ZonedDateTime.now()`; requires Access module                                          |

---

## `modify/` — Modify existing data
Scripts that update existing entities (permissions, point values, configurations, VO fields). Run on a dev/test instance.

| Script | Status | Notes |
|---|---|---|
| `Remove_Duplicated_SeriesId.js` | ✅ | Fixed: `Common.getBean()` → `runtimeContext.getBean()`; requires `9999.csv` in default filestore |
| `add_role_to_read_permission.js` | ✅ | |
| `change_event_detectors.js` | ✅ | Fixed: `ModuleRegistry` sandbox-blocked → `runtimeContext.getBean()`; `Common.TimePeriods` still works |
| `check-and-set-unreliable.js` | ✅ | Fixed: `Common.runtimeManager` → `runtimeContext.getBean(RuntimeManager.class)`; `Common.timer` → `System.currentTimeMillis()`; requires hardcoded XIDs and `virtual-container.json` |
| `delete-point-values.js` | ✅ | Fixed: `Common.getBean()` → `runtimeContext.getBean()`; `Common.runtimeManager` → `runtimeContext.getBean(RuntimeManager.class)`; has `dryRun = true` by default |
| `deserialize-data-column.js` | ✅ | Fixed: `Common.getBean(DatabaseProxy)` → `runtimeContext.getBean(DatabaseProxy.class)` |
| `eventHandlersPermissionRolesChange.js` | ✅ | |
| `modifyEventHandler.js` | ✅ | Update hardcoded event handler XID before running |
| `modifyModbusDataSources.js` | ✅ | Requires Modbus module |
| `modifyVoJsonDataField.js` | ✅ | Fixed: `Common.getBean(ObjectMapper, name)` → `runtimeContext.getBean(name, ObjectMapper.class)` |
| `restart-points.js` | ✅ | Requires `data-points-to-restart.csv` in default filestore |
| `set-unreliable-data-point-to-default-value.js` | ✅ | |
| `setDataPointValueToZero.js` | ✅ | Fixed: `Common.runtimeManager` → `runtimeContext.getBean(RuntimeManager.class)`; `Common.timer` → `System.currentTimeMillis()`; requires CSV |
| `setPointValueToInfinity.js` | ✅ | Fixed: `Common.runtimeManager` → `runtimeContext.getBean(RuntimeManager.class)`; `Common.timer` → `System.currentTimeMillis()`; hardcoded point ID |
| `updateSqlTable.js` | ✅ | Fixed: `Common.databaseProxy` → `runtimeContext.getBean(DatabaseProxy.class)`; direct SQL — use with caution |
| `upgradeDataPoints.js` | ✅ | Fixed: `DataTypes` sandbox-blocked → `DataType` enum |

---

## `create-delete/` — Create and delete entities
Scripts that insert or remove data sources, data points, or publishers. Run on a dev/test instance. Counts have been reduced to small values for compatibility testing.

| Script | Status | Notes |
|---|---|---|
| `copy-mango-data-point-REST.js` | ✅ | Fixed: `HttpBuilder` → `java.net.http.HttpClient`; requires valid token and point XID |
| `copy_data_source.js` | ✅ | Update `DS_XYZ` to a real XID before running |
| `create-data-points.js` | ✅ | Requires template point XID — update before running; scaled to 5 points |
| `create-points-async.js` | ✅ | Fixed: `ModuleRegistry` → `runtimeContext.getBean()`; `Common.getBean()` → `runtimeContext.getBean()`; scaled to 1 DS × 3 points |
| `create-points-events-comments.js` | ✅ | Fixed: `ModuleRegistry` → `runtimeContext.getBean()`; `Common.getBean()` → `runtimeContext.getBean()`; `DataPointEventType` constructor now requires `EventTypeDependencies`; scaled to 3 pts × 3 events |
| `create-tag-config.js` | ✅ | Requires template point XID — update before running; scaled to 5 points |
| `delete-data-points.js` | ✅ | Requires `data-points-to-delete.csv` in default filestore |
| `delete-data-source.js` | ✅ | Requires `data-source-to-delete.csv` in default filestore |

---

## `benchmarking/` — Performance and load testing
Scripts that create large volumes of data or simulate high-throughput scenarios. Only run on a dedicated test instance. Counts have been reduced to small values for compatibility testing.

| Script | Status | Notes |
|---|---|---|
| `create-datapoint-events.js` | ✅ | Fixed: `EventDetectorDao.getInstance()` → `runtimeContext.getBean()`; `Common.eventManager` → `runtimeContext.getBean(EventManager.class)`; `Common.timer` → `System.currentTimeMillis()` |
| `create-datapoints.js` | ✅ | Fixed: `ModuleRegistry` → `runtimeContext.getBean()`; `setDataTypeId()` → `setDataType(DataType.NUMERIC)`; requires `BENCHMARK_READ`/`BENCHMARK_EDIT` roles (run `create-users.js` first); scaled to 3 pts/DS |
| `create-users.js` | ✅ | Fixed: `new User()` → `new User(permissionService, passwordService)`; creates 2 roles + 1 user; idempotent |
| `generatePointValues.js` | ✅ | Requires specific point XIDs — update before running |
| `generatePointValues_rad-3843.js` | ✅ | Scaled to 30 minutes history; requires specific point XIDs |
| `query-benchmarks.js` | ✅ | Fixed: `DataPointTagsDao.getInstance()` → `runtimeContext.getBean()`; requires benchmark user (run `create-users.js` first) |
| `setup-performance-test-datasources.js` | ⚠️ | Fixed: `ModuleRegistry` → `runtimeContext.getBean()`; requires Persistent TCP module (validation fails without it) |
| `setup-performance-test-publishers.js` | ✅ | Fixed: `ModuleRegistry` → `runtimeContext.getBean()`; `setDataTypeId()` → `setDataType()`; requires Persistent TCP module for publisher |
| `setup-performance-test-publishers-v5.js` | ⚠️ | Fixed: `ModuleRegistry` → `runtimeContext.getBean()`; requires Persistent TCP module (validation fails without it) |
| `v4_generatePublisherJsonFromUnpublishedPoints.js` | ✅ | Requires `your-query-output.csv` in default filestore |

---

## `event-detectors/` — Event detector management
Scripts that create, edit, or delete event detectors on data points.

| Script | Status | Notes |
|---|---|---|
| `create-event-detectors.js` | ✅ | Fixed: `ModuleRegistry.getEventDetectorDefinition()` → `runtimeContext.getBeansOfType(EventDetectorDefinition.class)` lookup; requires `event-detectors-to-create.csv` in default filestore |
| `delete-event-detectors.js` | ✅ | Requires `event-detectors-to-delete.csv` in default filestore |
| `edit-event-detectors.js` | ✅ | Requires `event-detectors-to-edit.csv` in default filestore |

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
| `getPointAttributes.js` | 🚫 | Meta point script — uses `test` binding; moved from `diagnostic/` |
| `maintenance_event_detection_global_script.js` | 🚫 | Meta point script |
| `meta-script-to-use-maintenance-event-service.js` | 🚫 | Meta point script |
| `ping-data-source.js` | 🚫 | Meta point script — uses `EXTERNAL_POINTS` binding; moved from `diagnostic/` |
| `track-mango-details.js` | 🚫 | Meta point script — uses `EXTERNAL_POINTS` binding; moved from `diagnostic/` |
| `unreliable-data-source.js` | 🚫 | Meta point script — uses `EXTERNAL_POINTS` binding; moved from `modify/` |

---

## Root — Utility scripts
Scripts at the root level that don't fit a specific group or are special-purpose.

| Script | Status | Notes |
|---|---|---|
| `clearCaches.js` | ✅ | Fixed: use `runtimeContext` binding; `clearCaches(boolean force)` now required |
| `crashMangoOOM.js` | 🚫 | **Intentionally crashes Mango with OOM — do not run** |
