// import classes
const DataPointVO = Java.type('com.serotonin.m2m2.vo.DataPointVO');
const ModuleRegistry = Java.type('com.serotonin.m2m2.module.ModuleRegistry');
const VirtualDataSourceDefinition = Java.type('com.serotonin.m2m2.virtual.VirtualDataSourceDefinition');
const CompletableFuture = Java.type('java.util.concurrent.CompletableFuture');

// import services
const dataPointService = services.dataPointService;
const dataSourceService = services.dataSourceService;

// configuration parameters
const numDataSources = 1; // number of data sources to create
const updatePeriod = 5; // update period in seconds
const pointsPerDataSource = 100000; // number of points per data source
const tagsPerPoint = 5; // actual number of tags added to each point
const possibleTagKeys = 10; // number of tag keys that are possible
const possibleTagValues = 30; // number of values per tag that are possible

const tags = {};
for (let i = 0; i < possibleTagKeys; i++) {
    const tagValues = [];
    for (let j = 0; j < possibleTagValues; j++) {
        tagValues.push(`key_${i}_value_${j}`);
    }
    tags[`key_${i}`] = tagValues;
}
const tagKeys = Object.keys(tags);
const futures = [];
const startTime = new Date();

for (let dsCount = 0; dsCount < numDataSources; dsCount++) {
    const dataSourceDef = ModuleRegistry.getDefinition(VirtualDataSourceDefinition.class);
    const dataSource = dataSourceDef.baseCreateDataSourceVO();
    dataSource.setName(`aaPerformance test ${dsCount}`);
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

    // copy the template point, and save it
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
        
        futures.push(dataPointService.insertAsync(copy));
    }
}

// wait for all futures to complete
CompletableFuture.allOf(futures).get();

const time = (new Date() - startTime) / 1000;
const pointsCreated = numDataSources * pointsPerDataSource;
const pointsPerSec = pointsCreated / time;
log.info('Took {}s to create {} points. {} points/s', time, pointsCreated, pointsPerSec);