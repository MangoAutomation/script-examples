// import classes
const DataPointVO = Java.type('com.serotonin.m2m2.vo.DataPointVO');
const ModuleRegistry = Java.type('com.serotonin.m2m2.module.ModuleRegistry');
const VirtualDataSourceDefinition = Java.type('com.serotonin.m2m2.virtual.VirtualDataSourceDefinition');
const PersistentPointVO = Java.type('com.serotonin.m2m2.persistent.pub.PersistentPointVO');
const PersistentPublisherDefinition = Java.type('com.serotonin.m2m2.persistent.PersistentPublisherDefinition');
const ArrayList = Java.type('java.util.ArrayList');
const LogLevel = Java.type('com.serotonin.m2m2.util.log.LogLevel');
const MangoPermission = Java.type('com.infiniteautomation.mango.permission.MangoPermission');

// import services
const dataPointService = services.dataPointService;
const dataSourceService = services.dataSourceService;
const publisherService = services.publisherService;
const roleService = services.roleService;
const eventDetectorsService = services.eventDetectorsService;

// test setup
const numDataSources = 1; // number of data sources (and publishers) to create
const updatePeriod = 5; // update period in seconds
const pointsPerDataSource = 10; // number of points per data source
const tagsPerPoint = 2; // actual number of tags added to each point
const possibleTagKeys = 2; // number of tag keys that are possible
const possibleTagValues = 2; // number of values per tag that are possible
const detectorsPerPoint = 1; // number of event detectors per data point

const updateEventDetectorDefinition = ModuleRegistry.getEventDetectorDefinition('UPDATE');

    const pointReadRoles = [];
    const pointEditRoles = [];
try {
    pointReadRoles.push(roleService.get('BENCHMARK_READ').getRole());
    pointEditRoles.push(roleService.get('BENCHMARK_EDIT').getRole());
}catch(error) {
    log.error('missing roles for point generation');
    throw error;
}

const createPublishers = false;
const sharedKey = '';
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

for (let dsCount = 0; dsCount < numDataSources; dsCount++) {
    const dataSourceDef = ModuleRegistry.getDefinition(VirtualDataSourceDefinition.class);
    const dataSource = dataSourceDef.baseCreateDataSourceVO();
    dataSource.setName(`Performance test ${dsCount}`);
    dataSource.setUpdatePeriodType(1); // SECONDS
    dataSource.setUpdatePeriods(updatePeriod);
    dataSourceService.insert(dataSource);

    const locator = dataSource.createPointLocator();
    locator.setDataTypeId(3); // NUMERIC
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
    dataPoint.setReadPermission(MangoPermission.requireAnyRole(pointReadRoles));
    dataPoint.setEditPermission(MangoPermission.requireAnyRole(pointEditRoles));

    const publishedPoints = createPublishers ? new ArrayList(pointsPerDataSource) : null;

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

        dataPointService.insert(copy);

        //Add event detectors
        for(let j=0; j<detectorsPerPoint; j++) {
           updateEventDetectorDefinition.baseCreateEventDetectorVO(copy)
           eventDetectorsService.insert(updateEventDetectorDefinition.baseCreateEventDetectorVO(copy));
        }

        if (createPublishers) {
            const publishedPoint = new PersistentPointVO();
            publishedPoint.setDataPointId(copy.getId());
            publishedPoints.add(publishedPoint);
        }
    }

    // start the data source after adding all points
    // dataSourceService.restart(dataSource.getXid(), true, false);

    if (createPublishers) {
        const publisherDef = ModuleRegistry.getDefinition(PersistentPublisherDefinition.class);
        const publisher = publisherDef.baseCreatePublisherVO();
        publisher.setEnabled(true);
        publisher.setPoints(publishedPoints);
        publisher.setName(`Performance test ${dsCount}`);
        publisher.setPublishType(3); // LOGGED ONLY
        publisher.setCacheWarningSize(365000);
        publisher.setCacheDiscardSize(370000);
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
        publisherService.insert(publisher);
    }
}
