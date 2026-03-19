# Common Recipes

Working examples of common script patterns. All scripts are compatible with Mango 5.7.x.

## Query data points and export as JSON

```javascript
const dataPoints = services.dataPointService.buildQuery()
    .equal('deviceName', 'Mango Internal')
    .query(10, 0);

const exported = services.emportService.export({ dataPoints }, 4);

response.setContentType('application/json');
print(exported);
```

## Export query results as CSV

```javascript
const users = services.usersService.buildQuery().query();

response.setContentType('text/csv');
response.setHeader('Content-Disposition', 'attachment; filename="users.csv"');

// header row
print('"username","name","email"');

// data rows
for (const user of users) {
    print(`"${user.getUsername()}","${user.getName()}","${user.getEmail()}"`);
}
```

## Read a CSV from the file store

```javascript
const Files = Java.type('java.nio.file.Files');

function readCsv(fileStore, filePath) {
    const path = services.fileStoreService.getPathForRead(fileStore, filePath);
    const lines = Array.from(Files.readAllLines(path));
    const header = lines.shift().split(',');
    return lines.map(line => {
        const row = line.split(',');
        const obj = {};
        for (let j = 0; j < header.length; j++) {
            obj[header[j].trim()] = row[j] ? row[j].trim() : '';
        }
        return obj;
    });
}

const rows = readCsv('default', 'my-data.csv');
console.log('Read ' + rows.length + ' rows');
```

## Write a file to the file store

```javascript
const FileWriter = Java.type('java.io.FileWriter');
const BufferedWriter = Java.type('java.io.BufferedWriter');

const content = JSON.stringify({ timestamp: new Date().toISOString(), data: [1, 2, 3] }, null, 2);
const outFile = services.fileStoreService.getPathForWrite('default', 'output.json').toFile();
const writer = new BufferedWriter(new FileWriter(outFile));
writer.write(content);
writer.close();

console.log('Wrote ' + outFile);
```

## Read point values for a time range

```javascript
const PointValueDao = Java.type('com.serotonin.m2m2.db.dao.PointValueDao');
const ZonedDateTime = Java.type('java.time.ZonedDateTime');
const pvDao = runtimeContext.getBean(PointValueDao.class);

const point = services.dataPointService.get('DP_my_xid');
const from = ZonedDateTime.now().minusHours(1).toInstant().toEpochMilli();
const to = ZonedDateTime.now().toInstant().toEpochMilli();

const values = pvDao.getPointValuesBetween(point, from, to);
console.log('Found ' + values.size() + ' values');
for (const pvt of values) {
    console.log(pvt.getTime() + ' -> ' + pvt.getValue());
}
```

## Set a point value

```javascript
const RuntimeManager = Java.type('com.serotonin.m2m2.rt.RuntimeManager');
const AbstractTimer = Java.type('com.serotonin.timer.AbstractTimer');
const PointValueTime = Java.type('com.serotonin.m2m2.rt.dataImage.PointValueTime');
const NumericValue = Java.type('com.serotonin.m2m2.rt.dataImage.types.NumericValue');

const runtimeManager = runtimeContext.getBean(RuntimeManager.class);
const timer = runtimeContext.getBean(AbstractTimer.class);

const point = services.dataPointService.get('DP_my_xid');
const rt = runtimeManager.getDataPoint(point.getId());
const value = new NumericValue(42.0);
rt.setPointValue(new PointValueTime(value, timer.getTimeSource().millis()), null);

console.log('Set value on ' + point.getXid());
```

## Delete point values in a time range

```javascript
const PointValueDao = Java.type('com.serotonin.m2m2.db.dao.PointValueDao');
const ZonedDateTime = Java.type('java.time.ZonedDateTime');
const pvDao = runtimeContext.getBean(PointValueDao.class);

const dryRun = true;
const from = ZonedDateTime.now().minusHours(2).toInstant().toEpochMilli();
const to = ZonedDateTime.now().minusHours(1).toInstant().toEpochMilli();

services.dataPointService.buildQuery()
    .equal('deviceName', 'Mango Internal')
    .query(point => {
        if (dryRun) {
            console.log('Would delete values for: ' + point.getName());
        } else {
            pvDao.deletePointValuesBetween(point, from, to);
            console.log('Deleted values for: ' + point.getName());
        }
    });
```

## Create a virtual data source with points

