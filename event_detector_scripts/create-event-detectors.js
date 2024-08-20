/**
 * Create a group of event detectors
 * Was tested MANGO 4.5.X and MANGO 5.0.X and MANGO 5.1.X
 * Last update May 2024
 * 
 * The create_event_detectors.js script requires a CSV file to be present in the filestore 
 *  named event-detectors-to-create.csv with the following structure: 
 * dataPointId,dataPointXid,detectorType,detectorName,alarmLevel,limit,stateValues,stateInverted,duration,duration_unit,handlers_to_link,dataPointName,dataPointType,any,other,column,can,be,present,but,will be,ignored
 * 
 * There's a sample MySQL query at the bottom of this script that can be used in the Mango SQL Console to generate a properly formatted CSV file.
 * 
 * This script will:
 *  1. Get and Validate headers in the CSV file
 *  2. Confirm the detectorType is correct
 *      LOW_LIMIT
 *      HIGH_LIMIT
 *      MULTISTATE_STATE
 *      BINARY_STATE
 *      NO_UPDATE
 *      UPDATE
 *      Fail on a mismatch
 *      Fail if some other type of detector that is not supported
 *  3. Create the new event detector
 *  4. Set the detectorType DetectorName, Limit, and/or AlarmLevel values as needed
 *  5. Link the detector to one or more event handler (by event handler XID)
 *  6. Insert the event detector. 
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
 *  ==== DURATION UNITS CONVENTIONS ====
 *  SECONDS = 1;
 *  MINUTES = 2;
 *  HOURS = 3;
 *  DAYS = 4;
 *  =================
 * 
 * 
 * User configurable variables:
 * 
 *  Set handlersLinkDelimiter to the delimiter used in handlers_to_link, when linking multiple event handlers.
 *   This cannot be a comma as this will break the CSV file format
 * 
 *  Verbose logging may impact the performance if the script is updating a large number of event detectors, disable
 *   it unless it is required.
 *   Set enableConsoleLog = true, to enable verbose logging
 *   Set enableConsoleLog = false, to disable verbose logging
 */
 
const enableConsoleLog = true;
const handlersLinkDelimiter = ';'

const fileName = 'event-detectors-to-create.csv';
const fileStorePath = 'default';

const RESERVED_EMPTY = "EMPTY";
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
    if (actual === expected) {
        return
    }
    else
    {
        if (actual.toUpperCase() === expected.toUpperCase()) {
            verbose(`WARNING: Exact case match failed for ${actual} and ${expected}. Tested with toUpperCase() and passed validation.`);
            return
        }
        else
        throw new Error(`${message}: ${actual} is NOT equal to ${expected}!`)
    }
}

