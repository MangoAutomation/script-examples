/* Edit a group of event detectors
 * Tested on MANGO 4.5.x & Mango 5.0.X
 * Last update Oct 2024
 * The edit-event-detectors.js script requires a CSV file to be present in the filestore 
 * named event-detectors-to-edit.csv with the following structure: 
 * eventDetectorId, eventDetectorXid, detectorType, newDetectorName, newAlarmLevel, newLimit, newResetLimit, newUseResetLimit, newLowRangeLimit, newHighRangeLimit, newWithinRange, newStateValues, newStateInverted, newDuration, newDurationType, handlers_to_link, handlers_to_remove, dataPointType, any, other, column, can, be, present, but, will, be, ignored
 * 
 * This script will:
 *     1. Locate the event detector that matches the eventDetectorXid provided
 *     2. Confirm the id is also a match (always double-verify before editing things)
 *     3. Confirm the detectorType is correct
 *        LOW_LIMIT
 *        HIGH_LIMIT
 *        MULTISTATE_STATE
 *        BINARY_STATE
 *        NO_UPDATE
 *        UPDATE
 *        POINT_CHANGE
 *        RANGE
 *        Fail on a mismatch
 *        Fail if some other type of detector that is not supported
 *
 *     4. Set the new DetectorName, Limit, State Value(s), Duration, and/or AlarmLevel values as needed
 *        If any of the new* columns are blank or set to EMPTY, that value will be left unchanged
 *     
 *      NOTE: "EMPTY" is not a valid name for an event detector using this script as it is a reserved keyword
 * 
 *   
 * User configurable variable:
 *  Set enableConsoleLog = true, to enable verbose logging
 *  Set enableConsoleLog = false, to disable verbose logging
 *  Verbose logging may impact the performance if the script is updating a large number of event detectors
 * 
 *  Set handlersLinkDelimiter to the delimiter used in handlers_to_link or handlers_to_remove. It cannot be a comma as this will break the CSV file format
 *
 *  ==== ALARM LEVELS ====
 *
 *   NONE
 *   INFORMATION
 *   IMPORTANT
 *   WARNING
 *   URGENT
 *   CRITICAL
 *   LIFE_SAFETY
 *   DO_NOT_LOG
 *   IGNORE
 *
 *  ===================================
 *
 *  ==== DURATION TYPE CONVENTIONS ====
 *   SECONDS = 1;
     MINUTES = 2;
     HOURS = 3;
     DAYS = 4;
 *  ===================================
 * 
*/

const enableConsoleLog = false;
const handlersLinkDelimiter = ';'

const fileName = 'event-detectors-to-edit.csv';
const fileStorePath = 'default';
const RESERVED_EMPTY = "EMPTY";
const Files = Java.type('java.nio.file.Files');
const AlarmLevels = Java.type('com.serotonin.m2m2.rt.event.AlarmLevels');
const eventHandlerService = services.eventHandlerService;
const mainHeaders = [];

mainHeaders.push("eventDetectorId", "eventDetectorXid", "detectorType", "newDetectorName", "newAlarmLevel", "newLimit", "newResetLimit", "newUseResetLimit", "newLowRangeLimit", "newHighRangeLimit", "newWithinRange", "newStateValues", "newStateInverted", "newDuration", "newDurationType", "handlers_to_link", "handlers_to_remove", "dataPointType");

function compare(actual, expected, message) {
    if (actual === expected) return
    else throw new Error(`COMPARE failed for ${message}: ${actual} is NOT equal to ${expected}.`)
}

function changeProperty(curProperty) {
    //Determine if the current proeprty in the CSV file is a blank cell, is set to the reserved keyword EMPTY, or
    //contains a useful value that should be processed
    if (curProperty && curProperty != RESERVED_EMPTY) {
        return true;
    }
    else {
        return false;
    }
}

function stringToBoolean(str) {
    if (str === "true") return true;
    else if (str === "false") return false;
    else throw new Error("Invalid input: must be 'true' or 'false'");
}

