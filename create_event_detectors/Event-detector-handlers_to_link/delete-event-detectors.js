/** Delete a group of event detectors
 * The delete-event-detectors.js script could require a CSV file be present in the filestore 
 * named event-detectors-to-delete.csv with the following structure: 
 * eventDetectorId, eventDetectorXid, any, other, column, can, be, present, but, will, be, ignored
 * 
 * This script will:
 *     1. Locate the event detector that matches the xid provided
 *     2. Confirm the id is also a match (always double-verify before deleting things)
 *     3. Delete the event detector
 * 
 * User configurable variable:
 *  Set enableConsoleLog = true, to eneble verbose logging
 *  Set enableConsoleLog = false, to disable verbose logging
 *  Verbose logging may impact the perdormance if the script is updating a large number of event detectors
 */
const enableConsoleLog = true;
const fileName = 'event-detectors-to-delete.csv';
const fileStorePath = 'default';


const Files = Java.type('java.nio.file.Files');
const mainHeaders = [];
mainHeaders.push("eventDetectorId", "eventDetectorXid");

const compare = (actual, expected, message) => {
    if (actual == expected) return
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
        const row = lines[i].replace(/["']/g, "").replace(/\s+/g, "").split(',');
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

const verbose = (logMessage) => {
    if (!enableConsoleLog) return;
    else console.log(logMessage);

}

const eventDetectorsService = services.eventDetectorsService;
const eventDetectorsArray = readCsv(fileStorePath, fileName);

console.log(`Deleting ${eventDetectorsArray.length} event detectors`);
let count = 0;
let failed = 0;
for (const eventDetectorCsv of eventDetectorsArray) {

    //validations
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

    let detector;
    try {
        detector = eventDetectorsService.get(eventDetectorCsv.eventDetectorXid);
    } catch (e) {
        log.error('Failed deleting the event detector with XId {} NOT FOUND!', eventDetectorCsv.eventDetectorXid);
        verbose(`'Failed deleting the event detector with XId ${eventDetectorCsv.eventDetectorXid} NOT FOUND!'`);
        failed++;
        continue;
    }

    try {
        compare(detector.getId(), eventDetectorCsv.eventDetectorId, "eventDetectorId MISMATCH");
        verbose(`Deleting event detector ${detector.getName()} with id: ${detector.getId()}`);
        eventDetectorsService.delete(detector);
        count++;
    } catch (e) {
        log.error('Failed deleting the event detector with XId {} because: {}', eventDetectorCsv.eventDetectorXid, e.message);
        verbose(`Failed deleting event detector ${e.message}`);
        failed++;
    }

    if (count % 10 == 0) {
        verbose(`Deleted ${count} event detectors out of ${eventDetectorsArray.length}`);
    }
}

console.log(`Finished deleting ${count} out of ${eventDetectorsArray.length} event detectors with ${failed} errors`);

/*
Example to create the CSV file from an SQL query
SELECT eD.id as eventDetectorId, eD.xid as eventDetectorXid, 
    dP.id as dataPointId, dP.xid as dataPointXid, 
    eD.sourceTypeName as detectorsourceTypeName,  eD.TypeName as detectorTypeName, 
    '' as `limit`, '' as alarmLevel, 
    dP.name as dataPointName, dS.id as dataSourceId,
    dS.xid as dataSourceXid, dS.name as dataSourceName, dS.dataSourceType,
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
