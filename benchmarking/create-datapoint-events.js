/**
 * Create events for data points to use in benchmarking.
 *  Events are created for data points with event detectors by 
 *  selecting the first 'limit' number of points in id asc order.
 */
 
// import classes
const Common = Java.type('com.serotonin.m2m2.Common');
const HashMap = Java.type('java.util.HashMap');
const AlarmLevels = Java.type('com.serotonin.m2m2.rt.event.AlarmLevels');
const TranslatableMessage = Java.type('com.serotonin.m2m2.i18n.TranslatableMessage');
const EventDetectorDao = Java.type('com.serotonin.m2m2.db.dao.EventDetectorDao');
const DataPointEventType = Java.type('com.serotonin.m2m2.rt.event.type.DataPointEventType');

// import services
const dataPointService = services.dataPointService;

const eventsPerDataPoint = 10; // number of events per data point
const limit = 10; //Count of data points to add events to, orderd by id

let eventCount = 0;
//Get first data points and add events
dataPointService.buildQuery()
            .sort('id', true)
            .query(point => {
                const detectors = EventDetectorDao.getInstance().getWithSource(point.getId(), point);
                if(detectors.size() > 0) {
                    const type = new DataPointEventType(point, detectors.get(0));
                    const context = new HashMap();
                    context.put('pointEventDetector', detectors.get(0));
                    context.put('dataPoint', point);

                    for(var i=0; i<eventsPerDataPoint; i++) {
                        Common.eventManager.raiseEvent(type,
                        Common.timer.currentTimeMillis(),
                         false, AlarmLevels.INFORMATION,
                         new TranslatableMessage('literal', 'Benchmark data point event for ' + point.getName()),
                         context);
                         eventCount++;
                    }
                    log.info('Raised ' + eventsPerDataPoint + ' events for point ' + point.getName());
                }
            }, limit, 0);
log.info('Raised ' + eventCount + ' events.');