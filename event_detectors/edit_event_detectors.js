/** Edit a group of even detectors
 * The edit_event_detectors.js script requires a CSV file to be present in the filestore 
 * named event-detectors-to-edit.csv with the following structure: 
 * eventDetectorId, eventDetectorXid, detectorType, newDetectorName, newLimit, newAlarmLevel, any, other, column, can, be, present, but, will, be, ignored
 * 
 * This script will:
 *     1. Locate the event detector that matches the eventDetectorXid provided
 *     2. Confirm the id is also a match (always double-verify before editing things)
 *     3. Confirm the detectorType is correct
 *        LOW_LIMIT
 *        HIGH_LIMIT
 *        Fail on a mismatch
 *        Fail if some other type of detector that is not supported
 *     4. Set the new DetectorName, Limit, and/or AlarmLevel values as needed    
 *        If any of the new* columns are empty, that value should be left unchanged
 *     
 *      NOTE: "EMPTY" is not a valid name for an event detector using this script
 * 
 *   
 * User configurable variable:
 *  Set enableConsoleLog = true, to enable verbose logging
 *  Set enableConsoleLog = false, to disable verbose logging
 *  Verbose logging may impact the performance if the script is updating a large number of event detectors
 */
const enableConsoleLog = true;


const fileName = 'event-detectors-to-edit.csv';
const fileStorePath = 'default';
const RESERVED_EMPTY = "EMPTY";
const Files = Java.type('java.nio.file.Files');
const AlarmLevels = Java.type('com.serotonin.m2m2.rt.event.AlarmLevels');
const mainHeaders = [];
mainHeaders.push("eventDetectorId", "eventDetectorXid", "detectorType", "newDetectorName", "newLimit", "newAlarmLevel");