function readCsv(fileStore, filePath) {
    const path = services.fileStoreService.getPathForRead(fileStore, filePath);
    const lines = Array.from(Files.readAllLines(path));
    const header = lines.shift().replace(/["']/g, '').replace(/\s+/g, "").split(',');

    //Validate headers 
    for (let index = 0; index < mainHeaders.length; index++) {
        compare(header[index], mainHeaders[index], `Fatal Error. Expected column header name ${mainHeaders[index]} mismatch`);
        //If this is an upper case match, we need to update the mainHeaders array
        if (header[index].toUpperCase() === mainHeaders[index].toUpperCase()) {
            header[index] = mainHeaders[index];
        }
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
        throw new Error(`Missing required value: ${name}. Validation failed.`);
    }
    else if (value == RESERVED_EMPTY) {
        throw new Error(`Missing required value: ${name}. Value set to ${RESERVED_EMPTY}. Validation failed.`);
    }
    return;
}

function isTypeSupported(type) {
    switch (type) {
        case "HIGH_LIMIT":
        case "LOW_LIMIT":
        case "MULTISTATE_STATE":
        case "BINARY_STATE":
        case "NO_UPDATE":
        case "UPDATE":
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

console.log(`Creating ${eventDetectorsArray.length} event detectors`);
let count = 0;
let failed = 0;

for (const eventDetectorCsv of eventDetectorsArray) {

    verbose('Begin detector...');

    let detector;
    let point;
    let isCreated = true;
    let insertED = true;

    /*
    * VALIDATION PATTERN
    * Perform the validation but do not set the value in the detector.
    * The value will be set in the detector after it is created.
    */

    //Validations
    try {
        assureNotEmpty('detectorName', eventDetectorCsv.detectorName);
        verbose(`VALIDATED: ${eventDetectorCsv.detectorName}`);
    } catch (e) {
        verbose(`MISSING DETECTOR NAME. Using default value.`);
        eventDetectorCsv.detectorName = '';
    }

    try {
        assureNotEmpty('detectorType', eventDetectorCsv.detectorType);
        isTypeSupported(eventDetectorCsv.detectorType);
        verbose(`VALIDATED: ${eventDetectorCsv.detectorType}`);
    } catch (e) {
        log.error('Will not create new Event Detector. Failed validation: {}', e.message);
        verbose(`Failed validation: ${e.message}`);
        failed++;
        insertED = false;
        continue;
    }
    
    try {
        assureNotEmpty('dataPointType', eventDetectorCsv.dataPointType);
        verbose(`VALIDATED: ${eventDetectorCsv.dataPointType}`);
    } catch (e) {
        log.error('Will not create new Event Detector. Failed validation: {}', e.message);
        verbose(`Failed validation: ${e.message}`);
        failed++;
        insertED = false;
        continue;
    }

    let validAlarmLevel;
    try {
        assureNotEmpty('alarmLevel', eventDetectorCsv.alarmLevel);
        validAlarmLevel = AlarmLevels.fromName(eventDetectorCsv.alarmLevel);
        verbose(`Alarm level validation: ${validAlarmLevel}`);
    } catch (e) {
        log.error('AlarmLevel validation failed Reason:{}', e);
        verbose(`AlarmLevel validation failed Reason: ${e}`);
        insertED = false;
        failed++;
        continue;
    }

    //Validate duration & durationType
    let duration = 0; //Default value;
    let durationType = 1; //Default Value

    if (!['', RESERVED_EMPTY].includes(eventDetectorCsv.duration)) {
        try {
            if (Number.isNaN(Number.parseInt(eventDetectorCsv.duration))) {
                throw new Error(`duration ${eventDetectorCsv.duration}: Not Supported!`)
            }
            else{
                duration = Number.parseInt(eventDetectorCsv.duration);
                verbose(`Setting Duration value: ${duration}`);
            }
        } catch (typeError) {
            log.error('Duration is:{}', typeError);
            verbose(`Duration failed Reason: ${typeError}`);
            insertED = false;
            failed++;
            continue;
        }
    }
    else
    {
        verbose(`Using default Duration value: ${duration}`);
    }
        

    if (!['', RESERVED_EMPTY].includes(eventDetectorCsv.durationType)) {
        try {
            if (![1, 2, 3, 4].includes(Number.parseInt(eventDetectorCsv.durationType))) {
                verbose(`Found ${eventDetectorCsv.durationType}`);
                //Check if the durationType is one of the expected string variants
                switch(eventDetectorCsv.durationType){
                    case 'SECONDS':
                        durationType = 1;
                        break;
                    case 'MINUTES':
                        durationType = 2;
                        break;
                    case 'HOURS':
                        durationType = 3;
                        break;
                    case 'DAYS':
                        durationType = 4;
                        break;
                    default:
                        throw new Error(`Duration type ${eventDetectorCsv.durationType}: Not Supported. Expected 1, 2, 3, 4, SECONDS, MINUTES, HOURS, or DAYS.`)
                }
            }
            else
            {
                durationType = Number.parseInt(eventDetectorCsv.durationType);
                verbose(`Setting Duration Type value: ${durationType}`);
            }
        } catch (typeError) {
            log.error(`Duration unit found:${eventDetectorCsv.durationType}: ${typeError}`);
            verbose(`Duration Unit is:${eventDetectorCsv.durationType}`);
            verbose(`Error: ${typeError}`);
            insertED = false;
            failed++;
            continue;
        }
    }
    else
    {
        verbose(`Using default Duration Type value: ${durationType}`);
    }

    
    //Determine if state values have been provided
    let hasStateValues = false;
    try {
        assureNotEmpty('stateValues', eventDetectorCsv.stateValues);
        hasStateValues = true;
    } catch (e) {
        hasStateValues = false;
    }

    //Validate MULTISTATE_STATE detectors
    if (eventDetectorCsv.detectorType === 'MULTISTATE_STATE') {
        if (eventDetectorCsv.dataPointType === 'MULTISTATE') {
            if (!hasStateValues) {
                log.error(`Event detector ${eventDetectorCsv.detectorName} -> Empty state values for MULTISTATE_STATE detector.`);
                verbose(`Event detector ${eventDetectorCsv.detectorName} -> Empty state values for MULTISTATE_STATE detector.`);
                failed++;
                insertED = false;
                continue;
            }
        }
        else
        {
            //You can't have a MULTISTATE_STATE detector with data point type that is not MULTISTATE
            log.error(`Event detector ${eventDetectorCsv.detectorName} -> Unexpected data point type: ${eventDetectorCsv.dataPointType} for MULTISTATE_STATE detector.`);
            verbose(`Event detector ${eventDetectorCsv.detectorName} -> Unexpected data point type: ${eventDetectorCsv.dataPointType} for MULTISTATE_STATE detector.`);
            failed++;
            insertED = false;
            continue;
        }
    }
    
    //Validate BINARY_STATE detectors
    if (eventDetectorCsv.detectorType === 'BINARY_STATE') {
        if (eventDetectorCsv.dataPointType === 'BINARY') {
            if (!hasStateValues) {
                log.error(`Event detector ${eventDetectorCsv.detectorName} -> Empty state value for BINARY_STATE detector.`);
                verbose(`Event detector ${eventDetectorCsv.detectorName} -> Empty state value for BINARY_STATE detector.`);
                failed++;
                insertED = false;
                continue;
            }
        }
        else
        {
            //You can't have a BINARY_STATE detector with data point type that is not BINARY
            log.error(`Event detector ${eventDetectorCsv.detectorName} -> Unexpected data point type: ${eventDetectorCsv.dataPointType} for BINARY_STATE detector.`);
            verbose(`Event detector ${eventDetectorCsv.detectorName} -> Unexpected data point type: ${eventDetectorCsv.dataPointType} for BINARY_STATE detector.`);
            failed++;
            insertED = false;
            continue;
        }
    }

    //Validate NO_UPDATE detectors
    if (eventDetectorCsv.detectorType === 'NO_UPDATE') {
        //Nothing to validate for this
    }

    //Validate UPDATE detectors
    if (eventDetectorCsv.detectorType === 'UPDATE') {
        //UPDATE detectors do not support duration.
        //If the duration is something other than 0, raise a warning
        if (duration != 0) {
            log.warn(`Duration is set for an UPDATE detector, which is not allowed. Duration will be ignored.`);
            verbose(`Duration is set for an UPDATE detector, which is not allowed. Duration will be ignored.`);
        }

    }


    let hasLimitValue = false;
    //Check if this will be a LIMIT detector
    if (['HIGH_LIMIT', 'LOW_LIMIT'].includes(eventDetectorCsv.detectorType)) {
        //Do not allow MULTISTATE or BINARY points to use LIMIT detectors
        if (['MULTISTATE', 'BINARY'].includes(eventDetectorCsv.dataPointType)) {
            //This type of point cannot use this type of detector
            log.error(`Detector Type ${eventDetectorCsv.detectorType} not supported for Point Type ${eventDetectorCsv.dataPointType} on Point XID ${eventDetectorCsv.dataPointXid}.`);
            verbose(`Detector Type ${eventDetectorCsv.detectorType} not supported for Point Type ${eventDetectorCsv.dataPointType} on Point XID ${eventDetectorCsv.dataPointXid}.`);
            insertED = false;
            failed++;
            continue;
        }
        else
        {
            //Determine if a limit value has been provided
            try {
                assureNotEmpty('limit', eventDetectorCsv.limit);
                if (Number.isNaN(Number.parseFloat(eventDetectorCsv.limit))) {
                    throw new Error(`limit ${eventDetectorCsv.limit}: Not Supported!`)
                }
                else
                {
                    hasLimitValue = true;
                }
            } catch (e) {
                log.error('Limit is:{}', e);
                verbose(`Limit failed with reason: ${e}`);
                insertED = false;
                failed++;
                continue;
            }
        }
    }

    // Validate if handlers_to_link has xids events handler
    let eventHandlers = [];
    try{
        assureNotEmpty('handlers_to_link', eventDetectorCsv.handlers_to_link);
        const handlersLink = eventDetectorCsv.handlers_to_link.split(handlersLinkDelimiter);
        for (const xid of Array.from(handlersLink)) {
            try {
                eventHandlerService.get(xid)
                eventHandlers.push(xid)
            } catch (e) {
                log.error('Failed linking the Event Handler. Event Handler with XID {} NOT FOUND!', xid);
                verbose(`Failed linking the Event Handler. Event Handler with XID ${xid} NOT FOUND!`);
                continue;
            }
        }
    } catch (emptyCell) {
        //If there are no handlers_to_link, this is not an error
    }


    if (insertED) {
        const eventDetectorXid = Common.generateXid("ED_");
        try {
            verbose(`Getting point...`);
            point = dataPointService.get(eventDetectorCsv.dataPointXid);
            verbose(`Point found...`);
            const definition = ModuleRegistry.getEventDetectorDefinition(eventDetectorCsv.detectorType);
            verbose(`Defining detector...`);
            detector = definition.baseCreateEventDetectorVO(point);
            
             //Setting custom resetDuration values via script is not supported at this time
             //Leaving resetDuration = null will result in the resetDuration = duration in Mango 5.1+
             if (eventDetectorCsv.detectorType != 'UPDATE') {
                //Force resetDuration = 0 SECONDS
                //These methods only exist in Mango 5.1+
                if (detector.setResetDuration) {
                    detector.setResetDuration(0);
                }
                if (detector.setResetDurationType) {
                    detector.setResetDurationType(1);
                }
             }

            verbose(`Detector created...`);

            detector.setXid(eventDetectorXid);

            verbose(`Detector XID assigned: ${detector.xid}`);
        } catch (e) {
            log.error('Failed creating the event detector: {}', e);
            verbose(`Failed creating the event detector: ${e}`);
            failed++;
            isCreated = false;
            continue;
        }
        
        if (isCreated) {
            //set name
            detector.setName(eventDetectorCsv.detectorName);
    
            verbose(`Detector Name: ${detector.getName()}`);
    
            //set AlarmLevel
            detector.setAlarmLevel(validAlarmLevel);
            verbose(`Detector AlarmLevel: ${detector.getAlarmLevel()}`);
            
            //set Duration settings
            if (eventDetectorCsv.detectorType != 'UPDATE') {
                verbose(`Applying duration settings ${duration} ${durationType}...`);
                detector.setDuration(Number.parseInt(duration));
                detector.setDurationType(Number.parseInt(durationType));
            }

            //set state values
            if (hasStateValues && eventDetectorCsv.detectorType === 'MULTISTATE_STATE') {
                //set MultiState value
                const stateValues = Array.from(eventDetectorCsv.stateValues.split(handlersLinkDelimiter)).map(function (value) {
                    return Number(value);
                });
                detector.setState(Number.parseInt([stateValues], 10));
                detector.setInverted(eventDetectorCsv.stateInverted.toLowerCase() === 'true');
                detector.setStates(stateValues.length === 1 ? null : stateValues);
            }

            if (hasStateValues && eventDetectorCsv.detectorType === 'BINARY_STATE') {
                //set Binary value
                detector.setState(eventDetectorCsv.stateValues.toLowerCase() === 'true' || eventDetectorCsv.stateValues === '1')
            }
            
            if (hasLimitValue && ['HIGH_LIMIT', 'LOW_LIMIT'].includes(eventDetectorCsv.detectorType)) {
                //set limit
                detector.setLimit(Number.parseFloat(eventDetectorCsv.limit));
                verbose(`Detector new limit: ${detector.getLimit()}`);
            }

            //set event handlers
            if (eventHandlers.length) {
                detector.setEventHandlerXids(eventHandlers);
            }
    
            const validateMsg = eventDetectorsService.validate(detector).getMessages();
            if (validateMsg && validateMsg.length != 0) {
                log.error('Validation failed for xid {} Reason:{}', eventDetectorXid, validateMsg);
                verbose(`Validation failed for xid ${eventDetectorXid} Reason: ${validateMsg}`);
                insertED = false;
                failed++;
                continue;
            }
    
            try {
                eventDetectorsService.insert(detector);
                count++;
            } catch (e) {
                verbose(`Error ${eventDetectorXid}:${e}`);
                log.error('Error saving {}: {}', eventDetectorXid, e.message);
                failed++;
                continue;
            }
    
            //Reload the data point so it picks up its new event detectors
            //This is not required as of Mango 5.1, and this method no longer
            //exists within the dataPointService
            if (dataPointService.reloadDataPoint) {
                verbose(`Reloading datapoint with ID: ${point.getId()}`);
                dataPointService.reloadDataPoint(point.getId());
            }

            if (count % 10 == 0) {
                verbose(`Created ${count} event detectors out of ${eventDetectorsArray.length}`);
            }
        }
    }
}

const message = handlersLinkDelimiter === ',' ? `INVALID DELIMITER. Please use a different character as a delimiter in the event handler columns.` : `Finished creating ${count} out of ${eventDetectorsArray.length} event detectors with ${failed} errors`
console.log(message);

/*

 -- The following SQL query is suggested to create the CSV file for Mysql and MariaDB

 SELECT DISTINCT dP.id as dataPointId,
    dP.xid as dataPointXid,
    '' as detectorType, 
    '' as detectorName, 
    '' as alarmLevel, 
    '' as `limit`,  
    '' as stateValues, 
    '' as stateInverted,
    0 as duration,
    'SECONDS' as durationType,
    '' as handlers_to_link,
    dP.name as dataPointName,
    REPLACE(REPLACE(REPLACE(REPLACE(dP.dataTypeId, '1', 'BINARY'),
        '2', 'MULTISTATE'), '3', 'NUMERIC'), '4','ALPHANUMERIC') as dataPointType,
    dS.id as dataSourceId,
    dS.xid as dataSourceXid,
    dS.name as dataSourceName,
    dS.dataSourceType
 FROM dataPoints dP
 INNER JOIN dataSources dS ON dP.dataSourceId = dS.id
 WHERE
    (
        dS.xid IN ('DS_b3dfc7fa-416e-4650-b8de-b521ce288275')
    )
 AND
    (
        dP.name LIKE 'onOffAlarmPoint%'
    )
 AND
    (
        dp.JSON_UNQUOTE(JSON_EXTRACT(eD.data, '$.alarmLevel')) IN ('NONE', 'INFORMATION', 'IMPORTANT', 'WARNING', 'URGENT', 'CRITICAL', 'LIFE_SAFETY', 'DO_NOT_LOG', 'IGNORE')
    );


 -- Another example also for Mysql and MariaDB

 SELECT DISTINCT dP.id as dataPointId,
    dP.xid as dataPointXid,
	'' as detectorType,
	'' as detectorName,
	'' as alarmLevel,
	'' as `limit`,
	'' as stateValues,
	'' as stateInverted,
	0 as duration,
    'SECONDS' as durationType,
	'' as handlers_to_link,
	dP.name as dataPointName,
	REPLACE(REPLACE(REPLACE(REPLACE(dP.dataTypeId, '1', 'BINARY'),
	    '2', 'MULTISTATE'), '3', 'NUMERIC'),'4', 'ALPHANUMERIC') as dataPointType,
	dS.id as dataSourceId,
	dS.xid as dataSourceXid,
	dS.name as dataSourceName,
	dS.dataSourceType
 FROM  dataPoints dP
 INNER JOIN dataSources dS ON dP.dataSourceId = dS.id
 WHERE
      (
          dS.xid IN ('DS_df8c0162-9bce-4980-9160-7791d5d558aa')
      )
 AND
      (
          dP.name LIKE '%Voltage%'
      )
 AND
      (
          dp.JSON_UNQUOTE(JSON_EXTRACT(eD.data, '$.alarmLevel')) IN ('NONE', 'INFORMATION', 'IMPORTANT', 'WARNING', 'URGENT', 'CRITICAL', 'LIFE_SAFETY', 'DO_NOT_LOG', 'IGNORE')
      );


 -- Example SQL query to create the CSV file for H2DB

 SELECT DISTINCT dP.id as dataPointId,
    dP.xid as dataPointXid,
    '' as detectorType,
    '' as detectorName,
    '' as alarmLevel,
    '' as `limit`,
    '' as stateValues,
    '' as stateInverted,
    0 as duration,
    'SECONDS' as durationType,
    '' as handlers_to_link,
    dP.name as dataPointName,
    REPLACE(REPLACE(REPLACE(REPLACE(dP.dataTypeId, '1', 'BINARY'),
        '2', 'MULTISTATE'), '3', 'NUMERIC'),'4', 'ALPHANUMERIC') as dataPointType,
    dS.id as dataSourceId,
    dS.xid as dataSourceXid,
    dS.name as dataSourceName,
    dS.dataSourceType
 FROM  dataPoints dP
 INNER JOIN dataSources dS ON dP.dataSourceId = dS.id
 WHERE
    (
        dS.xid IN ('DS_df8c0162-9bce-4980-9160-7791d5d558aa')
    )
 AND
    (
        dP.name LIKE '%Voltage%'
    )
 AND
    (
        REPLACE(
            REPLACE(
                REGEXP_SUBSTR(dP.name,'"alarmLevel"(\s*?:"{1}\s*?)(.*?)"'),
                    '"alarmLevel":"', ''),
                        '"', '') IN ('NONE', 'INFORMATION', 'IMPORTANT',
                                    'WARNING', 'URGENT', 'CRITICAL',
                                    'LIFE_SAFETY', 'DO_NOT_LOG', 'IGNORE')
    );

*/