function parseFloat(property, str) {
    let number = Number.parseFloat(str);
    if (Number.isNaN(number)) {
        throw new Error(`Invalid input: ${property} -> ${str}: Not Supported!`);
    } else return number;
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

function isTypeSupported(type) {
    switch (type) {
        case "HIGH_LIMIT":
        case "LOW_LIMIT":
        case "MULTISTATE_STATE":
        case "BINARY_STATE":
        case "NO_UPDATE":
        case "UPDATE":
        case "POINT_CHANGE":
        case "RANGE":
            verbose(`${type}: supported`);
            return;
        default:
            if (type) throw new Error(`detectorType ${type}: Not Supported!`);
            else throw new Error(`: No supported detectorType provided!`);
    }
}

function verbose(logMessage) {
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

    //VALIDATIONS

    //Confirm the event detector XID exists
    verbose(eventDetectorCsv.eventDetectorXid);
    try {
        detector = eventDetectorsService.get(eventDetectorCsv.eventDetectorXid);
    } catch (e) {
        log.error('Failed editing the event detector with XID {}: {}', eventDetectorCsv.eventDetectorXid, e);
        verbose(`Failed editing the event detector with XID ${eventDetectorCsv.eventDetectorXid}: ${e}`);
        failed++;
        continue;
    }

    //Confirm the event detector ID provided matches the event detector linked to the XID
    try {
        compare(detector.getId().toString(), eventDetectorCsv.eventDetectorId, "eventDetectorId MISMATCH");
        verbose(`VALIDATED: Editing event detector ${detector.getName()} with id: ${detector.getId()}`);
    } catch (e) {
        log.error('Failed XID to ID match for XID {} because: {}', eventDetectorCsv.eventDetectorXid, e.message);
        verbose(`Failed XID to ID match for XID ${eventDetectorCsv.eventDetectorXid}: ${e.message} `);
        failed++;
        continue;
    }

    //Confirm the event detector type is supported by this script
    if (changeProperty(eventDetectorCsv.detectorType)) {
        try {
            isTypeSupported(eventDetectorCsv.detectorType);
            compare(detector.getDetectorType(), eventDetectorCsv.detectorType, "Type MISMATCH, Cannot change the Type");
        } catch (e) {
            log.error('Failed editing the event detector with XID {} because: {}', eventDetectorCsv.eventDetectorXid, e);
            verbose(`Failed editing event detector ${e.message}`);
            update = false;
            failed++;
            continue;
        }
    }

    //PROCESS CHANGES TO THE EVENT DETECTOR PROVIDED

    //Change the event detector name if newDetectorName has been set
    if (changeProperty(eventDetectorCsv.newDetectorName)) {
        verbose(`Editing Detector Name: ${detector.getName()}`);
        detector.setName(eventDetectorCsv.newDetectorName);
        verbose(`New Detector Name: ${detector.getName()}`);
        update = true;
    }

    //UPDATE AND POINT CHANGE detectors do not support duration. Ignore and warn if this is an UPDATE OR POINT CHANGE detector
    if (['UPDATE', 'POINT_CHANGE'].includes(eventDetectorCsv.detectorType)) {
        if (changeProperty(eventDetectorCsv.newDuration) || changeProperty(eventDetectorCsv.newDurationType)) {
            verbose(`Duration settings are not compatible with ${eventDetectorCsv.detectorType} detectors. Change duration attempt is ignored for detector with XID ${eventDetectorCsv.eventDetectorXid}.`);
            log.warn('Duration settings are not compatible with {} detectors. Change duration attempt is ignored for detector with XID {}.', eventDetectorCsv.detectorType, eventDetectorCsv.eventDetectorXid);
        }
    } else {
        // Change duration if newDuration has been set
        if (changeProperty(eventDetectorCsv.newDuration)) {
            try {
                if (Number.isNaN(Number.parseInt(eventDetectorCsv.newDuration))) {
                    throw new Error(`Duration ${eventDetectorCsv.newDuration}: Not Supported!`)
                } else {
                    verbose(`Detector Named: ${detector.getName()} change duration ${eventDetectorCsv.newDuration}`);
                    detector.setDuration(Number.parseInt(eventDetectorCsv.newDuration))
                    update = true;
                }
            } catch (e) {
                log.error('Change duration failed:{}', e);
                verbose(`Duration failed due to: ${e}`);
                update = false;
                failed++;
                continue;
            }
        }
        // Change durationType if newDurationType has been set and is a valid duration type: 1,2,3,4
        if (changeProperty(eventDetectorCsv.newDurationType)) {
            try {
                if (![1, 2, 3, 4].includes(Number.parseInt(eventDetectorCsv.newDurationType))) {
                    throw new Error(`Duration type ${eventDetectorCsv.newDurationType}: Not Supported. Expected 1, 2, 3, or 4.`)
                }
                detector.setDurationType(Number.parseInt(eventDetectorCsv.newDurationType))
                verbose(`Detector Name: ${detector.getName()} change duration type ${eventDetectorCsv.newDurationType}`);
                update = true
            } catch (typeError) {
                verbose(`Duration type failed Reason: ${typeError}`);
                update = false;
                failed++;
                continue;
            }
        }
    }

    // Change limit if newLimit has been set
    try {
        if (changeProperty(eventDetectorCsv.newLimit)) {
            verbose(`Editing Detector limit for ${eventDetectorCsv.eventDetectorXid} to new limit: ${eventDetectorCsv.newLimit}`);
            detector.setLimit(parseFloat('limit', eventDetectorCsv.newLimit));
            const validateMsg = eventDetectorsService.validate(detector).getMessages();
            if (validateMsg && validateMsg.length != 0) throw new Error(validateMsg);
            verbose(`Detector new limit: ${detector.getLimit()}`);
            update = true;
        }
    } catch (e) {
        log.error('Limit validation failed for xid {} Reason:{}', eventDetectorCsv.eventDetectorXid, e);
        verbose(`Limit validation failed for xid ${eventDetectorCsv.eventDetectorXid} Reason: ${e}`);
        console.log(`Limit validation failed for xid ${eventDetectorCsv.eventDetectorXid} Reason: ${e}`);
        update = false;
        failed++;
        continue;
    }

    // Change resetLimit if newResetLimit has been set
    try {
        if (changeProperty(eventDetectorCsv.newResetLimit)) {
            verbose(`Editing Detector reset limit for ${eventDetectorCsv.eventDetectorXid} to new reset limit: ${eventDetectorCsv.newResetLimit}`);
            detector.setResetLimit(parseFloat('reset limit', eventDetectorCsv.newResetLimit));
            const validateMsg = eventDetectorsService.validate(detector).getMessages();
            if (validateMsg && validateMsg.length != 0) throw new Error(validateMsg);
            verbose(`Detector new reset limit: ${detector.getResetLimit()}`);
            update = true;
        }
    } catch (e) {
        log.error('Reset limit validation failed for xid {} Reason:{}', eventDetectorCsv.eventDetectorXid, e);
        verbose(`Reset limit validation failed for xid ${eventDetectorCsv.eventDetectorXid} Reason: ${e}`);
        console.log(`Reset limit validation failed for xid ${eventDetectorCsv.eventDetectorXid} Reason: ${e}`);
        update = false;
        failed++;
        continue;
    }

    // Change useResetLimit if newUseResetLimit has been set
    try {
        if (changeProperty(eventDetectorCsv.newUseResetLimit)) {
            verbose(`Editing Detector use reset limit for ${eventDetectorCsv.eventDetectorXid} to new use reset limit: ${eventDetectorCsv.newUseResetLimit}`);
            detector.setUseResetLimit(stringToBoolean(eventDetectorCsv.newUseResetLimit.toLowerCase()));
            const validateMsg = eventDetectorsService.validate(detector).getMessages();
            if (validateMsg && validateMsg.length != 0) throw new Error(validateMsg);
            verbose(`Detector new use reset limit: ${detector.isUseResetLimit()}`);
            update = true;
        }
    } catch (e) {
        log.error('Use reset limit validation failed for xid {} Reason:{}', eventDetectorCsv.eventDetectorXid, e);
        verbose(`Use reset limit validation failed for xid ${eventDetectorCsv.eventDetectorXid} Reason: ${e}`);
        console.log(`Use reset limit validation failed for xid ${eventDetectorCsv.eventDetectorXid} Reason: ${e}`);
        update = false;
        failed++;
        continue;
    }

    // Change lowRangeLimit if newLowRangeLimit has been set
    try {
        if (changeProperty(eventDetectorCsv.newLowRangeLimit)) {
            verbose(`Editing Detector low range limit for ${eventDetectorCsv.eventDetectorXid} to new low range limit: ${eventDetectorCsv.newLowRangeLimit}`);
            detector.setLow(parseFloat('low range limit', eventDetectorCsv.newLowRangeLimit));
            const validateMsg = eventDetectorsService.validate(detector).getMessages();
            if (validateMsg && validateMsg.length != 0) throw new Error(validateMsg);
            verbose(`Detector new low range limit: ${detector.getLow()}`);
            update = true;
        }
    } catch (e) {
        log.error('Low range limit validation failed for xid {} Reason:{}', eventDetectorCsv.eventDetectorXid, e);
        verbose(`Low range limit validation failed for xid ${eventDetectorCsv.eventDetectorXid} Reason: ${e}`);
        console.log(`Low range limit validation failed for xid ${eventDetectorCsv.eventDetectorXid} Reason: ${e}`);
        update = false;
        failed++;
        continue;
    }

    try {
        // Change highRangeLimit if newHighRangeLimit has been set
        if (changeProperty(eventDetectorCsv.newHighRangeLimit)) {
            verbose(`Editing Detector high range limit for ${eventDetectorCsv.eventDetectorXid} to new high range limit: ${eventDetectorCsv.newHighRangeLimit}`);
            detector.setHigh(parseFloat('high range limit', eventDetectorCsv.newHighRangeLimit));
            const validateMsg = eventDetectorsService.validate(detector).getMessages();
            if (validateMsg && validateMsg.length != 0) throw new Error(validateMsg);
            verbose(`Detector new high range limit: ${detector.getHigh()}`);
            update = true;
        }
    } catch (e) {
        log.error('High range limit validation failed for xid {} Reason:{}', eventDetectorCsv.eventDetectorXid, e);
        verbose(`High range limit validation failed for xid ${eventDetectorCsv.eventDetectorXid} Reason: ${e}`);
        console.log(`High range limit validation failed for xid ${eventDetectorCsv.eventDetectorXid} Reason: ${e}`);
        update = false;
        failed++;
        continue;
    }

    // Change withinRange if newWithinRange has been set
    try {
        if (changeProperty(eventDetectorCsv.newWithinRange)) {
            verbose(`Editing Detector within range for ${eventDetectorCsv.eventDetectorXid} to new within range: ${eventDetectorCsv.newWithinRange}`);
            detector.setWithinRange(stringToBoolean(eventDetectorCsv.newWithinRange.toLowerCase()));
            const validateMsg = eventDetectorsService.validate(detector).getMessages();
            if (validateMsg && validateMsg.length != 0) throw new Error(validateMsg);
            verbose(`Detector new within range: ${detector.isWithinRange()}`);
            update = true;
        }
    } catch (e) {
        log.error('Within range validation failed for xid {} Reason:{}', eventDetectorCsv.eventDetectorXid, e);
        verbose(`Within range validation failed for xid ${eventDetectorCsv.eventDetectorXid} Reason: ${e}`);
        console.log(`Within range limit validation failed for xid ${eventDetectorCsv.eventDetectorXid} Reason: ${e}`);
        update = false;
        failed++;
        continue;
    }

    // Change alarmlevel if newAlarmLevel has been set
    if (changeProperty(eventDetectorCsv.newAlarmLevel)) {
        verbose(`Editing Detector alarmLevel for ${eventDetectorCsv.eventDetectorXid} to new alarmLevel: ${eventDetectorCsv.newAlarmLevel}`);
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
        verbose(`Detector AlarmLevel set to ${detector.getAlarmLevel()}`);
        update = true;
    }

    // Link new event handlers if handlers_to_link is set
    let foundEventHandlers = [];
    if (changeProperty(eventDetectorCsv.handlers_to_link)) {
        const handlersLink = eventDetectorCsv.handlers_to_link.split(handlersLinkDelimiter);
        for (const xid of Array.from(handlersLink)) {
            try {
                eventHandlerService.get(xid)
                foundEventHandlers.push(xid)
            } catch (e) {
                log.error('Failed Linking the event handler with XID {} NOT FOUND!', xid);
                verbose(`Failed Linking the event handler with XID ${xid} NOT FOUND!`);
                update = false;
                failed++;
                //Clear the list of event handlers to prevent the next section of code from executing
                foundEventHandlers = [];
                //Break out of this inner for loop 
                break;
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
        } else if (handlersLink.length) {
            //This happens when the foundEventHandlers was cleared due to an exception but the list of handlers we are trying
            //to link has values. This indicates a failure and we should stop processing this detector.
            continue;
        }
    }

    //Remove handlers if  handlers_to_remove is set
    if (changeProperty(eventDetectorCsv.handlers_to_remove)) {
        foundEventHandlers = [];
        const handlersLink = eventDetectorCsv.handlers_to_remove.split(handlersLinkDelimiter);
        for (const xid of Array.from(handlersLink)) {
            try {
                eventHandlerService.get(xid)
                foundEventHandlers.push(xid)
            } catch (e) {
                log.error('Failed Removing the event handler with XId {} NOT FOUND!', xid);
                verbose(`Failed Removing the event handler with XId ${xid} NOT FOUND!`);
                failed++;
                foundEventHandlers = [];
                break;
            }
        }
        if (foundEventHandlers.length) {
            //Validate if handlers_to_remove are linked to the event detector
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
                verbose(`Failed to unlink Event Handler ${xid} from event detector ${eventDetectorCsv.eventDetectorXid} as it was not found to be linked.`);
                log.warn('Failed to unlink Event Handler {} from event detector {} as it was not found to be linked.', xid, eventDetectorCsv.eventDetectorXid);
            })
        }
    }

    //Set stateInverted value(s) if newStateInverted is set for multistate detectors
    if (changeProperty(eventDetectorCsv.newStateInverted)) {
        if (eventDetectorCsv.dataPointType === 'MULTISTATE') {
            //Confirm the newStateInverted value is 'true', 'false', 'yes' or 'no'
            if (['true', 'false', 'yes', 'no'].includes(eventDetectorCsv.newStateInverted.toLowerCase())) {
                detector.setInverted(eventDetectorCsv.newStateInverted.toLowerCase() === 'true' || eventDetectorCsv.newStateInverted === 'yes');
                update = true;
            } else {
                log.error(`Event detector ${eventDetectorCsv.newDetectorName} -> stateInverted is not allowed for value: ${eventDetectorCsv.newStateInverted}`);
                verbose(`Event detector ${eventDetectorCsv.newDetectorName} -> stateInverted is not allowed for value: ${eventDetectorCsv.newStateInverted}`);
                update = false;
                failed++;
                continue;
            }
        } else {
            log.error('Failed setting newStateInverted: Event detector {}: Event detector type {}: State Inverted not supported for this dataPointType.', eventDetectorCsv.eventDetectorXid, eventDetectorCsv.type);
            verbose(`Failed setting newStateInverted: Event detector ${eventDetectorCsv.newDetectorName}: Event detector type: ${eventDetectorCsv.type}: State Inverted for not supported this dataPointType!`);
            update = false;
            failed++;
            continue;
        }
    }


    verbose(`Checking for newStateValues ${eventDetectorCsv.eventDetectorXid}: ${eventDetectorCsv.newStateValues}.`);
    //Set state value(s) if newStateValues is set for multistate detectors
    try {
        if (changeProperty(eventDetectorCsv.newStateValues)) {
            if (eventDetectorCsv.dataPointType === 'MULTISTATE') {
                const stateValues = Array.from(eventDetectorCsv.newStateValues.split(handlersLinkDelimiter)).map(function (value) {
                    return Number.parseInt(value);
                });
                verbose(`Found MULTISTATE ${eventDetectorCsv.eventDetectorXid}: ${stateValues.length} values.`);
                verbose(`Logging stateValues ${stateValues}.`);
                //Set MultiState value (or values)
                if (stateValues.length === 1) {
                    detector.setState(stateValues[0]);
                    update = true;
                }
                else if (stateValues.length > 1) {
                    detector.setStates(stateValues);
                    update = true;
                }
                else {
                    log.error('Failed setting newStateValues: Event detector {}: Negative or zero length stateValues {} are not supported.', eventDetectorCsv.eventDetectorXid, eventDetectorCsv.newStateValues);
                    verbose(`Failed setting newStateValues: Event detector ${eventDetectorCsv.eventDetectorXid}  Negative or zero length stateValues ${eventDetectorCsv.newStateValues}are  not supported.`);
                    update = false;
                    failed++;
                    continue;
                }
            } else if (eventDetectorCsv.dataPointType === 'BINARY' && ['true', 'false', '0', '1'].includes(eventDetectorCsv.newStateValues.toLowerCase())) {
                verbose(`Found BINARY and valid values ${eventDetectorCsv.eventDetectorXid}: ${eventDetectorCsv.newStateValues}`);
                //Set Binary value
                detector.setState(eventDetectorCsv.newStateValues.toLowerCase() === 'true' || eventDetectorCsv.newStateValues === '1');
                update = true;
            } else {
                log.error('Failed setting newStateValues: Event detector {}: Event detector type: {}: new state values {} not supported for this dataPointType.', eventDetectorCsv.eventDetectorXid, eventDetectorCsv.type, eventDetectorCsv.newStateValues);
                verbose(`Failed setting newStateValues: Event detector ${eventDetectorCsv.eventDetectorXid}: ${eventDetectorCsv.newStateValues} not supported for this dataPointType!`);
                update = false;
                failed++;
                continue;
            }

        }

    } catch (e) {
        verbose(`Error ${eventDetectorCsv.eventDetectorXid}: ${e.message}`);
        log.error('Error saving {}: {}', eventDetectorCsv.eventDetectorXid, e.toString());
        update = false;
        failed++;
        continue;
    }

    if (update) {
        try {
            //For Mango 4.3+, we should use updateAndReload
            if (eventDetectorsService.updateAndReload) {
                eventDetectorsService.updateAndReload(eventDetectorCsv.eventDetectorXid, detector, true);
                count++;
                verbose('UPDATE AND RELOAD');
                console.log(`Detector ${detector.getId()} XID ${eventDetectorCsv.eventDetectorXid}: UPDATED.`);
            } else if (eventDetectorsService.update) {
                eventDetectorsService.update(eventDetectorCsv.eventDetectorXid, detector);
                count++;
                verbose('UPDATE');
                console.log(`Detector ${detector.getId()} XID ${eventDetectorCsv.eventDetectorXid}: UPDATED.`);
            } else {
                verbose(`Error ${eventDetectorCsv.eventDetectorXid}: Unable to save and update the event detector. Expected methods were not found.`);
                log.error('Error saving {}: Unable to save and update the event detector. Expected methods were not found.', eventDetectorCsv.eventDetectorXid);
                failed++;
            }
        } catch (e) {
            verbose(`Error ${eventDetectorCsv.eventDetectorXid}: ${e.toString()}`);
            log.error('Error saving {}: {}', eventDetectorCsv.eventDetectorXid, e.toString());
            failed++;
        }
    } else {
        console.log(`Detector ${detector.getId()} XID ${eventDetectorCsv.eventDetectorXid}: NOTHING TO UPDATE.`);
    }
    if (count && count % 10 === 0) {
        console.log(`Edited ${count} event detectors out of ${eventDetectorsArray.length}`);
    }
}
const message = handlersLinkDelimiter === ',' ? `INVALID DELIMITER. Please use a different character as a delimiter in the event handler columns.` : `Finished editing ${count} out of ${eventDetectorsArray.length} event detectors with ${failed} errors`
console.log(message);

