/**
 * Create a group of event detectors
 * Was tested MANGO 4.5.X
 * Last update September-2023
 * The create_event_detectors.js script requires a CSV file to be present in the filestore 
 * named event-detectors-to-create.csv with the following structure: 
 * "dataPointId", "dataPointXid", "detectorType", "detectorName", "alarmLevel", "limit", "stateValues", "stateInverted", "duration","duration_unit","handlers_to_link", "dataPointName", "dataPointType", any, other, column, can, be, present, but, will, be, ignored
 * 
 * This script will:
 *  1. Get and Validate headers
 *  2. Confirm the detectorType is correct
 *      LOW_LIMIT
 *      HIGH_LIMIT
 *      MULTISTATE_STATE
 *      BINARY_STATE
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
 *  Set enableConsoleLog = true, to enable verbose logging
 *  Set enableConsoleLog = false, to disable verbose logging
 * 
 *  ==== DURATION TYPE CONVENTIONS ====
 *  SECONDS = 1;
     MINUTES = 2;
     HOURS = 3;
     DAYS = 4;
 *  =================
 *  Set handlersLinkDelimiter = ';'...'*', to the delimiter handlers_to_link or handlers_to_remove. It cannot be a comma as this will break the CSV file format
 *  Verbose logging may impact the performance if the script is updating a large number of event detectors
 */
const enableConsoleLog = true;
const handlersLinkDelimiter = ';'


const fileName = 'event-detectors-to-create.csv';
const fileStorePath = 'default';

const Files = Java.type('java.nio.file.Files');
const Common = Java.type('com.serotonin.m2m2.Common');
const ModuleRegistry = Java.type('com.serotonin.m2m2.module.ModuleRegistry');
const AlarmLevels = Java.type('com.serotonin.m2m2.rt.event.AlarmLevels');
const dataPointService = services.dataPointService;
const eventHandlerService = services.eventHandlerService;
const EventHandlerDao = Java.type('com.serotonin.m2m2.db.dao.EventHandlerDao');
const ArrayList = Java.type('java.util.ArrayList');



