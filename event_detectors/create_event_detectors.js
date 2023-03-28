/**
 * Create a group of even detectors
 * The create_event_detectors.js script requires a CSV file to be present in the filestore 
 * named event-detectors-to-create.csv with the following structure: 
 * dataPointId,dataPointXid,detectorType,detectorName,limit,alarmLevel,dataPointName, any, other, column, can, be, present, but, will, be, ignored
 * 
 * This script will:
 *  1. Get and Validate headers
 *  2. Confirm the detectorType is correct
 *      LOW_LIMIT
 *      HIGH_LIMIT
 *      Fail on a mismatch
 *      Fail if some other type of detector that is not supported
 *  3. Create the new event detector
 *  4. Set the detectorType DetectorName, Limit, and/or AlarmLevel values as needed
 *      If any of the new* columns are empty, that value should be left unchanged
 *  5. Insert the event detector. 
 * 
 * 
 *  
 * User configurable variable:
 *  Set enableConsoleLog = true, to eneble verbose logging
 *  Set enableConsoleLog = false, to disable verbose logging
 *  Verbose logging may impact the perdormance if the script is updating a large number of event detectors
 */
const enableConsoleLog = true;



const fileName = 'event-detectors-to-create.csv';
const fileStorePath = 'default';

const Files = Java.type('java.nio.file.Files');
const Common = Java.type('com.serotonin.m2m2.Common');
const ModuleRegistry = Java.type('com.serotonin.m2m2.module.ModuleRegistry');
const AlarmLevels = Java.type('com.serotonin.m2m2.rt.event.AlarmLevels');
const dataPointService = services.dataPointService;

const mainHeaders = [];
mainHeaders.push("dataPointId", "dataPointXid", "detectorType", "detectorName", "limit", "alarmLevel", "dataPointName");

const compare = (actual, expected, message) => {
    if (actual === expected) return
    else throw new Error(`${message}: ${actual} is NOT equal to ${expected}!`)
}

function readCsv(fileStore, filePath) {
    const path = services.fileStoreService.getPathForRead(fileStore, filePath);
    const lines = Array.from(Files.readAllLines(path));
    const header = lines.shift().replace(/["']/g, '').replace(/\s+/g, "").split(',');

    //Validate headers 
    for (let index = 0; index < mainHeaders.length; index++) {
        compare(header[index], mainHeaders[index], `Fatal Error. Expected column header name ${mainHeaders[index]} mismatch`);
    }

    //Get the data
    for (let i = 0; i < lines.length; i++) {
        const row = lines[i].replace(/["']/g, "").split(',');
        const data = lines[i] = {};
        for (let j = 0; j < row.length; j++) {
            data[header[j]] = row[j];
        }
    }
    return lines;
}

function assureNotEmpty(name, value) {
    if (!value) {
        throw new Error(`Failed ${name} validation`);
    }
    return;
}


const isTypeSupported = (type) => {
    switch (type) {
        case "HIGH_LIMIT":
        case "LOW_LIMIT":
            verbose(`${type}: supported`);
            return;
        default:
            if (type) throw new Error(`detectorType ${type}: Not Supported!`);
            else throw new Error(`: No supported detectorType provided!`);

    }
}

const verbose = (logMessage) => {
    if (!enableConsoleLog) return;
    else console.log(logMessage);

}

const eventDetectorsService = services.eventDetectorsService;
const eventDetectorsArray = readCsv(fileStorePath, fileName);
const emptyMessage = "[]";

console.log(`Creating ${eventDetectorsArray.length} event detectors`);
let count = 0;
let failed = 0;
for (const eventDetectorCsv of eventDetectorsArray) {

    let insertED = false;
    //Validations
    try {
        for (const [key, value] of Object.entries(eventDetectorCsv)) {
            if (mainHeaders.includes(key)) {
                assureNotEmpty(key, value);
            }
        }

    } catch (error) {
        log.error('Will not create new Event Detector. {} ', error.message);
        verbose(error.message);
        failed++;
        continue;
    }

    try {
        isTypeSupported(eventDetectorCsv.detectorType);
        verbose(`VALIDATED:`);
    } catch (e) {
        log.error('Will not create new Event Detector. Failed validation: {}', e.message);
        verbose(`Failed validation: ${e.message}`);
        failed++;
        continue;
    }
    let validAlarmLevel;
    try {
        validAlarmLevel = AlarmLevels.fromName(eventDetectorCsv.alarmLevel);
    } catch (typeError) {
        log.error('AlarmLevel validation failed Reason:{}', typeError);
        verbose(`AlarmLevel validation failed Reason: ${typeError}`);
        insertED = false;
        failed++;
        continue;
    }

    const eventDetectorXid = Common.generateXid("ED_");
    let detector;
    let point;
    try {

        point = dataPointService.get(eventDetectorCsv.dataPointXid);
        const definition = ModuleRegistry.getEventDetectorDefinition(eventDetectorCsv.detectorType);
        detector = definition.baseCreateEventDetectorVO(point);
        detector.setXid(eventDetectorXid);
    } catch (e) {
        log.error('Failed creating the event detector: {}', e);
        verbose(`Failed creating the event detector: ${e}`);
        failed++;
        continue;
    }

    //set name
    detector.setName(eventDetectorCsv.detectorName);
    verbose(`Detector Name: ${detector.getName()}`);

    //set limit
    detector.setLimit(Number.parseFloat(eventDetectorCsv.limit));
    verbose(`Detector new limit: ${detector.getLimit()}`);

    //set AlarmLevel
    detector.setAlarmLevel(validAlarmLevel);
    verbose(`Detector AlarmLevel: ${detector.getAlarmLevel()}`);

    const validateMsg = eventDetectorsService.validate(detector).getMessages();
    if (validateMsg && validateMsg.length != 0) {
        log.error('Limit validation failed for xid {} Reason:{}', eventDetectorXid, validateMsg);
        verbose(`Limit validation failed for xid ${eventDetectorXid} Reason: ${validateMsg}`);
        insertED = false;
        failed++;
        continue;
    }
    verbose(`Ready to Insert: ${detector.toString()}`);

    try {
        eventDetectorsService.insert(detector);
        count++;
    } catch (e) {
        verbose(`Error ${eventDetectorXid}`);
        log.error('Error saving {}: {}', eventDetectorXid, e.message);
        failed++;
    }

    // reload the data point so it picks up its new event detectors
    dataPointService.reloadDataPoint(point.getId());

    if (count % 10 == 0) {
        verbose(`Created ${count} event detectors out of ${eventDetectorsArray.length}`);
    }
}
console.log(`Finished creating ${count} out of ${eventDetectorsArray.length} event detectors with ${failed} errors`);

/**
 Example to create the CSV file from an SQL query
SELECT dP.id as dataPointId, dP.xid as dataPointXid, 
    '' as detectorType, '' as detectorName, 
    '' as `limit`, '' as alarmLevel, 
    dP.name as dataPointName, dS.id as dataSourceId,
    dS.xid as dataSourceXid, dS.name as dataSourceName, dS.dataSourceType
FROM eventDetectors eD
INNER JOIN dataPoints dP ON eD.dataPointId = dP.id
INNER JOIN dataSources dS ON dP.dataSourceId = dS.id
WHERE
    (
        dS.xid IN ('DS_b3dfc7fa-416e-4650-b8de-b521ce288275')
    )
AND
    (
        dP.name LIKE 'onOffAlarmPoint%'
    )
	
 */