```javascript
const DataPointVO = Java.type('com.serotonin.m2m2.vo.DataPointVO');
const DataType = Java.type('com.serotonin.m2m2.DataType');
const VirtualDataSourceDefinition = Java.type('com.serotonin.m2m2.virtual.VirtualDataSourceDefinition');

const dsDef = runtimeContext.getBean(VirtualDataSourceDefinition.class);
const ds = dsDef.baseCreateDataSourceVO();
ds.setName('Script-created DS');
ds.setUpdatePeriodType(1); // SECONDS
ds.setUpdatePeriods(5);
services.dataSourceService.insert(ds);

const locator = ds.createPointLocator();
locator.setDataType(DataType.NUMERIC);
locator.setChangeTypeId(2); // BROWNIAN
locator.getBrownianChange().setStartValue('50');
locator.getBrownianChange().setMax(100);
locator.getBrownianChange().setMin(0);
locator.getBrownianChange().setMaxChange(0.5);

for (let i = 0; i < 3; i++) {
    const dp = new DataPointVO();
    dp.setDataSourceId(ds.getId());
    dp.setEnabled(true);
    dp.setLoggingType(2); // ALL
    dp.setPointLocator(locator);
    dp.setName('Point ' + i);
    dp.setDeviceName(ds.getName());
    services.dataPointService.insert(dp);
}

console.log('Created data source ' + ds.getXid() + ' with 3 points');
```

## Add a role to data point permissions

```javascript
const HashSet = Java.type('java.util.HashSet');
const MangoPermission = Java.type('com.infiniteautomation.mango.permission.MangoPermission');

const role = services.roleService.get('user').getRole();

services.dataPointService.buildQuery()
    .equal('dataSourceXid', 'internal_mango_monitoring_ds')
    .query(point => {
        const minTerms = new HashSet(point.getReadPermission().getRoles());
        const term = new HashSet();
        term.add(role);
        minTerms.add(term);

        point.setReadPermission(new MangoPermission(minTerms));
        services.dataPointService.update(point.getXid(), point);
        console.log('Updated ' + point.getXid());
    });
```

## Make an outbound HTTP GET request

```javascript
const HttpClient = Java.type('java.net.http.HttpClient');
const HttpRequest = Java.type('java.net.http.HttpRequest');
const HttpResponse = Java.type('java.net.http.HttpResponse');
const URI = Java.type('java.net.URI');

const token = 'your-bearer-token';
const client = HttpClient.newHttpClient();

const request = HttpRequest.newBuilder()
    .uri(URI.create('http://localhost:8080/rest/latest/users'))
    .header('Authorization', 'Bearer ' + token)
    .GET()
    .build();

const resp = client.send(request, HttpResponse.BodyHandlers.ofString());
if (resp.statusCode() === 200) {
    const users = JSON.parse(resp.body());
    console.log('Found ' + users.items.length + ' users');
} else {
    console.log('Error: HTTP ' + resp.statusCode());
}
```

## Read JSON from the request body (echo pattern)

```javascript
const lines = [];
let line = null;
while ((line = reader.readLine()) != null) {
    lines.push(line);
}
if (!lines.length) throw new Error('No request body');

const body = JSON.parse(lines.join(''));

// process and return
response.setContentType('application/json');
print(JSON.stringify({ received: body, processedAt: new Date().toISOString() }));
```

## Direct SQL query with jOOQ

```javascript
const DSL = Java.type('org.jooq.impl.DSL');
const DatabaseProxy = Java.type('com.serotonin.m2m2.db.DatabaseProxy');
const ctx = runtimeContext.getBean(DatabaseProxy.class).getContext();

const count = ctx.selectCount()
    .from(DSL.table('dataPoints'))
    .fetchOne(0, Java.type('java.lang.Integer').class);

console.log('Total data points in database: ' + count);
```

## Clear all caches

```javascript
const CachingService = Java.type('com.infiniteautomation.mango.spring.service.CachingService');
runtimeContext.getBeansOfType(CachingService.class)
    .values().stream()
    .forEach(s => s.clearCaches(true));

console.log('All caches cleared');
```

## Submit background work items

```javascript
const BackgroundProcessing = Java.type('com.serotonin.m2m2.rt.maint.BackgroundProcessing');
const WorkItem = Java.extend(Java.type('com.serotonin.m2m2.rt.maint.work.WorkItem'));
const WorkItemPriority = Java.type('com.serotonin.m2m2.rt.maint.work.WorkItemPriority');
const bp = runtimeContext.getBean(BackgroundProcessing.class);

for (let i = 0; i < 5; i++) {
    const index = i;
    bp.addWorkItem(new WorkItem({
        execute: function() { log.info('Work item {} complete', index); },
        getPriority: function() { return WorkItemPriority.MEDIUM; },
        getDescription: function() { return 'Script work item ' + index; },
        rejected: function(reason) { log.error('Work item {} rejected', index); }
    }));
}
console.log('Submitted 5 work items');
```

## Change a logger's level at runtime

```javascript
const Common = Java.type('com.serotonin.m2m2.Common');
const Level = Java.type('org.apache.logging.log4j.Level');

Common.configureLoggerLevel('com.serotonin.m2m2.rt.RuntimeManager', Level.DEBUG);
console.log('Set RuntimeManager to DEBUG');

// Reset when done:
// Common.removeLoggerConfig('com.serotonin.m2m2.rt.RuntimeManager');
```
