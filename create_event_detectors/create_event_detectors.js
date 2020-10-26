load('./util.js');

const dataPointService = services.dataPointService;
const eventDetectorsService = services.eventDetectorsService;
const ModuleRegistry = Java.type('com.serotonin.m2m2.module.ModuleRegistry');
const AlarmLevels = Java.type('com.serotonin.m2m2.rt.event.AlarmLevels');

// read the CSV file in from the file store, you may have to change the path
const eventDetectors = readCsv('default', 'script-examples/create_event_detectors/event_detectors.csv');

let errorCount = 0;
let savedCount = 0;

// find all the equipment types and names for each equipment type, loop over them
for (const [equipmentType, eds1] of groupBy(eventDetectors, 'equipmentType')) {
    for (const [name, eds2] of groupBy(eds1, 'name')) {
        // query for data points with matching tags
        const points = dataPointService.buildQuery()
            .equal('tags.equipmentType', equipmentType)
            .equal('name', name)
            .query();

        // loop over the points and add/update the event detectors
        for (const point of points) {
            // replace DP_ with ED_ for the event detector's XID
            const xidBase = point.getXid().replace(/^DP_/, 'ED_');

            for (const eventDetector of eds2) {
                // use an XID that corresponds to the type/level so we can update it if it already exists
                const detectorXid = `${xidBase}_${eventDetector.type}_${eventDetector.level}`;
                let detector;
                try {
                    detector = eventDetectorsService.get(detectorXid);
                } catch (e) {
                    const definition = ModuleRegistry.getEventDetectorDefinition(eventDetector.type);
                    detector = definition.baseCreateEventDetectorVO(point);
                    detector.setXid(detectorXid);
                }

                // update the detector's level/duration/limit/state
                detector.setAlarmLevel(AlarmLevels.fromName(eventDetector.level));
                if (eventDetector.duration) {
                    detector.setDuration(Number.parseInt(eventDetector.duration));
                }
                if (eventDetector.limit) {
                    detector.setLimit(Number.parseFloat(eventDetector.limit));
                } else if (eventDetector.state) {
                    detector.setState(Number.parseInt(eventDetector.state, 10));
                    detector.setInverted(eventDetector.inverted === 'true');
                }

                try {
                    // create or update the data point
                    if (detector.getId() < 0) {
                        eventDetectorsService.insert(detector);
                    } else {
                        eventDetectorsService.update(detectorXid, detector);
                    }
                    print(`Saved ${detectorXid}`);
                    log.info('Saved {}', detectorXid);
                    savedCount++;
                } catch (e) {
                    print(`Error ${detectorXid}`);
                    log.error('Error saving {}', detectorXid, e);
                    errorCount++;
                }
            }

            // reload the data point so it picks up its new event detectors
            dataPointService.reloadDataPoint(point.getId());
        }
    }
}

print(`Saved ${savedCount}, errors ${errorCount}`);
log.info('Saved {}, errors {}', savedCount, errorCount);