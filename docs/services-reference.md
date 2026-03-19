# Services and Beans Reference

This document lists the beans and services available to filestore scripts in Mango 5.7.x.

## `services` binding

The `services` binding is a map of all Spring `@Service` beans. Keys are the default Spring bean names (the class name with the first letter lowercased).

### Core services

| Bean name | Class | Description |
|---|---|---|
| `dataPointService` | `DataPointService` | Data point CRUD, queries, enable/disable |
| `dataSourceService` | `DataSourceService` | Data source CRUD, queries, restart |
| `usersService` | `UsersService` | User CRUD and queries |
| `roleService` | `RoleService` | Role CRUD and queries |
| `permissionService` | `PermissionService` | Permission checks, role resolution, cache |
| `fileStoreService` | `FileStoreService` | File store path resolution, read/write access |
| `emportService` | `EmportService` | JSON import/export of Mango configuration |

### Event services

| Bean name | Class | Description |
|---|---|---|
| `eventDetectorsService` | `EventDetectorsService` | Event detector CRUD |
| `eventHandlerService` | `EventHandlerService` | Event handler CRUD |
| `eventInstanceService` | `EventInstanceService` | Query active/historical events |

### Publisher services

| Bean name | Class | Description |
|---|---|---|
| `publisherService` | `PublisherService` | Publisher CRUD |
| `publishedPointService` | `PublishedPointService` | Published point CRUD |

### Other services

| Bean name | Class | Description |
|---|---|---|
| `mailingListService` | `MailingListService` | Mailing list CRUD |
| `jsonDataService` | `JsonDataService` | JSON data store CRUD |
| `userCommentService` | `UserCommentService` | User comment CRUD |
| `defaultPointValueService` | `DefaultPointValueService` | Point value queries and inserts |
| `passwordService` | `PasswordService` | Password encoding/validation |
| `serverInformationService` | `ServerInformationService` | Server info (version, uptime, etc.) |
| `modulesService` | `ModulesService` | Module management |
| `translationService` | `TranslationService` | i18n translations |

### Query pattern

Services extending `AbstractVOService` support the query builder pattern:

```javascript
// Get all
const all = services.dataPointService.buildQuery().query();

// Get by XID
const point = services.dataPointService.get('DP_my_xid');

// Filter with conditions
const filtered = services.dataPointService.buildQuery()
    .equal('deviceName', 'Sensors')
    .equal('tags.site', 'HQ')
    .sort('name', true)
    .query(100, 0);  // limit, offset

// Streaming callback
services.dataPointService.buildQuery()
    .equal('enabled', true)
    .query(point => {
        // called once per result — efficient for large datasets
    });
```

#### Query operators

| Method | Description |
|---|---|
| `.equal(field, value)` | Exact match |
| `.notEqual(field, value)` | Not equal |
| `.greaterThan(field, value)` | Greater than |
| `.greaterThanOrEqual(field, value)` | Greater than or equal |
| `.lessThan(field, value)` | Less than |
| `.lessThanOrEqual(field, value)` | Less than or equal |
| `.like(field, pattern)` | SQL LIKE pattern |
| `.in(field, ...values)` | In set |
| `.isNull(field)` | Is null |
| `.isNotNull(field)` | Is not null |
| `.and()` ... `.close()` | AND group |
| `.or()` ... `.close()` | OR group |
| `.sort(field, ascending)` | Sort results |

---

## `runtimeContext` binding

`runtimeContext` is a Spring `ApplicationContext`. Use it to access beans not exposed through `services`.

### Common beans accessed via `runtimeContext`

| Class | Usage |
|---|---|
| `PointValueDao` | Direct point value read/write/delete |
| `EventDetectorDao` | Low-level event detector access |
| `EventDao` | Low-level event instance access |
| `UserCommentDao` | Low-level comment access |
| `DataPointTagsDao` | Tag key/value queries |
| `DatabaseProxy` | jOOQ context for direct SQL |
| `RuntimeManager` | Running data point/source access |
| `EventManager` | Raise/return events |
| `BackgroundProcessing` | Submit work items to thread pools |
| `AbstractTimer` | Mango's time source |
| `Lifecycle` | Server lifecycle state |

