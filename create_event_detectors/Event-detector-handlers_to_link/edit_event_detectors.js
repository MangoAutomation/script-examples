/** Edit a group of even detectors
 * Was Tested MANGO 4.5.x
 * Last update September-2023
 * The edit_event_detectors.js script requires a CSV file to be present in the filestore 
 * named event-detectors-to-edit.csv with the following structure: 
 * eventDetectorId, eventDetectorXid, detectorType, newDetectorName, newLimit, newAlarmLevel, newStateValues, newStateInverted,newDuration,newDuration_unit, handlers_to_link, handlers_to_remove", dataPointType, any, other, column, can, be, present, but, will, be, ignored
 * 
 * This script will:
 *     1. Locate the event detector that matches the eventDetectorXid provided
 *     2. Confirm the id is also a match (always double-verify before editing things)
 *     3. Confirm the detectorType is correct
 *        LOW_LIMIT
 *        HIGH_LIMIT
 *        MULTISTATE_STATE
 *        BINARY_STATE
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
 * 
 *  ==== DURATION TYPE CONVENTIONS ====
 *   SECONDS = 1;
     MINUTES = 2;
     HOURS = 3;
     DAYS = 4;
   
 *  =================
 *  Set handlersLinkDelimiter = ';'...'*', to the delimiter handlers_to_link or handlers_to_remove. It cannot be a comma as this will break the CSV file format
 *  Verbose logging may impact the performance if the script is updating a large number of event detectors
*/
const enableConsoleLog = true;
const handlersLinkDelimiter = ';'


const fileName = 'event-detectors-to-edit.csv';
const fileStorePath = 'default';
const RESERVED_EMPTY = "EMPTY";
const Files = Java.type('java.nio.file.Files');
const AlarmLevels = Java.type('com.serotonin.m2m2.rt.event.AlarmLevels');
const eventHandlerService = services.eventHandlerService;

const mainHeaders = [];
mainHeaders.push("eventDetectorId", "eventDetectorXid", "detectorType", "newDetectorName", "newAlarmLevel", "newLimit", "newStateValues", "newStateInverted", "newDuration", "newDurationType", "handlers_to_link", "handlers_to_remove", "dataPointType");

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
        case "MULTISTATE_STATE":
        case "BINARY_STATE":
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
const eventDetectorsArray = handlersLinkDelimiter === ',' ? [] : readCsv(fileStorePath, fileName);
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
    // Set duration if newDuration is different empty
    let duration_unit = 1;
    if (!['', 'EMPTY'].includes(eventDetectorCsv.newDuration)) {
        try {
            if (Number.isNaN(Number.parseInt(eventDetectorCsv.newDuration))) {
                throw new Error(`duration ${eventDetectorCsv.newDuration}: Not Supported!`)
            } else {
                verbose(`Detector Named: ${detector.getName()} change duration ${eventDetectorCsv.newDuration}`);
                detector.setDuration(Number.parseInt(eventDetectorCsv.newDuration))
                update = true;
            }
        } catch (e) {
            log.error('Duration is:{}', e);
            verbose(`Duration failed Reason: ${e}`);
            failed++;
            continue;
        }
    }

    // Set duration if newDurationType is different empty or valid duration type 1,2,3,4
    if (!['', 'EMPTY'].includes(eventDetectorCsv.newDurationType)) {
        try {
            if (![1, 2, 3, 4].includes(Number.parseInt(eventDetectorCsv.newDurationType))) {
                throw new Error(`duration unit ${type}: Not Supported!`)
            }
            detector.setDurationType(Number.parseInt(eventDetectorCsv.newDurationType))
            verbose(`Detector Name: ${detector.getName()} change duration unit ${eventDetectorCsv.newDurationType}`);
            update = true

        } catch (typeError) {
            verbose(`Duration Unit failed Reason: ${typeError}`);
            failed++;
            continue;
        }
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

    let foundEventHandlers = [];
    if (!eventDetectorCsv.handlers_to_link || eventDetectorCsv.handlers_to_link !== RESERVED_EMPTY) {
        const handlersLink = eventDetectorCsv.handlers_to_link.split(handlersLinkDelimiter);
        for (const xid of Array.from(handlersLink)) {
            try {
                eventHandlerService.get(xid)
                foundEventHandlers.push(xid)
            } catch (e) {
                log.error('Failed Linking the event handler with XId {} NOT FOUND!', xid);
                verbose(`Failed Linking the event handler with XId ${xid} NOT FOUND!`);
                continue;
            }
        }
        if (foundEventHandlers.length) {
            //Validate if handlers_to_link bellow into event detector
            let eventHandlersXids = [];
            detector.getEventHandlerXids().forEach(element => eventHandlersXids.push(element));

            // Array with new linked event handlers
            const newEventHandlers = foundEventHandlers.filter((element) => !eventHandlersXids.includes(element))
            const result = Array.from(new Set([...eventHandlersXids, ...newEventHandlers]));
            detector.setEventHandlerXids(result);
            update = true;

        }
    }

    //Validate handlers_to_remove
    if (!eventDetectorCsv.handlers_to_remove || eventDetectorCsv.handlers_to_remove !== RESERVED_EMPTY) {
        foundEventHandlers = [];
        const handlersLink = eventDetectorCsv.handlers_to_remove.split(handlersLinkDelimiter);
        for (const xid of Array.from(handlersLink)) {
            try {
                eventHandlerService.get(xid)
                foundEventHandlers.push(xid)
            } catch (e) {
                log.error('Failed Linking the event handler with XId {} NOT FOUND!', xid);
                verbose(`Failed Linking the event handler with XId ${xid} NOT FOUND!`);
                continue;
            }
        }

        if (foundEventHandlers.length) {
            //Validate if handlers_to_remove bellow into event detector
            let eventHandlersXids = [];
            detector.getEventHandlerXids().forEach(element => eventHandlersXids.push(element));

            // Array without event handler to be removed
            const newEventHandlers = eventHandlersXids.filter((element) => !foundEventHandlers.includes(element))
            //Array with no linked event handers
            const noLinkedEventHandlers = foundEventHandlers.filter((element) => !eventHandlersXids.includes(element))
            const result = Array.from(new Set(newEventHandlers));
            detector.setEventHandlerXids(result);
            update = true;

            noLinkedEventHandlers.forEach(xid => {
                verbose(`WARNING event handler << ${xid} >> was not linked to the event detector`);
                log.error(`WARNING event handler << ${xid} >> was not linked to the event detector`);
                failed++;
            })

        }

    }

    //Validate handlers_to_link, handlers_to_remove
    if (eventDetectorCsv.dataPointType === 'MULTISTATE' || eventDetectorCsv.dataPointType === 'BINARY' && (eventDetectorCsv.newStateValues != '' || eventDetectorCsv.newStateValues === RESERVED_EMPTY)) {

        if (eventDetectorCsv.dataPointType === 'MULTISTATE') {
            //Set MultiState value
            const stateValues = Array.from(eventDetectorCsv.newStateValues.split(handlersLinkDelimiter)).map(function (value) {
                return Number(value);
            });
            detector.setState(Number.parseInt([stateValues], 10));
            if (['true', 'false'].includes(eventDetectorCsv.newStateInverted.toLowerCase())) {
                detector.setInverted(eventDetectorCsv.newStateInverted.toLowerCase() === 'true' || eventDetectorCsv.newStateInverted === '1');
            } else {
                if (['empty', ''].includes(eventDetectorCsv.newStateInverted.toLowerCase())) {
                    log.error(`Event detector ${eventDetectorCsv.newDetectorName} -> stateInverted is not allow ${eventDetectorCsv.newStateInverted}`);
                    verbose(`Event detector ${eventDetectorCsv.newDetectorName} -> stateInverted is not allow ${eventDetectorCsv.newStateInverted}`);
                    failed++;
                }
            }
            detector.setStates(stateValues.length === 1 ? null : stateValues)
            update = true
        } else if (eventDetectorCsv.dataPointType === 'BINARY' && ['true', 'false'].includes(eventDetectorCsv.newStateValues)) {
            //Set Binary value
            console.log('get state', detector.getState, '----', eventDetectorCsv.newStateValues.toLowerCase())
            detector.setState(eventDetectorCsv.newStateValues.toLowerCase() === 'true' || eventDetectorCsv.newStateValues === '1')
            update = true
        } else {
            log.error(`Event detector ${eventDetectorCsv.newDetectorName} -> Event detector type ${eventDetectorCsv.type} Not Supported for this dataPointType!`);
            verbose(`Event detector ${eventDetectorCsv.newDetectorName} -> Event detector type ${eventDetectorCsv.type} Not Supported for this dataPointType!`);
            failed++;
        }

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
    } else {
        verbose(`Nothing to update for detector ${detector.getId()} xid ${eventDetectorCsv.eventDetectorXid}`);
    }


    if (count % 10 == 0) {
        verbose(`Edited ${count} event detectors out of ${eventDetectorsArray.length}`);
    }
}