const mainHeaders = [];
mainHeaders.push("dataPointId", "dataPointXid", "detectorType", "detectorName", "alarmLevel", "limit", "stateValues", "stateInverted", "duration", "durationType", "handlers_to_link", "dataPointName", "dataPointType");

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
        //verbose(`VALIDATED: ${eventDetectorCsv.detectorType}`);
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
    //Validate duration 
    if (!['', 'EMPTY'].includes(eventDetectorCsv.duration)) {
        try {
            if (Number.isNaN(Number.parseInt(eventDetectorCsv.duration))) {
                throw new Error(`duration ${eventDetectorCsv.duration}: Not Supported!`)
            }
        } catch (typeError) {
            log.error('Duration is:{}', typeError);
            verbose(`Duration failed Reason: ${typeError}`);
            insertED = false;
            failed++;
            continue;
        }
    }
    if (!['', 'EMPTY'].includes(eventDetectorCsv.durationType)) {
        try {
            if (![1, 2, 3, 4].includes(Number.parseInt(eventDetectorCsv.durationType))) {
                if (type) throw new Error(`duration unit ${type}: Not Supported!`)
            }

        } catch (typeError) {
            log.error(`Duration Unit is:${eventDetectorCsv.durationType}`, typeError);
            verbose(`Duration unit is:${eventDetectorCsv.durationType} failed Reason: ${typeError}`);
            insertED = false;
            failed++;
            continue;
        }
    }

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
    let isCreated = true
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

    // Validate if handlers_to_link has xids events handler
    let eventHandlers = [];
    if (eventDetectorCsv.handlers_to_link !== "EMPTY") {
        const handlersLink = eventDetectorCsv.handlers_to_link.split(handlersLinkDelimiter);
        for (const xid of Array.from(handlersLink)) {
            try {
                eventHandlerService.get(xid)
                eventHandlers.push(xid)
            } catch (e) {
                log.error('Failed editing the event handler with XId {} NOT FOUND!', xid);
                verbose(`Failed editing the event handler with XId ${xid} NOT FOUND!`);

                continue;
            }
        }
        isCreated = eventHandlers.length;
    }

    // Validate MultiState type and Binary
    if (eventDetectorCsv.dataPointType === 'MULTISTATE' || eventDetectorCsv.dataPointType === 'BINARY') {
        if (!eventDetectorCsv.stateValues) {
            log.error(`Event detector ${eventDetectorCsv.detectorName} -> Empty state values ${eventDetectorCsv.dataPointType}`);
            verbose(`Event detector ${eventDetectorCsv.detectorName} -> Empty state values ${eventDetectorCsv.dataPointType}`);
            failed++;
            isCreated = false;
            continue;
        }
        else {
            if (eventDetectorCsv.dataPointType === 'MULTISTATE') {
                //Set MultiState value
                const stateValues = Array.from(eventDetectorCsv.stateValues.split(handlersLinkDelimiter)).map(function (value) {
                    return Number(value);
                });
                detector.setState(Number.parseInt([stateValues], 10));
                detector.setInverted(eventDetectorCsv.stateInverted.toLowerCase() === 'true');
                detector.setStates(stateValues.length === 1 ? null : stateValues);

            } else if (eventDetectorCsv.dataPointType === 'BINARY') {
                //Set Binary value
                detector.setState(eventDetectorCsv.stateValues.toLowerCase() === 'true' || eventDetectorCsv.stateValues === '1')
            } else {
                log.error(`Event detector ${eventDetectorCsv.detectorName} -> Event detector type ${eventDetectorCsv.type} Not Supported for this dataPointType!`);
                verbose(`Event detector ${eventDetectorCsv.detectorName} -> Event detector type ${eventDetectorCsv.type} Not Supported for this dataPointType!`);
                failed++;
                isCreated = false;
                continue;
            }
        }
    }

    if (isCreated) {
        //set name
        detector.setName(eventDetectorCsv.detectorName);

        //Set duration and duration unit
        let duration = 0; //Default value;
        let durationType = 1; //Default Value
        if (!['', 'EMPTY'].includes(eventDetectorCsv.duration) || (!['', 'EMPTY'].includes(eventDetectorCsv.durationType))) {
            duration = Number.parseInt(eventDetectorCsv.duration)//Number.parseInt(eventDetectorCsv.duration);
            durationType = Number.parseInt(eventDetectorCsv.durationType)//Number.parseInt(eventDetectorCsv.durationType);
        }
        detector.setDuration(duration);
        detector.setDurationType(durationType)

        verbose(`Detector Name: ${detector.getName()}`);
        if (!['MULTISTATE', 'BINARY'].includes(eventDetectorCsv.dataPointType)) {
            //set limit
            console.log(eventDetectorCsv.dataPointType)

            detector.setLimit(Number.parseFloat(eventDetectorCsv.limit));
            verbose(`Detector new limit: ${detector.getLimit()}`);
        }
        //set AlarmLevel
        detector.setAlarmLevel(validAlarmLevel);
        verbose(`Detector AlarmLevel: ${detector.getAlarmLevel()}`);

        //set event handlers
        if (eventHandlers.length) {
            detector.setEventHandlerXids(eventHandlers);
        }

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
}
const message = handlersLinkDelimiter === ',' ? `INVALID DELIMITER. Please use a different character as a delimiter in the event handler columns.` : `Finished editing ${count} out of ${eventDetectorsArray.length} event detectors with ${failed} errors`
console.log(message);
/*
SELECT DISTINCT dP.id as dataPointId, dP.xid as dataPointXid, 
    '' as detectorType, 
    '' as detectorName, 
    '' as alarmLevel, 
    '' as `limit`,  
    '' as stateValues, 
    '' as stateInverted,
    '' as duration,
    '' as durationType,
    '' as handlers_to_link, dP.name as dataPointName,
    REPLACE(REPLACE(REPLACE(REPLACE(dP.dataTypeId, '1', 'BINARY'),
       '2', 'MULTISTATE'), '3', 'NUMERIC'), '4',
       'ALPHANUMERIC') as dataPointType,
    dS.id as dataSourceId, dS.xid as dataSourceXid,
    dS.name as dataSourceName, dS.dataSourceType
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