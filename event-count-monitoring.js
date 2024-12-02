/**
 * Called when the Mango event is raised.
 */
//  This script checks if the number of events, by type, in the RECENT_PERIOD exceeds the AVERAGE_EVENTS_PER_PERIOD, by more than the TYPE_THRESHOLD percentage, set the alarm data point for this type to 1 (Active alarm). Else, set the data point to 0 (Inactive alarm).
//
// To use this script you need to modify this script to include the following configurable parameters
// RECENT_PERIOD: initially 24 hours
// RANGE_PERIOD_MULTIPLE: initially 10
// TYPE_THRESHOLD for each event type (DATA_POINT, DATA_SOURCE, SYSTEM, etc): initially 150
// DP_XIDS are the alarm data point XIDs for each event type

const RECENT_PERIOD_HOURS = 24;
const RANGE_PERIOD_MULTIPLE = 10;
const TYPE_THRESHOLD = 150;
const EVENT_TYPES = ["DATA_POINT", "DATA_SOURCE", "SYSTEM"];
// These data points should be set previously on Mango, the XIDs are not fixed and might be substituted for the XIDs that Mango creates
const DP_XIDS = ["DP_3e932473-b52d-41be-ac39-c231a0feed20", "DP_116cf7c9-2a43-40cf-aa7c-40fa2d7753a2", "DP_fabc2209-08c2-47a0-99ff-f7fede490689"];


// services
const dataPointService = services.dataPointService;
const dataSourceService = services.dataSourceService;
const eventInstanceService = services.eventInstanceService;

const Common = Java.type('com.serotonin.m2m2.Common');
const MultiStateValue = Java.type('com.serotonin.m2m2.rt.dataImage.types.MultistateValue');
const NumericValue = Java.type('com.serotonin.m2m2.rt.dataImage.types.NumericValue');
const ConditionSortLimit = Java.type('com.infiniteautomation.mango.db.query.ConditionSortLimit');
const RQLUtils = Java.type('com.infiniteautomation.mango.util.RQLUtils');
const ASTNode = Java.type('net.jazdw.rql.parser.ASTNode');


var EVENT_TYPES_SUM = new Array();
var EVENT_TYPES_RANGE_PERIOD_SUM = new Array();
var AVERAGE_EVENTS_PER_PERIOD = new Array();



// numeric types
const numericZero = new NumericValue(0);
const numericOne = new NumericValue(1);
const multistateZero = new MultiStateValue(0);
const multistateOne = new MultiStateValue(1);



var DATA_POINTS_ALARM = new Array();

// Save all data points into the DATA_POINTS_ALARM array
DP_XIDS.forEach((item) => {
    var dp = dataPointService.get(item);  // 'get()' returns the data point
    DATA_POINTS_ALARM.push(dp);
});


// Date management
const dateTo = new Date().valueOf(); // current time
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
    const newquery = services.eventInstanceService.countQuery(conditions, dateArray);
    const tempTotal = newquery[0].getTotal();
    var sum=0;
    tempTotal.keySet().forEach((item) => {
        sum += tempTotal.get(item);
    });
    EVENT_TYPES_SUM.push(sum);
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
    var dateArray = new Array();
    dateArray.push(new Date(dateFromRecentMultiplier));
    dateArray.push(new Date());
    const newquery = services.eventInstanceService.countQuery(conditions, dateArray);
    const tempTotal = newquery[0].getTotal();

    var sum=0;
    tempTotal.keySet().forEach((item) => {
        sum += tempTotal.get(item);
    });
    EVENT_TYPES_RANGE_PERIOD_SUM.push(sum);
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
    console.log("TYPE_THRESHOLD: " + TYPE_THRESHOLD + "%");
    console.log("EVENTS RECENT PERIOD: " + item);
    console.log("AVERAGE_EVENTS_PER_PERIOD: " + AVERAGE_EVENTS_PER_PERIOD[exceedsThresholdIndex]);
    // get the allowed excess
    const allowedExcess = (TYPE_THRESHOLD/100)*AVERAGE_EVENTS_PER_PERIOD[exceedsThresholdIndex];
    console.log("allowedExcess: " + allowedExcess);
    // get the real excess
    const realExcess = item-AVERAGE_EVENTS_PER_PERIOD[exceedsThresholdIndex];
    console.log("realExcess: " + realExcess);

    // real excess surpassess allowed excess?
    if(realExcess > allowedExcess) {
        console.log("Setting data point to 1 - active alarm");
        dataPointService.setValue(DATA_POINTS_ALARM[exceedsThresholdIndex].getId(), numericOne, null);
    }
    else {
        console.log("Setting data point to 0 - inactive alarm");
        dataPointService.setValue(DATA_POINTS_ALARM[exceedsThresholdIndex].getId(), numericZero, null);
    }
    exceedsThresholdIndex++;
    console.log("============================================================== ")
});
