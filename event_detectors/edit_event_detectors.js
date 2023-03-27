/*Edit a group of even detectors
The edit_event_detectors.js script requires a CSV file to be present in the filestore 
named event-detectors-to-edit.csv with the following structure: 
eventDetectorId, eventDetectorXid, detectorType, newDetectorName, newLimit, newAlarmLevel, any, other, column, can, be, present, but, will, be, ignored

This script will:
    1. Locate the event detector that matches the eventDetectorXid provided
    2. Confirm the id is also a match (always double-verify before editing things)
    3. Confirm the detectorType is correct
       LOW_LIMIT
       HIGH_LIMIT
       Fail on a mismatch
       Fail if some other type of detector that is not supported
    4. Set the new DetectorName, Limit, and/or AlarmLevel values as needed    
       If any of the new* columns are empty, that value should be left unchanged

    */

//User configurable variables:
const enableConsoleLog = true;
const fileName = 'event-detectors-to-edit.csv';
const fileStorePath = 'default';


const Files = Java.type('java.nio.file.Files');
const AlarmLevels = Java.type('com.serotonin.m2m2.rt.event.AlarmLevels');
const mainHeaders = [];
mainHeaders.push("eventDetectorId", "eventDetectorXid", "detectorType", "newDetectorName", "newLimit", "newAlarmLevel");

const compare = (actual, expected, message) => {
    if (actual === expected) return
    else throw new Error(`${message}: ${actual} is NOT equal to ${expected}!`)
}

function readCsv(fileStore, filePath) {
    const path = services.fileStoreService.getPathForRead(fileStore, filePath);
    const lines = Array.from(Files.readAllLines(path));
    //Get the headers, replaces the quotation marks, removes blank spaces
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

console.log(`Editing ${eventDetectorsArray.length} event detectors`);
let count = 0;
let failed = 0;
for (const eventDetector of eventDetectorsArray) {
    let detector;
    let update = false;
    //Validations

    verbose(eventDetector.eventDetectorXid);
    try {
        detector = eventDetectorsService.get(eventDetector.eventDetectorXid);
    } catch (e) {

        log.error('Failed editing the event detector with XId {} NOT FOUND!', eventDetector.eventDetectorXid);
        verbose(`Failed editing the event detector with XId ${eventDetector.eventDetectorXid} NOT FOUND!`);
        failed++;
        continue;
    }
    if (eventDetector.detectorType) {
        try {
            isTypeSupported(eventDetector.detectorType);
            compare(detector.getId(), eventDetector.eventDetectorId, "eventDetectorId MISMATCH");
            compare(detector.getDetectorType(), eventDetector.detectorType, "Type MISMATCH");
            verbose(`VALIDATED: Editing event detector ${detector.getName()} with id: ${detector.getId()}`);
        } catch (e) {
            log.error('Failed editing the event detector with XId {} because: {}', eventDetector.eventDetectorXid, e.message);
            verbose(`Failed editing event detector ${e.message}`);
            failed++;
        }

    }
    if (eventDetector.newDetectorName) {
        verbose(`editing Detector Name: ${detector.getName()}`);
        detector.setName(eventDetector.newDetectorName);
        verbose(`Detector Name: ${detector.getName()}`);

        update = true;
    }

    if (eventDetector.newLimit) {
        verbose(`editing Detector limit: ${detector.getName()} to new limit ${eventDetector.newLimit}`);
        detector.setLimit(Number.parseFloat(eventDetector.newLimit));
        const validateMsg = eventDetectorsService.validate(detector).getMessages();
        if (validateMsg && validateMsg.length != 0) {
            log.error('Limit validation failed for xid {} Reason:{}', eventDetector.eventDetectorXid, validateMsg);
            verbose(`Limit validation failed for xid ${eventDetector.eventDetectorXid} Reason: ${validateMsg}`);
            update = false;
            failed++;
            continue;
        }
        verbose(`Detector new limit: ${detector.getLimit()}`);

        update = true;
    }

    if (eventDetector.newAlarmLevel) {
        verbose(`editing Detector AlarmLevel: ${detector.getName()} to new AlarmLevel ${eventDetector.newAlarmLevel}`);
        let validAlarmLevel
        try {
            validAlarmLevel = AlarmLevels.fromName(eventDetector.newAlarmLevel);

        } catch (typeError) {
            log.error('AlarmLevel validation failed for xid {} Reason:{}', eventDetector.eventDetectorXid, typeError);
            verbose(`AlarmLevel validation failed for xid ${eventDetector.eventDetectorXid} Reason: ${typeError}`);
            update = false;
            failed++;
            continue;
        }

        detector.setAlarmLevel(validAlarmLevel);
        verbose(`Detector AlarmLevel: ${detector.getAlarmLevel()}`);

        update = true;

    }
    if (update) {
        try {

            eventDetectorsService.update(eventDetector.eventDetectorXid, detector);
            count++;


        } catch (e) {
            verbose(`Error ${eventDetector.eventDetectorXid}`);
            log.error('Error saving {}: {}', eventDetector.eventDetectorXid, e);
            failed++;
        }
    }

    if (count % 10 == 0) {
        verbose(`Edited ${count} event detectors out of ${eventDetectorsArray.length}`);
    }
}
console.log(`Finished editing ${count} out of ${eventDetectorsArray.length} event detectors with ${failed} errors`);

/**
 Example to create the CSV file from an SQL query
 SELECT eD.id as eventDetectorId, eD.xid as eventDetectorXid,
    '' as detectorType, '' as newDetectorName, 
    '' as newLimit, '' as newAlarmLevel,	
    dP.id as dataPointId, dP.xid as dataPointXid, 
    eD.TypeName as currentDetectorType,
    eD.data as detectorData
FROM eventDetectors eD
INNER JOIN dataPoints dP ON eD.dataPointId = dP.id
INNER JOIN dataSources dS ON dP.dataSourceId = dS.id
WHERE
    (
        dS.id IN (63, 65, 69)
        OR
        dS.xid IN ('internal_mango_monitoring_ds')
    )
AND
    (
        dP.name LIKE 'JVM%'
    );
 */

