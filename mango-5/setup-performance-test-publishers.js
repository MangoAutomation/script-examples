//Compatible with mango 5.x
// import classes
const DataPointVO = Java.type('com.serotonin.m2m2.vo.DataPointVO');
const ModuleRegistry = Java.type('com.serotonin.m2m2.module.ModuleRegistry');
const VirtualDataSourceDefinition = Java.type('com.serotonin.m2m2.virtual.VirtualDataSourceDefinition');
const PersistentPointVO = Java.type('com.serotonin.m2m2.persistent.pub.PersistentPointVO');
const PersistentPublisherDefinition = Java.type('com.serotonin.m2m2.persistent.PersistentPublisherDefinition');
const ArrayList = Java.type('java.util.ArrayList');
const HashSet = Java.type('java.util.HashSet');
const LogLevel = Java.type('com.serotonin.m2m2.util.log.LogLevel');
const DataType = Java.type('com.serotonin.m2m2.DataType');
const MangoPermission = Java.type('com.infiniteautomation.mango.permission.MangoPermission');

// import services
const dataPointService = services.dataPointService;
const dataSourceService = services.dataSourceService;
const publisherService = services.publisherService;
const publishedPointService = services.publishedPointService;
const roleService = services.roleService;

// test setup
const numDataSources = 1; // number of data sources (and publishers) to create
const updatePeriod = 5; // update period in seconds
const pointsPerDataSource = 10; // number of points per data source
const tagsPerPoint = 4; // actual number of tags added to each point
const possibleTagKeys = 4; // number of tag keys that are possible
const possibleTagValues = 4; // number of values per tag that are possible
const readRoleXids = ['read-role-1', 'read-role-2'];
const createPublishers = true;
const sharedKey = '34b99c1eaf4be91766b29c51c49cb9c6';
const host = 'localhost';
const firstPort = 8090;

const tags = {};
for (let i = 0; i < possibleTagKeys; i++) {
    const tagValues = [];
    for (let j = 0; j < possibleTagValues; j++) {
        tagValues.push(`key_${i}_value_${j}`);
    }
    tags[`key_${i}`] = tagValues;
}
const tagKeys = Object.keys(tags);

//Permissions setup
const readRoles = new HashSet();
for(let i=0; i<readRoleXids.length; i++) {
    const minterm = new HashSet();
    minterm.add(roleService.getOrInsert(readRoleXids[i]).getRole());
    readRoles.add(minterm);
}
const readPermission = new MangoPermission(readRoles);

for (let dsCount = 0; dsCount < numDataSources; dsCount++) {
    const dataSourceDef = ModuleRegistry.getDefinition(VirtualDataSourceDefinition.class);
    const dataSource = dataSourceDef.baseCreateDataSourceVO();
    dataSource.setName(`Performance test ${dsCount}`);
    dataSource.setUpdatePeriodType(1); // SECONDS
    dataSource.setUpdatePeriods(updatePeriod);
    dataSourceService.insert(dataSource);

    const locator = dataSource.createPointLocator();
    locator.setDataType(DataType.NUMERIC); // NUMERIC
    locator.setChangeTypeId(3); // INCREMENT_ANALOG
    locator.getIncrementAnalogChange().setStartValue('0');
    locator.getIncrementAnalogChange().setMax(100);
    locator.getIncrementAnalogChange().setMin(0);
    locator.getIncrementAnalogChange().setChange(0.1);
    locator.getIncrementAnalogChange().setRoll(true);

    const dataPoint = new DataPointVO();
    dataPoint.setDataSourceId(dataSource.getId());
    dataPoint.setEnabled(true);
    dataPoint.setLoggingType(2); // ALL
    dataPoint.setPointLocator(locator);
    dataPoint.setReadPermission(readPermission);

    const publisherDef = ModuleRegistry.getDefinition(PersistentPublisherDefinition.class);
    var publisher = publisherDef.baseCreatePublisherVO();
    if (createPublishers) {
        publisher.setEnabled(true);
        publisher.setName(`Performance test ${dsCount}`);
        publisher.setPublishType(3); // LOGGED ONLY
        publisher.setCacheWarningSize(365000);
        publisher.setCacheDiscardSize(370000);
        publisher.setUseGrpc(false);
        publisher.setHost(host);
        publisher.setPort(firstPort + dsCount);
        publisher.setAuthorizationKey('');
        publisher.setSharedKey(sharedKey);
        publisher.setKeySize(128);
        publisher.setSyncRealTime(true);
        publisher.setSyncPattern('0 0/15 * * * ?');
        publisher.setHistoryCutoffPeriods(15);
        publisher.setHistoryCutoffPeriodType(1); // SECONDS
        publisher.setMaxPointValuesToSend(20000);
        publisher.setLogLevel(LogLevel.INFO);
        publisher.setSyncResponseTimeout(3600000);
        publisher.setSyncMinimumOverlap(1);
        publisher = publisherService.insert(publisher);
    }

    // copy the template point, save it, and add to our list of published points
    for (let i = 0; i < pointsPerDataSource; i++) {
        const copy = dataPoint.copy();
        copy.setId(-1);
        copy.setSeriesId(-1);
        copy.setXid(null);
        copy.setName(`Point ${i}`);

        // randomize the tag keys order, grab the first x
        const randomKeys = tagKeys.sort(() => 0.5 - Math.random()).slice(0, tagsPerPoint);
        const pointTags = {};
        for (const key of randomKeys) {
            const values = tags[key];
            pointTags[key] = values[Math.round(Math.random() * (values.length - 1))];
        }
        copy.setTags(pointTags);

        let newPoint = dataPointService.insert(copy);

        if (createPublishers) {
            const publishedPoint = publisherDef.createPublishedPointVO(publisher.getId(), newPoint.getId());
            publishedPoint.setName(copy.getName());
            publishedPoint.setEnabled(true);
            publishedPoint.setDataPointId(newPoint.getId());
            publishedPointService.insert(publishedPoint);
        }
    }

    // start the data source after adding all points
    dataSourceService.restart(dataSource.getXid(), true, false);

   
}