### Patterns

```javascript
// Get a single bean by class
const PointValueDao = Java.type('com.serotonin.m2m2.db.dao.PointValueDao');
const pvDao = runtimeContext.getBean(PointValueDao.class);

// Get a bean by name and class
const ObjectMapper = Java.type('com.fasterxml.jackson.databind.ObjectMapper');
const mapper = runtimeContext.getBean('commonObjectMapper', ObjectMapper.class);

// Get all beans of a type (returns a Java Map<String, T>)
const CachingService = Java.type('com.infiniteautomation.mango.spring.service.CachingService');
const caches = runtimeContext.getBeansOfType(CachingService.class);
caches.values().forEach(cache => cache.clearCaches(true));

// Get module definitions (replaces ModuleRegistry)
const VirtualDataSourceDefinition = Java.type('com.serotonin.m2m2.virtual.VirtualDataSourceDefinition');
const vDef = runtimeContext.getBean(VirtualDataSourceDefinition.class);
```

---

## Common Java type imports

These are the most frequently used `Java.type()` imports across the script examples:

### Data types and values

```javascript
const DataType = Java.type('com.serotonin.m2m2.DataType');
// DataType.BINARY, DataType.MULTISTATE, DataType.NUMERIC, DataType.ALPHANUMERIC

const PointValueTime = Java.type('com.serotonin.m2m2.rt.dataImage.PointValueTime');
const NumericValue = Java.type('com.serotonin.m2m2.rt.dataImage.types.NumericValue');
const MultistateValue = Java.type('com.serotonin.m2m2.rt.dataImage.types.MultistateValue');
const AlphanumericValue = Java.type('com.serotonin.m2m2.rt.dataImage.types.AlphanumericValue');
const BinaryValue = Java.type('com.serotonin.m2m2.rt.dataImage.types.BinaryValue');
```

### VOs and permissions

```javascript
const DataPointVO = Java.type('com.serotonin.m2m2.vo.DataPointVO');
const RoleVO = Java.type('com.serotonin.m2m2.vo.role.RoleVO');
const MangoPermission = Java.type('com.infiniteautomation.mango.permission.MangoPermission');
```

### Events

```javascript
const AlarmLevels = Java.type('com.serotonin.m2m2.rt.event.AlarmLevels');
const EventInstance = Java.type('com.serotonin.m2m2.rt.event.EventInstance');
const TranslatableMessage = Java.type('com.serotonin.m2m2.i18n.TranslatableMessage');
```

### Time

```javascript
const AbstractTimer = Java.type('com.serotonin.timer.AbstractTimer');
const ZonedDateTime = Java.type('java.time.ZonedDateTime');
const Duration = Java.type('java.time.Duration');
const Instant = Java.type('java.time.Instant');
```

### Collections

```javascript
const ArrayList = Java.type('java.util.ArrayList');
const HashSet = Java.type('java.util.HashSet');
const HashMap = Java.type('java.util.HashMap');
const Arrays = Java.type('java.util.Arrays');
const Collectors = Java.type('java.util.stream.Collectors');
const CompletableFuture = Java.type('java.util.concurrent.CompletableFuture');
```

### File I/O

```javascript
const Files = Java.type('java.nio.file.Files');
const FileWriter = Java.type('java.io.FileWriter');
const BufferedWriter = Java.type('java.io.BufferedWriter');
```

### HTTP (for outbound requests)

```javascript
const HttpClient = Java.type('java.net.http.HttpClient');
const HttpRequest = Java.type('java.net.http.HttpRequest');
const HttpResponse = Java.type('java.net.http.HttpResponse');
const URI = Java.type('java.net.URI');
```

### Database (jOOQ)

```javascript
const DSL = Java.type('org.jooq.impl.DSL');
const DatabaseProxy = Java.type('com.serotonin.m2m2.db.DatabaseProxy');
```