const message = handlersLinkDelimiter === ',' ? `INVALID DELIMITER. Please use a different character as a delimiter in the event handler columns.` : `Finished editing ${count} out of ${eventDetectorsArray.length} event detectors with ${failed} errors`
console.log(message);

/**
 Example to create the CSV file from an MySQL SQL query

SELECT DISTINCT eD.id as eventDetectorId, eD.xid as eventDetectorXid, eD.typeName as detectorType,
    '' as newDetectorName, '' as newAlarmLevel, '' as newLimit, '' as newStateValues,
    '' as newStateInverted, 
    '' as newDuration, 
    '' as newDurationType,
    '' as handlers_to_link, 
    '' as handlers_to_remove,
    eD.data->>'$.name' as existingName,
    eD.data->>'$.alarmLevel' as existingAlarmLevel,
    eD.data->>'$.limit' as existingLimit,
    eD.data->>'$.duration' as existingDuration,
    REPLACE(REPLACE(REPLACE(REPLACE(eD.data->>'$.durationType','SECONDS',1),'MINUTES',2),'HOURS',3),'DAYS',4) as existingDurationType,
    CASE
        WHEN eD.data->>'$.states' = 'null' THEN eD.data->>'$.state'
        ELSE REPLACE(REPLACE(REPLACE(eD.data->>'$.states', '[', ''), ']', ''), ',', ';')
    END as existingStateValues,
    eD.data->>'$.inverted' as existingStateInverted, dP.name as dataPointName,
    REPLACE(REPLACE(REPLACE(REPLACE(dP.dataTypeId, '1', 'BINARY'),
       '2', 'MULTISTATE'), '3', 'NUMERIC'), '4',
       'ALPHANUMERIC') as dataPointType, eD.data->>'$.sourceType' as detectorSourceType,
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
        eD.typeName IN ('HIGH_LIMIT', 'LOW_LIMIT', 'BINARY_STATE', 'MULTISTATE_STATE')
    )
AND
    (
        dP.name LIKE 'onOffAlarmPoint%'
    )
AND
    (
        eD.data->>'$.name' LIKE 'Weather%'
        OR
        eD.data->>'$.name' LIKE 'weather%'
    )
 */

