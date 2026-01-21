/*  This script checks if the number of events, by type, in the RECENT_PERIOD_HOURS exceeds the AVERAGE_EVENTS_PER_PERIOD,
    by more than the TYPE_THRESHOLD_PERCENT percentage. If the threshold is exceeded, an alarm data point value for this event type
    will be set to 1. If the threshold is not exceeded, the alarm data point value will be set to 0.
	
	The following parameters are configurable:
    • RECENT_PERIOD_HOURS: initially 24 hours
    • RANGE_PERIOD_MULTIPLE: initially 10
    • TYPE_THRESHOLD_PERCENT: initially 150%
    • DP_XIDS: Alarm data point XIDs for each event type
*/

const RECENT_PERIOD_HOURS = 24;
const RANGE_PERIOD_MULTIPLE = 10;
const TYPE_THRESHOLD_PERCENT = 150;
const EVENT_TYPES = ["DATA_POINT", "DATA_SOURCE", "SYSTEM"];
/*
    These data points represent alarm data points created in Mango that can raise an alarm when the event count threshold
    is exceeded. These XIDs are not fixed and can be changed to match the XIDs in your Mango installation.
    
    The number of XIDs must match the number of EVENT_TYPES defined in the array above, and the XIDs below will be matched
    to the EVENT_TYPES above in the same order they appear in the array below. The alarm data points can be Binary,
    Multistate, or Numeric points.
*/
const DP_XIDS = ["DP_DATA_POINT_EVENT_THRESHOLD_ALARM", "DP_DATA_SOURCE_EVENT_THRESHOLD_ALARM", "DP_SYSTEM_EVENT_THRESHOLD_ALARM"];

// Services
const dataPointService = services.dataPointService;
const dataSourceService = services.dataSourceService;
const eventInstanceService = services.eventInstanceService;

const Common = Java.type('com.serotonin.m2m2.Common');
const multistateValue = Java.type('com.serotonin.m2m2.rt.dataImage.types.MultistateValue');
const numericValue = Java.type('com.serotonin.m2m2.rt.dataImage.types.NumericValue');
const binaryValue = Java.type('com.serotonin.m2m2.rt.dataImage.types.BinaryValue');
const ConditionSortLimit = Java.type('com.infiniteautomation.mango.db.query.ConditionSortLimit');
const RQLUtils = Java.type('com.infiniteautomation.mango.util.RQLUtils');
const ASTNode = Java.type('net.jazdw.rql.parser.ASTNode');

var EVENT_TYPES_SUM = new Array();
var EVENT_TYPES_RANGE_PERIOD_SUM = new Array();
var AVERAGE_EVENTS_PER_PERIOD = new Array();


var DATA_POINTS_ALARM = new Array();

checkEventCounts();