/**

 -- Example to create the CSV file from MySQL SQL query:

 SELECT DISTINCT eD.id as eventDetectorId,
    eD.xid as eventDetectorXid,
    eD.typeName as detectorType,
    '' as newDetectorName,
    '' as newAlarmLevel,
    '' as newLimit,
    '' as newResetLimit,
    '' as newUseResetLimit,
    '' as newLowRangeLimit,
    '' as newHighRangeLimit,
    '' as newWithinRange,
    '' as newStateValues,
    '' as newStateInverted,
    '' as newDuration,
    '' as newDurationType,
    '' as handlers_to_link,
    '' as handlers_to_remove,
    REPLACE(REPLACE(REPLACE(REPLACE(dP.dataTypeId, '1','BINARY'),
        '2', 'MULTISTATE'), '3','NUMERIC'), '4','ALPHANUMERIC') as dataPointType,
    eD.data->>'$.name' as existingName,
    eD.data->>'$.alarmLevel' as existingAlarmLevel,
    eD.data->>'$.limit' as existingLimit,
    eD.data->>'$.resetLimit' as existingResetLimit,
    eD.data->>'$.high' as existingHigh,
    eD.data->>'$.low' as existingLow,
    eD.data->>'$.withinRange' as existingWithinRange,
    eD.data->>'$.duration' as existingDuration,
    REPLACE(REPLACE(REPLACE(REPLACE(eD.data->>'$.durationType','SECONDS',1),'MINUTES',2),'HOURS',3),'DAYS',4) as existingDurationType,
    CASE
        WHEN eD.data->>'$.states' = 'null' THEN eD.data->>'$.state'
        ELSE REPLACE(REPLACE(REPLACE(eD.data->>'$.states', '[', ''), ']', ''), ',', ';')
    END as existingStateValues,
    eD.data->>'$.inverted' as existingStateInverted,
    dP.name as dataPointName,
    eD.data->>'$.sourceType' as detectorSourceType,
    dP.id as dataPointId,
    dP.xid as dataPointXid,
    dS.id as dataSourceId,
    dS.xid as dataSourceXid,
    dS.name as dataSourceName,
    dS.dataSourceType
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
 AND
    (
        eD.data->>'$.alarmLevel' IN ('NONE', 'INFORMATION', 'IMPORTANT', 'WARNING', 'URGENT', 'CRITICAL', 'LIFE_SAFETY', 'DO_NOT_LOG', 'IGNORE')
    );

 -- Example SQL query to create the CSV file for MariaDB:

 SELECT DISTINCT eD.id as eventDetectorId,
    eD.xid as eventDetectorXid,
    eD.typeName as detectorType,
    '' as newDetectorName,
    '' as newAlarmLevel,
    '' as newLimit,
    '' as newResetLimit,
    '' as newUseResetLimit,
    '' as newLowRangeLimit,
    '' as newHighRangeLimit,
    '' as newWithinRange,
    '' as newStateValues,
    '' as newStateInverted,
    '' as newDuration,
    '' as newDurationType,
    '' as handlers_to_link,
    '' as handlers_to_remove,
    REPLACE(REPLACE(REPLACE(REPLACE(dP.dataTypeId,'1', 'BINARY'),
        '2', 'MULTISTATE'),'3', 'NUMERIC'),'4', 'ALPHANUMERIC') as dataPointType,
    JSON_UNQUOTE(JSON_EXTRACT(eD.data, '$.name')) as existingName,
    JSON_UNQUOTE(JSON_EXTRACT(eD.data, '$.alarmLevel')) as existingAlarmLevel,
    JSON_UNQUOTE(JSON_EXTRACT(eD.data, '$.limit')) as existingLimit,
    JSON_UNQUOTE(JSON_EXTRACT(eD.data, '$.resetLimit')) as existingResetLimit,
    JSON_UNQUOTE(JSON_EXTRACT(eD.data, '$.high')) as existingHigh,
    JSON_UNQUOTE(JSON_EXTRACT(eD.data, '$.low')) as existingLow,
    JSON_UNQUOTE(JSON_EXTRACT(eD.data, '$.withinRange')) as existingWithinRange,
    JSON_UNQUOTE(JSON_EXTRACT(eD.data, '$.duration')) as existingDuration,
    REPLACE(REPLACE(REPLACE(REPLACE(JSON_UNQUOTE(JSON_EXTRACT(eD.data, '$.durationType')),'SECONDS',1),'MINUTES',2),'HOURS',3),'DAYS',4) as existingDurationType,
    CASE
        WHEN (JSON_EXTRACT(eD.data, '$.states') is null or JSON_EXTRACT(eD.data, '$.states') = 'null')
            THEN JSON_EXTRACT(eD.data, '$.state')
        ELSE REPLACE(REPLACE(REPLACE(JSON_UNQUOTE(JSON_EXTRACT(eD.data, '$.states')), '[', ''), ']', ''), ',', ';')
    END as existingStateValues,
    JSON_UNQUOTE(JSON_EXTRACT(eD.data, '$.inverted')) as existingStateInverted,
    dP.name as dataPointName,
    JSON_UNQUOTE(JSON_EXTRACT(eD.data, '$.sourceType')) as detectorSourceType,
    dP.id as dataPointId,
    dP.xid as dataPointXid,
    dS.id as dataSourceId,
    dS.xid as dataSourceXid,
    dS.name as dataSourceName,
    dS.dataSourceType
 FROM eventDetectors eD
 INNER JOIN dataPoints dP ON eD.dataPointId = dP.id
 INNER JOIN dataSources dS ON dP.dataSourceId = dS.id
 WHERE
    (
        JSON_UNQUOTE(JSON_EXTRACT(eD.data, '$.sourceType')) IN ('DATA_POINT')
    )
 AND
    (
        dS.id IN (11)
        OR
        dS.xid IN ('DS_df8c0162-9bce-4980-9160-7791d5d558aa')
    )
 AND
    (
        eD.typeName IN ('MULTISTATE_STATE')
    )
 AND
    (
        dP.name LIKE '%Voltage%'
    )
 AND
    (
        JSON_UNQUOTE(JSON_EXTRACT(eD.data, '$.name')) LIKE 'Output%'
        OR
        JSON_UNQUOTE(JSON_EXTRACT(eD.data, '$.name')) LIKE '%Low'
    )
 AND
    (
        dp.JSON_UNQUOTE(JSON_EXTRACT(eD.data, '$.alarmLevel')) IN ('NONE', 'INFORMATION', 'IMPORTANT', 'WARNING', 'URGENT', 'CRITICAL', 'LIFE_SAFETY', 'DO_NOT_LOG', 'IGNORE')
    );

 -- Example SQL query to create the CSV file for H2DB:

 SELECT DISTINCT eD.id as eventDetectorId,
    eD.xid as eventDetectorXid,
    eD.typeName as detectorType,
    '' as newDetectorName,
    '' as newAlarmLevel,
    '' as newLimit,
    '' as newResetLimit,
    '' as newUseResetLimit,
    '' as newLowRangeLimit,
    '' as newHighRangeLimit,
    '' as newWithinRange,
    '' as newStateValues,
    '' as newStateInverted,
    '' as newDuration,
    '' as newDurationType,
    '' as handlers_to_link,
    '' as handlers_to_remove,
    REPLACE(REPLACE(REPLACE(REPLACE(dP.dataTypeId,'1', 'BINARY'),
        '2', 'MULTISTATE'),'3', 'NUMERIC'),'4', 'ALPHANUMERIC') as dataPointType,
    REPLACE(
        REPLACE(
            REGEXP_SUBSTR(eD.data,'"name"(\s*?:{1}\s*?)"(.*?)"'),
                '"name":"', ''),
                    '"', '') AS existingName,
    REPLACE(
        REPLACE(
            REGEXP_SUBSTR(eD.data,'"alarmLevel"(\s*?:{1}\s*?)"(.*?)"'),
                '"alarmLevel":"', ''),
                    '"', '') AS existingAlarmLevel,
    REPLACE(
        REPLACE(
            REGEXP_SUBSTR(eD.data,'"limit"(\s*?:{1}\s*?)"(.*?)"'),
                '"limit":"', ''),
                    '"', '') AS existingLimit,
    REPLACE(
        REPLACE(
            REGEXP_SUBSTR(eD.data,'"resetLimit"(\s*?:{1}\s*?)(.*?),'),
                '"resetLimit":', ''),
                    ',', '') AS existingResetLimit,
    REPLACE(
        REPLACE(
            REGEXP_SUBSTR(eD.data,'"high"(\s*?:{1}\s*?)(.*?),'),
                '"high":', ''),
                    ',', '') AS existingHigh,
    REPLACE(
        REPLACE(
            REGEXP_SUBSTR(eD.data,'"low"(\s*?:{1}\s*?)(.*?),'),
                '"low":', ''),
                    ',', '') AS existingLow,
    REPLACE(
        REPLACE(
            REGEXP_SUBSTR(eD.data,'"withinRange"(\s*?:{1}\s*?)(.*?),'),
                '"withinRange":', ''),
                    ',', '') AS existingWithinRange,
    REPLACE(
        REPLACE(
            REGEXP_SUBSTR(eD.data,'"duration"(\s*?:{1}\s*?)(.*?),'),
                '"duration":', ''),
                    ',', '') AS existingDuration,
    CASEWHEN(
        REPLACE(
            REPLACE(
                REGEXP_SUBSTR(eD.data,'"states"(\s*?:{1}\s*?)(.*?),'),
                    '"states":', ''),
                        ',', '') = 'null',
        REPLACE(
            REPLACE(
                REGEXP_SUBSTR(eD.data,'"state"(\s*?:{1}\s*?)(.*?),'),
                    '"state":', ''),
                        ',', ''),
        REPLACE(
            REPLACE(
                REPLACE(
                    REGEXP_SUBSTR(eD.data,'"states"(\s*?:{1}\s*?)(.*?)]'),
                        '"states":[', ''),
                            ']', ''),
                                ',', ';')
    ) as existingStateValues,
    REPLACE(
        REPLACE(
            REGEXP_SUBSTR(eD.data,'"inverted"(\s*?:{1}\s*?)(.*?),'),
                '"inverted":', ''),
                    ',', '') AS existingStateInverted,
    dP.name as dataPointName,
    REPLACE(
        REPLACE(
            REGEXP_SUBSTR(eD.data,'"sourceType"(\s*?:"{1}\s*?)(.*?)"'),
                '"sourceType":"', ''),
                    '"', '') AS detectorSourceType,
    dP.id as dataPointId,
    dP.xid as dataPointXid,
    dS.id as dataSourceId,
    dS.xid as dataSourceXid,
    dS.name as dataSourceName,
    dS.dataSourceType
    FROM eventDetectors eD
 INNER JOIN dataPoints dP ON eD.dataPointId = dP.id
 INNER JOIN dataSources dS ON dP.dataSourceId = dS.id
 WHERE
    (
        REPLACE(
            REPLACE(
                REGEXP_SUBSTR(eD.data,'"sourceType"(\s*?:"{1}\s*?)(.*?)"'),
                    '"sourceType":"', ''),
                        '"', '') IN ('DATA_POINT')
    )
 AND
    (
        dS.id IN (11)
        OR
        dS.xid IN ('DS_df8c0162-9bce-4980-9160-7791d5d558aa')
    )
 AND
    (
        eD.typeName IN ('MULTISTATE_STATE')
    )
 AND
    (
        dP.name LIKE '%Voltage%'
    )
 AND
    (
        REPLACE(
            REPLACE(
                REGEXP_SUBSTR(eD.data,'"name"(\s*?:"{1}\s*?)(.*?)"'),
                    '"name":"', ''),
                        '"', '') LIKE 'Output%'
        OR
        REPLACE(
            REPLACE(
                REGEXP_SUBSTR(eD.data,'"name"(\s*?:"{1}\s*?)(.*?)"'),
                    '"name":"', ''),
                        '"', '') LIKE '%Low'
    )
 AND
    (
        REPLACE(
            REPLACE(
                REGEXP_SUBSTR(eD.data,'"alarmLevel"(\s*?:"{1}\s*?)(.*?)"'),
                    '"alarmLevel":"', ''),
                        '"', '') IN ('NONE', 'INFORMATION',
                                    'IMPORTANT', 'WARNING', 'URGENT', 'CRITICAL',
                                    'LIFE_SAFETY', 'DO_NOT_LOG', 'IGNORE')
 );

 */
