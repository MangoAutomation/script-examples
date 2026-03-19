# Writing Filestore Scripts for Mango 5.7+

Mango filestore scripts are JavaScript files executed server-side by the Graal.js engine. They run within the JVM and have direct access to Mango's Java APIs through a set of script bindings.

This guide covers the basics of writing scripts for Mango 5.7.x and later. For migration from older versions, see [compatibility.md](compatibility.md).

## How scripts are executed

Filestore scripts are evaluated via:
- **REST API**: `POST /rest/latest/script/eval-file-store/{fileStoreName}/**`
- **UI**: Open a `.js` file in the file store browser and click the run button
- **CLI**: Use [`eval_script.py`](../eval_script.py) (see the [README](../README.md))

Scripts run as the authenticated user. The user's roles determine which Mango entities they can read, write, and delete.

## Script bindings

Every filestore script has access to these bindings:

| Binding | Type | Description |
|---|---|---|
| `services` | `Map<String, Object>` | All Spring `@Service` beans, keyed by bean name |
| `runtimeContext` | `ApplicationContext` | Spring application context for `getBean()` calls |
| `log` | `Logger` | SLF4J logger (logged as `script.<filename>`) |
| `reader` | `BufferedReader` | Request body input (from the POST body) |
| `print(value)` | Function | Write to the HTTP response body |
| `console.log(msg)` | Function | Write to the script log output |
| `setTimeout` / `setInterval` | Function | Timer functions (requires system permission) |
| `clearTimeout` / `clearInterval` | Function | Cancel timers |
| `response` | `HttpServletResponse` | HTTP response object (requires `Access request/response objects` permission) |
| `request` | `HttpServletRequest` | HTTP request object (requires `Access request/response objects` permission) |

### `services` — the most common entry point

The `services` binding is a map of all Spring `@Service` beans. Access them by their bean name (camelCase of the class name). These are the most commonly used:

| Service | Description |
|---|---|
| `services.dataPointService` | CRUD and query for data points |
| `services.dataSourceService` | CRUD and query for data sources |
| `services.usersService` | CRUD and query for users |
| `services.roleService` | Role management |
| `services.eventDetectorsService` | Event detector CRUD |
| `services.eventHandlerService` | Event handler CRUD |
| `services.publisherService` | Publisher CRUD |
| `services.publishedPointService` | Published point CRUD |
| `services.fileStoreService` | File store path resolution and CRUD |
| `services.emportService` | JSON import/export |
| `services.permissionService` | Permission checks and lookups |
| `services.eventInstanceService` | Query active/historical events |
| `services.mailingListService` | Mailing list CRUD |
| `services.jsonDataService` | JSON data store CRUD |

### `runtimeContext` — for everything else

For beans that are not `@Service` (DAOs, Spring `@Component` beans, module definitions), use `runtimeContext.getBean()`:

```javascript
const PointValueDao = Java.type('com.serotonin.m2m2.db.dao.PointValueDao');
const pointValueDao = runtimeContext.getBean(PointValueDao.class);
```

You can also retrieve all beans of a type:

```javascript
const CachingService = Java.type('com.infiniteautomation.mango.spring.service.CachingService');
runtimeContext.getBeansOfType(CachingService.class).values().forEach(s => {
    s.clearCaches(true);
});
```

## Accessing Java classes

Use `Java.type()` to import Java classes:

```javascript
const ArrayList = Java.type('java.util.ArrayList');
const Files = Java.type('java.nio.file.Files');
const DataPointVO = Java.type('com.serotonin.m2m2.vo.DataPointVO');
```

Create instances with `new`:

```javascript
const list = new ArrayList();
```

For interfaces and abstract classes, use `Java.extend()`:

```javascript
const WorkItem = Java.extend(Java.type('com.serotonin.m2m2.rt.maint.work.WorkItem'));
const item = new WorkItem({
    execute: function() { log.info('running'); },
    getPriority: function() { return WorkItemPriority.MEDIUM; },
    getDescription: function() { return 'My work item'; },
    rejected: function(reason) { log.error('rejected'); }
});
```

### Java/JavaScript type conversion

- Java collections (List, Set) can be iterated with `for...of` or converted with `Array.from()`
- Java `Map` values are accessed via `.get(key)`, not bracket notation
- `null` in Java maps to `null` in JavaScript (not `undefined`)
- Graal.js automatically converts between JS and Java strings and numbers

## Querying data

Most services extend `AbstractVOService` which provides a query builder:

```javascript
// Simple query
const points = services.dataPointService.buildQuery()
    .equal('deviceName', 'Mango Internal')
    .query();

// With conditions
const points = services.dataPointService.buildQuery()
    .equal('tags.site', 'Building A')
    .and()
    .or()
        .equal('name', 'Temperature')
        .equal('name', 'Humidity')
    .close()
    .close()
    .query();

// With limit and offset
const points = services.dataPointService.buildQuery()
    .sort('name', true)
    .query(10, 0); // limit 10, offset 0

// Streaming callback (memory-efficient for large result sets)
services.dataPointService.buildQuery()
    .equal('deviceName', 'Mango Internal')
    .query(point => {
        console.log(point.getName());
    });

// Callback with limit and offset
services.dataPointService.buildQuery()
    .query(point => {
        // process each point
    }, 100, 0); // limit, offset

// Get a single entity by XID
const point = services.dataPointService.get('DP_my_xid');
```