function checkEventCounts() {
    // Save all data points into the DATA_POINTS_ALARM array
    DP_XIDS.forEach((item) => {
            try {
                var dp = dataPointService.get(item);  // 'get()' returns the data point
                DATA_POINTS_ALARM.push(dp);
            }
            catch (dp_err) {
                console.log("Failed loading data point with XID " + item + ".");
                log.error(`Failed loading data point with XID ${item}.`);
            }
        }
    );

    //Confirm the number of event types being checked matches the number of data points in the array
    if (EVENT_TYPES.length != DATA_POINTS_ALARM.length) {
        console.log("Mismatch between the size of the EVENT_TYPES array and DATA_POINTS_ALARM array. For each EVENT_TYPE defined, there must be a matching DATA_POINTS_ALARM.");
        log.error(`Mismatch between the size of the EVENT_TYPES array (length = ${EVENT_TYPES.length}) and DP_XIDS array  (length = ${DATA_POINTS_ALARM.length}). For each EVENT_TYPE defined, there must be a matching DATA_POINTS_ALARM.`);
        return;
    };
    
    
    // Date management
    const dateNow = new Date();
    const dateFromRecent = new Date(dateNow.getTime() - (RECENT_PERIOD_HOURS * 60 * 60 * 1000)); // 2 hours in milliseconds
    const dateFromRecentMultiplier = new Date(dateNow.getTime() - ((RECENT_PERIOD_HOURS * RANGE_PERIOD_MULTIPLE)  * 60 * 60 * 1000)); // 2 hours in milliseconds
    
    // Iterate over each event type and get all the event counts
    EVENT_TYPES.forEach(requestType);
    
    function requestType(value) {
    
        let subSelectMap = new Map();
        var astNodeInitial = new ASTNode("eq", "typeName", value);
        var rql = RQLUtils.addAndRestriction(astNodeInitial, new ASTNode("ge", "activeTs", dateFromRecent.valueOf()));
        rql = RQLUtils.addAndRestriction(rql, new ASTNode("lt", "activeTs", dateNow.valueOf()));
        var conditions = new ConditionSortLimit(null, null, null, null);
        conditions = eventInstanceService.rqlToCondition(rql, subSelectMap, null, null);
        var dateArray = new Array();
        dateArray.push(new Date(dateFromRecent));
        dateArray.push(new Date());
        const newquery = services.eventInstanceService.count(rql.toString());
        EVENT_TYPES_SUM.push(newquery);
    }
    
    console.log("=============================== NUMBER OF EVENTS FOR RECENT PERIOD =============================== ")
    
    var numberOfEventsForRecentPeriodIndex = 0;
    EVENT_TYPES_SUM.forEach((item) => {
        // print average events per period
        console.log(EVENT_TYPES[numberOfEventsForRecentPeriodIndex] + " events for recent period: " + item);
        numberOfEventsForRecentPeriodIndex++;
    });
    
    
    // Iterate over each event type and get all the event counts
    EVENT_TYPES.forEach(requestTypeRange);
    
    function requestTypeRange(value) {
    
        let subSelectMap = new Map();
        var astNodeInitial = new ASTNode("eq", "typeName", value);
        var rql = RQLUtils.addAndRestriction(astNodeInitial, new ASTNode("ge", "activeTs", dateFromRecentMultiplier.valueOf()));
        rql = RQLUtils.addAndRestriction(rql, new ASTNode("lt", "activeTs", dateNow.valueOf()));
        var conditions = new ConditionSortLimit(null, null, null, null);
        conditions = eventInstanceService.rqlToCondition(rql, subSelectMap, null, null);
        const newquery = services.eventInstanceService.count(rql.toString());

        EVENT_TYPES_RANGE_PERIOD_SUM.push(newquery);
    }
    
    console.log("=============================== NUMBER OF TOTAL EVENTS BY TYPE =============================== ")
    
    var numberOfTotalEventsByTypeIndex = 0;
    EVENT_TYPES_RANGE_PERIOD_SUM.forEach((item) => {
        // print average events per period
        console.log(EVENT_TYPES[numberOfTotalEventsByTypeIndex] + " events for recent period*multipler by type: " + item);
        numberOfTotalEventsByTypeIndex++;
    });
    
    
    EVENT_TYPES_RANGE_PERIOD_SUM.forEach((item) => {
        AVERAGE_EVENTS_PER_PERIOD.push(item/RANGE_PERIOD_MULTIPLE);
    });
    console.log("=============================== NUMBER OF AVERAGE EVENTS PER PERIOD =============================== ")
    
    var eventTypesAverageEventsIndex = 0;
    AVERAGE_EVENTS_PER_PERIOD.forEach((item) => {
        // print average events per period
        console.log(EVENT_TYPES[eventTypesAverageEventsIndex] + " average events per period: " + item);
        eventTypesAverageEventsIndex++;
    });
    
    
    console.log("=============================== EXCEEDS THRESHOLD? =============================== ")
    var exceedsThresholdIndex = 0;
    EVENT_TYPES_SUM.forEach((item) => {
        console.log(EVENT_TYPES[exceedsThresholdIndex] + " -XID- " + DATA_POINTS_ALARM[exceedsThresholdIndex].getXid());
        console.log("TYPE_THRESHOLD_PERCENT: " + TYPE_THRESHOLD_PERCENT + "%");
        console.log("EVENTS RECENT PERIOD: " + item);
        console.log("AVERAGE_EVENTS_PER_PERIOD: " + AVERAGE_EVENTS_PER_PERIOD[exceedsThresholdIndex]);
        console.log("Recent events can't exceed by " + TYPE_THRESHOLD_PERCENT + "% the average events per period " + AVERAGE_EVENTS_PER_PERIOD[exceedsThresholdIndex]);
        const thresholdForEvents = (((TYPE_THRESHOLD_PERCENT/100)*AVERAGE_EVENTS_PER_PERIOD[exceedsThresholdIndex])).toFixed(2);
        const thresholdDescription = (TYPE_THRESHOLD_PERCENT + "% of " + AVERAGE_EVENTS_PER_PERIOD[exceedsThresholdIndex] + " (average events)");
        console.log("THRESHOLD FOR RECENT EVENTS: " + thresholdForEvents + "  --->  " + thresholdDescription);
        thresholdForEventsRoundedUp = Math.ceil(thresholdForEvents);
        console.log("THRESHOLD NEEDS TO BE ROUNDED UP: " + thresholdForEventsRoundedUp);
        // get the allowed excess
        const allowedExcess = Math.ceil((TYPE_THRESHOLD_PERCENT/100)*AVERAGE_EVENTS_PER_PERIOD[exceedsThresholdIndex]) - item;
        // get the real excess
        const realExcess = item-thresholdForEventsRoundedUp;
        console.log("Excess: " + realExcess);
    
        // real excess surpassess allowed excess?
        if(realExcess <= 0) {
            console.log("Events during the recent period (" + item + ") does not exceed the permitted threshold of " + thresholdForEventsRoundedUp);
            console.log("Setting data point to 0 - inactive alarm");
            log.info(`Setting ${DATA_POINTS_ALARM[exceedsThresholdIndex].getXid()} to 0.`)
            setDataPointValue(DATA_POINTS_ALARM[exceedsThresholdIndex], 0);
        }
        else {
            console.log("Events during the recent period (" + item + ") exceed the permitted threshold of " + thresholdForEventsRoundedUp);
            console.log("Setting data point to 1 - active alarm");
            log.info(`Setting ${DATA_POINTS_ALARM[exceedsThresholdIndex].getXid()} to 1.`)
            setDataPointValue(DATA_POINTS_ALARM[exceedsThresholdIndex], 1);
        }
        exceedsThresholdIndex++;
        console.log("============================================================== ")
    });
};