const compare = (actual, expected, message) => {
    if (actual === expected) return
    else throw new Error(`${message}: \"${actual}\" is NOT equal to \"${expected}\"!`)
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
        const row = lines[i].replace(/["']/g, "").replace(/\s+/g, "").split(',');
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
for (const eventDetectorCsv of eventDetectorsArray) {
    let detector;
    let update = false;
    //Validations

    verbose(eventDetectorCsv.eventDetectorXid);
    try {
        detector = eventDetectorsService.get(eventDetectorCsv.eventDetectorXid);
    } catch (e) {

        log.error('Failed editing the event detector with XId {} NOT FOUND!', eventDetectorCsv.eventDetectorXid);
        verbose(`Failed editing the event detector with XId ${eventDetectorCsv.eventDetectorXid} NOT FOUND!`);
        failed++;
        continue;
    }


    try {
        verbose(detector.getId().toString() + " length:" + detector.getId().toString().length + " TypeOf:" + typeof detector.getId().toString());
        verbose(eventDetectorCsv.eventDetectorId + " length:" + eventDetectorCsv.eventDetectorId.length + " TypeOf:" + typeof eventDetectorCsv.eventDetectorId);
        if (typeof detector.getId() == 'number')
            compare(detector.getId().toString(), eventDetectorCsv.eventDetectorId, "eventDetectorId MISMATCH");
        else
            compare(detector.getId(), eventDetectorCsv.eventDetectorId, "eventDetectorId MISMATCH");

        verbose(`VALIDATED: Editing event detector ${detector.getName()} with id: ${detector.getId()}`);
    } catch (e) {
        log.error('Failed editing the event detector with XId {} because: {}', eventDetectorCsv.eventDetectorXid, e.message);
        verbose(`Failed editing event detector ${e.message}`);
        failed++;
        continue;
    }

    if (eventDetectorCsv.detectorType && eventDetectorCsv.detectorType != RESERVED_EMPTY) {
        try {
            isTypeSupported(eventDetectorCsv.detectorType);
            verbose(eventDetectorCsv.detectorType + " length:" + eventDetectorCsv.detectorType.length + " TypeOf:" + typeof eventDetectorCsv.detectorType);
            verbose(detector.getDetectorType() + " length:" + detector.getDetectorType().length + " TypeOf:" + typeof detector.getDetectorType());
            compare(detector.getDetectorType(), eventDetectorCsv.detectorType, "Type MISMATCH, Cannot change the Type");
            
        } catch (e) {
            log.error('Failed editing the event detector with XId {} because: {}', eventDetectorCsv.eventDetectorXid, e.message);
            verbose(`Failed editing event detector ${e.message}`);
            failed++;
            continue;
        }

    }

    if (eventDetectorCsv.newDetectorName && eventDetectorCsv.newDetectorName != RESERVED_EMPTY) {
        verbose(`editing Detector Name: ${detector.getName()}`);
        detector.setName(eventDetectorCsv.newDetectorName);
        verbose(`Detector Name: ${detector.getName()}`);

        update = true;
    }

    if (eventDetectorCsv.newLimit && eventDetectorCsv.newLimit != RESERVED_EMPTY) {
        verbose(`editing Detector limit: ${detector.getName()} to new limit ${eventDetectorCsv.newLimit}`);
        detector.setLimit(Number.parseFloat(eventDetectorCsv.newLimit));
        const validateMsg = eventDetectorsService.validate(detector).getMessages();
        if (validateMsg && validateMsg.length != 0) {
            log.error('Limit validation failed for xid {} Reason:{}', eventDetectorCsv.eventDetectorXid, validateMsg);
            verbose(`Limit validation failed for xid ${eventDetectorCsv.eventDetectorXid} Reason: ${validateMsg}`);
            update = false;
            failed++;
            continue;
        }
        verbose(`Detector new limit: ${detector.getLimit()}`);
        update = true;
    }

    if (eventDetectorCsv.newAlarmLevel && eventDetectorCsv.newAlarmLevel != RESERVED_EMPTY) {
        verbose(`editing Detector AlarmLevel: ${detector.getName()} to new AlarmLevel ${eventDetectorCsv.newAlarmLevel}`);
        let validAlarmLevel
        try {
            validAlarmLevel = AlarmLevels.fromName(eventDetectorCsv.newAlarmLevel);

        } catch (typeError) {
            log.error('AlarmLevel validation failed for xid {} Reason:{}', eventDetectorCsv.eventDetectorXid, typeError);
            verbose(`AlarmLevel validation failed for xid ${eventDetectorCsv.eventDetectorXid} Reason: ${typeError}`);
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

            eventDetectorsService.update(eventDetectorCsv.eventDetectorXid, detector);
            count++;
            verbose(`Detector ${detector.getId()} xid ${eventDetectorCsv.eventDetectorXid} UPDATED!`);

        } catch (e) {
            verbose(`Error ${eventDetectorCsv.eventDetectorXid}`);
            log.error('Error saving {}: {}', eventDetectorCsv.eventDetectorXid, e);
            failed++;
        }
    }else{
        verbose(`Nothing to update for detector ${detector.getId()} xid ${eventDetectorCsv.eventDetectorXid}`);
    }

    if (count % 10 == 0) {
        verbose(`Edited ${count} event detectors out of ${eventDetectorsArray.length}`);
    }
}
console.log(`Finished editing ${count} out of ${eventDetectorsArray.length} event detectors with ${failed} errors`);

/**
 Example to create the CSV file from an SQL query

SELECT eD.id as eventDetectorId, eD.xid as eventDetectorXid, eD.typeName as detectorType,
    '' as newDetectorName, '' as newLimit,'' as newAlarmLevel, 
    eD.data->>'$.name' as detectorName, eD.data->>'$.limit' as detectorLimit,
    eD.data->>'$.alarmLevel' as detectorAlarmLevel, eD.data->>'$.sourceType' as detectorSourceType, 
    dP.id as dataPointId, dP.xid as dataPointXid, dS.id as dataSourceId, dS.xid as dataSourceXid,
    dS.name as dataSourceName, dS.dataSourceType
FROM eventDetectors eD
INNER JOIN dataPoints dP ON eD.dataPointId = dP.id
INNER JOIN dataSources dS ON dP.dataSourceId = dS.id
WHERE
    (
        eD.data->>'$.sourceType' IN ('DATA_POINT')
    )
AND 
    (
        dS.id IN (63, 65, 69)
        OR
        dS.xid IN ('DS_b3dfc7fa-416e-4650-b8de-b521ce288275')
    )
AND
	(
		eD.typeName IN ('HIGH_LIMIT', 'LOW_LIMIT')
	)
AND
    (
        eD.data->>'$.name' LIKE 'Weather%'
        OR
        eD.data->>'$.name' LIKE 'weather%'
    )
AND
    (
        dP.name LIKE 'weatherAlert%'
    )
 */