## Output

### Writing to the response

`print()` writes directly to the HTTP response body. This is the primary way to return data:

```javascript
print('Hello, world');
print(JSON.stringify({ status: 'ok' }));
```

### Setting response headers

Requires the `Access request/response objects` system permission:

```javascript
response.setContentType('application/json');
response.setHeader('Content-Disposition', 'attachment; filename="export.json"');
print(JSON.stringify(data));
```

### Logging

`log` is an SLF4J logger — messages go to Mango's log file:

```javascript
log.info('Processing {} points', count);
log.error('Failed to process point {}', xid, error);
```

`console.log()` writes to the script output (visible in the UI script runner):

```javascript
console.log('Debug: current value is ' + value);
```

## Reading request input

The `reader` binding provides the POST body as a `BufferedReader`:

```javascript
const lines = [];
let line = null;
while ((line = reader.readLine()) != null) {
    lines.push(line);
}
const body = JSON.parse(lines.join(''));
```

## Time

Use the `AbstractTimer` Spring bean to get the current time. This ensures compatibility with Mango's simulation timer:

```javascript
const AbstractTimer = Java.type('com.serotonin.timer.AbstractTimer');
const timer = runtimeContext.getBean(AbstractTimer.class);

const epochMs = timer.getTimeSource().millis();
const instant = timer.getTimeSource().instant();
```

For date arithmetic, `java.time` classes work well:

```javascript
const ZonedDateTime = Java.type('java.time.ZonedDateTime');
const now = ZonedDateTime.now();
const oneHourAgo = now.minusHours(1);
```

## File I/O

### Reading from the file store

```javascript
const Files = Java.type('java.nio.file.Files');
const path = services.fileStoreService.getPathForRead('default', 'myfile.csv');
const lines = Array.from(Files.readAllLines(path));
```

### Writing to the file store

```javascript
const FileWriter = Java.type('java.io.FileWriter');
const BufferedWriter = Java.type('java.io.BufferedWriter');

const outputPath = services.fileStoreService.getPathForWrite('default', 'output.csv').toFile();
const writer = new BufferedWriter(new FileWriter(outputPath));
writer.write('header1,header2\n');
writer.write('value1,value2\n');
writer.close();
```

## HTTP requests

`HttpBuilder` is **not** available in filestore scripts. Use Java's built-in `java.net.http.HttpClient`:

```javascript
const HttpClient = Java.type('java.net.http.HttpClient');
const HttpRequest = Java.type('java.net.http.HttpRequest');
const HttpResponse = Java.type('java.net.http.HttpResponse');
const URI = Java.type('java.net.URI');

const client = HttpClient.newHttpClient();
const request = HttpRequest.newBuilder()
    .uri(URI.create('http://localhost:8080/rest/latest/users'))
    .header('Authorization', 'Bearer ' + token)
    .GET()
    .build();

const response = client.send(request, HttpResponse.BodyHandlers.ofString());
if (response.statusCode() === 200) {
    print(response.body());
}
```

For POST requests with a JSON body:

```javascript
const request = HttpRequest.newBuilder()
    .uri(URI.create(url))
    .header('Content-Type', 'application/json')
    .POST(HttpRequest.BodyPublishers.ofString(JSON.stringify(payload)))
    .build();
```

## Database access

For direct SQL access, use the `DatabaseProxy` bean to get a jOOQ context:

```javascript
const DSL = Java.type('org.jooq.impl.DSL');
const DatabaseProxy = Java.type('com.serotonin.m2m2.db.DatabaseProxy');
const proxy = runtimeContext.getBean(DatabaseProxy.class);
const create = proxy.getContext();

const records = create.select(DSL.field('id'), DSL.field('xid'))
    .from(DSL.table('dataPoints'))
    .limit(10)
    .fetch();

for (const record of records) {
    console.log(record.get(DSL.field('xid')));
}
```

Use the service layer whenever possible — direct SQL bypasses permissions, validation, and caching.

## Permissions

Scripts that use `services.*` inherit the authenticated user's permissions. Operations will throw `PermissionException` if the user lacks access.

For direct bean access (`runtimeContext.getBean()`), calls to DAOs and internal APIs bypass permission checks — be careful with these in scripts accessible to non-admin users.

## Error handling

Use standard try/catch. In Graal.js, caught Java exceptions have a `.message` property (not `.getMessage()`):

```javascript
try {
    services.dataPointService.get('nonexistent_xid');
} catch (e) {
    console.log('Error: ' + (e.message || e));
    log.error('Script failed', e);
}
```

## Graal.js sandbox

The Graal.js security sandbox blocks access to some internal classes. If you see `TypeError: Access to host class ... is not allowed`, the class cannot be used directly. Common workarounds:

- `ModuleRegistry` → `runtimeContext.getBean(DefinitionClass.class)`
- `DataTypes` → `DataType` enum
- Internal JDK classes (e.g. `ThreadPoolExecutor$Worker`) → no workaround

## Further reading

- [Common recipes and patterns](recipes.md)
- [Services reference](services-reference.md)
- [Migration guide / Compatibility](compatibility.md)