function determineDataPointType(dataPoint) {
    const pointLocator = dataPoint.getPointLocator();
    /*
        Depending on the Mango version, this method could be
        getDataTypeId() which returns a number
        OR
        getDataType() which returns a string
        We need to check which method exists to know which one to call
    */
    let pointType = "UNKNOWN";
    if (pointLocator.getDataTypeId) {
        //1: Binary, 2: Multistate, 3: Numeric, 4: Alphanumeric
        switch (pointLocator.getDataTypeId()) {
            case 1:
                pointType = "BINARY";
                break;
            case 2:
                pointType = "MULTISTATE";
                break;
            case 3:
                pointType = "NUMERIC";
                break;
            default:
                break;
        }
        //console.log(dataPoint.getXid() + ": " + pointType);
    }
    else if (pointLocator.getDataType) {
        pointType = pointLocator.getDataType().toString();
        //console.log(dataPoint.getXid() + ": " + pointType);
    }
    else {
        console.log("Unable to determine data point type for " + dataPoint.getXid());
    };
    return pointType;
};

function setDataPointValue(dataPoint, newValue) {
    const pointType = determineDataPointType(dataPoint);
    switch (pointType) {
        case "BINARY":
            //console.log(pointType);
            const newBinaryValue = new binaryValue(!!newValue);
            dataPointService.setValue(dataPoint.getId(), newBinaryValue, null);
            break;
        case "MULTISTATE":
            //console.log(pointType);
            const newMultistateValue = new multistateValue(newValue);
            dataPointService.setValue(dataPoint.getId(), newMultistateValue, null);
            break;
        case "NUMERIC":
            //console.log(pointType);
            const newNumericValue = new numericValue(newValue);
            dataPointService.setValue(dataPoint.getId(), newNumericValue, null);
            break;
        default:
            console.log("Unsupported data point type: " + pointType + " for XID " + dataPoint.getXid());
            log.error(`Unsupported data point type: ${pointType} for XID ${dataPoint.getXid()}`);
    }
    return;
};