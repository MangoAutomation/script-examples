// import classes
const DataPointVO = Java.type('com.serotonin.m2m2.vo.DataPointVO');
const ModuleRegistry = Java.type('com.serotonin.m2m2.module.ModuleRegistry');
const VirtualDataSourceDefinition = Java.type('com.serotonin.m2m2.virtual.VirtualDataSourceDefinition');
const Common = Java.type('com.serotonin.m2m2.Common');
const DataType = Java.type('com.serotonin.m2m2.DataType');
const EventInstance = Java.type('com.serotonin.m2m2.rt.event.EventInstance');
const DataPointEventType = Java.type('com.serotonin.m2m2.rt.event.type.DataPointEventType');
const AlarmLevels = Java.type('com.serotonin.m2m2.rt.event.AlarmLevels');
const TranslatableMessage = Java.type('com.serotonin.m2m2.i18n.TranslatableMessage');
const EventDao = Java.type('com.serotonin.m2m2.db.dao.EventDao');
const JavaMap = Java.type('java.util.Map');
const UserCommentVO = Java.type('com.serotonin.m2m2.vo.comment.UserCommentVO');
const UserCommentDao = Java.type('com.serotonin.m2m2.db.dao.UserCommentDao');

// import services
const dataPointService = services.dataPointService;
const dataSourceService = services.dataSourceService;
const eventDao = Common.getBean(EventDao.class);
const userCommentDao = Common.getBean(UserCommentDao.class);

// configuration parameters
const numDataSources = 1; // number of data sources to create
const updatePeriod = 5000; // update period in milliseconds
const pointsPerDataSource = 1000; // number of points per data source
const tagsPerPoint = 5; // actual number of tags added to each point
const possibleTagKeys = 10; // number of tag keys that are possible
const possibleTagValues = 30; // number of values per tag that are possible
const eventsPerPoint = 1000; // number of events to insert per point
const maxCommentsPerEvent = 3; // max number of comments per event

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
    dataSource.setName(`Performance test ${dsCount}`);
    dataSource.setUpdatePeriodType(8); // MILLISECONDS
    dataSource.setUpdatePeriods(updatePeriod);
    dataSourceService.insert(dataSource);

    const locator = dataSource.createPointLocator();
    locator.setDataType(DataType.NUMERIC);
    locator.setChangeTypeId(2); // BROWNIAN
    locator.getBrownianChange().setStartValue('50');
    locator.getBrownianChange().setMax(100);
    locator.getBrownianChange().setMin(0);
    locator.getBrownianChange().setMaxChange(0.1);

    const dataPoint = new DataPointVO();
    dataPoint.setDataSourceId(dataSource.getId());
    dataPoint.setEnabled(true);
    dataPoint.setLoggingType(2); // ALL
    dataPoint.setPointLocator(locator);
    dataPoint.setDeviceName(dataSource.getName());

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

        const inserted = dataPointService.insert(copy);
        
        const eventType = new DataPointEventType(inserted.getId(), 0);
        for (let j = 0; j < eventsPerPoint; j++) {
            const time = startTime.valueOf() - (eventsPerPoint - j) * 1000;
            const event = new EventInstance(eventType, time, false, AlarmLevels.INFORMATION, new TranslatableMessage("ok"), JavaMap.of());
            eventDao.saveEvent(event);
            
            const commentCount = Math.round(Math.random() * maxCommentsPerEvent);
            for (let k = 0; k < commentCount; k++) {
                const comment = new UserCommentVO();
                comment.setUserId(1);
                comment.setUsername("test");
                comment.setTs(time);
                comment.setComment("hello");
                comment.setCommentType(1);
                comment.setReferenceId(event.getId());
                userCommentDao.insert(comment);
            }
        }
    }
}

const time = (new Date() - startTime) / 1000;
const pointsCreated = numDataSources * pointsPerDataSource;
const pointsPerSec = pointsCreated / time;
log.info('Took {}s to create {} points. {} points/s', time, pointsCreated, pointsPerSec);
