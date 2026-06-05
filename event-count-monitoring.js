/*  This script checks if the number of events, by type, in the RECENT_PERIOD_HOURS exceeds the
    AVERAGE_EVENTS_PER_PERIOD by more than the per-type TYPE_THRESHOLD_PERCENTS percentage. If
    the threshold is exceeded, an alarm data point value for this event type will be set to 1.
    If the threshold is not exceeded, the alarm data point value will be set to 0.

    The following parameters are configurable:
    - RECENT_PERIOD_HOURS: initially 24 hours
    - RANGE_PERIOD_MULTIPLE: initially 10
    - TYPE_THRESHOLD_PERCENTS: per-type percentage, initially 150 for each type
    - DP_XIDS: Alarm data point XIDs for each event type
*/

var RECENT_PERIOD_HOURS = 24;
var RANGE_PERIOD_MULTIPLE = 10;
var EVENT_TYPES = ["DATA_POINT", "DATA_SOURCE", "SYSTEM"];
// One threshold per EVENT_TYPES entry, same order.
// Alarm fires when recent count > average * (percent / 100).
// e.g. 100 -> alarm on any increase above average; 200 -> alarm when recent exceeds 2x average.
var TYPE_THRESHOLD_PERCENTS = [150, 150, 150];

/*
    These data points represent alarm data points created in Mango that can raise an alarm when
    the event count threshold is exceeded. These XIDs are not fixed and can be changed to match
    the XIDs in your Mango installation.

    The number of XIDs must match the number of EVENT_TYPES defined in the array above, and the
    XIDs below will be matched to the EVENT_TYPES above in the same order they appear in the
    array below. The alarm data points can be Binary, Multistate, or Numeric points.
*/
var DP_XIDS = ["DP_DATA_POINT_EVENT_THRESHOLD_ALARM", "DP_DATA_SOURCE_EVENT_THRESHOLD_ALARM", "DP_SYSTEM_EVENT_THRESHOLD_ALARM"];

var Common = Java.type('com.serotonin.m2m2.Common');
var DataPointService = Java.type('com.infiniteautomation.mango.spring.service.DataPointService');
var EventInstanceService = Java.type('com.infiniteautomation.mango.spring.service.EventInstanceService');

var dataPointService = Common.getBean(DataPointService.class);
var eventInstanceService = Common.getBean(EventInstanceService.class);

var multistateValue = Java.type('com.serotonin.m2m2.rt.dataImage.types.MultistateValue');
var numericValue = Java.type('com.serotonin.m2m2.rt.dataImage.types.NumericValue');
var binaryValue = Java.type('com.serotonin.m2m2.rt.dataImage.types.BinaryValue');
var RQLUtils = Java.type('com.infiniteautomation.mango.util.RQLUtils');
var ASTNode = Java.type('net.jazdw.rql.parser.ASTNode');

var EVENT_TYPES_SUM = new Array();
var EVENT_TYPES_RANGE_PERIOD_SUM = new Array();
var AVERAGE_EVENTS_PER_PERIOD = new Array();
var DATA_POINTS_ALARM = new Array();

checkEventCounts();

function checkEventCounts() {
    if (EVENT_TYPES.length != DP_XIDS.length || EVENT_TYPES.length != TYPE_THRESHOLD_PERCENTS.length) {
        LOG.error("Parallel array length mismatch: EVENT_TYPES=" + EVENT_TYPES.length + ", DP_XIDS=" + DP_XIDS.length + ", TYPE_THRESHOLD_PERCENTS=" + TYPE_THRESHOLD_PERCENTS.length + ". All three must match.");
        return;
    }

    DP_XIDS.forEach(function(xid) {
        try {
            DATA_POINTS_ALARM.push(dataPointService.get(xid));
        }
        catch (dp_err) {
            LOG.error("Failed loading data point with XID " + xid + ": " + dp_err);
            DATA_POINTS_ALARM.push(null);
        }
    });

    var dateNow = new Date();
    var dateFromRecent = new Date(dateNow.getTime() - (RECENT_PERIOD_HOURS * 60 * 60 * 1000));
    var dateFromRange = new Date(dateNow.getTime() - ((RECENT_PERIOD_HOURS * RANGE_PERIOD_MULTIPLE) * 60 * 60 * 1000));

    EVENT_TYPES.forEach(function(value) {
        try {
            var rql = new ASTNode("eq", "typeName", value);
            rql = RQLUtils.addAndRestriction(rql, new ASTNode("ge", "activeTs", dateFromRecent.valueOf()));
            rql = RQLUtils.addAndRestriction(rql, new ASTNode("lt", "activeTs", dateNow.valueOf()));
            EVENT_TYPES_SUM.push(eventInstanceService.count(rql.toString()));
        }
        catch (e) {
            LOG.error("Failed counting recent events for type " + value + ": " + e);
            EVENT_TYPES_SUM.push(null);
        }
    });

    EVENT_TYPES.forEach(function(value) {
        try {
            var rql = new ASTNode("eq", "typeName", value);
            rql = RQLUtils.addAndRestriction(rql, new ASTNode("ge", "activeTs", dateFromRange.valueOf()));
            rql = RQLUtils.addAndRestriction(rql, new ASTNode("lt", "activeTs", dateNow.valueOf()));
            EVENT_TYPES_RANGE_PERIOD_SUM.push(eventInstanceService.count(rql.toString()));
        }
        catch (e) {
            LOG.error("Failed counting range-period events for type " + value + ": " + e);
            EVENT_TYPES_RANGE_PERIOD_SUM.push(null);
        }
    });

    EVENT_TYPES_RANGE_PERIOD_SUM.forEach(function(item) {
        AVERAGE_EVENTS_PER_PERIOD.push(item === null ? null : item / RANGE_PERIOD_MULTIPLE);
    });

    EVENT_TYPES_SUM.forEach(function(recent, i) {
        var type = EVENT_TYPES[i];
        var dp = DATA_POINTS_ALARM[i];
        var range = EVENT_TYPES_RANGE_PERIOD_SUM[i];
        var average = AVERAGE_EVENTS_PER_PERIOD[i];
        var thresholdPercent = TYPE_THRESHOLD_PERCENTS[i];

        if (recent === null || average === null || dp === null) {
            LOG.warn(type + ": skipped (count fetch or DP load failed)");
            return;
        }

        var threshold = (thresholdPercent / 100) * average;
        var exceeds = recent > threshold;
        var newValue = exceeds ? 1 : 0;
        var state = exceeds ? "ACTIVE" : "inactive";
        LOG.info(type + ": recent=" + recent + " range=" + range + " avg=" + average + " threshold=" + (Math.round(threshold * 100) / 100) + " (" + thresholdPercent + "%) -> " + state + " [" + dp.getXid() + "=" + newValue + "]");
        setDataPointValue(dp, newValue);
    });
};

function determineDataPointType(dataPoint) {
    var pointLocator = dataPoint.getPointLocator();
    /*
        Depending on the Mango version, this method could be
        getDataTypeId() which returns a number
        OR
        getDataType() which returns a string
        We need to check which method exists to know which one to call
    */
    var pointType = "UNKNOWN";
    if (pointLocator.getDataTypeId) {
        switch (pointLocator.getDataTypeId()) {
            case 1: pointType = "BINARY"; break;
            case 2: pointType = "MULTISTATE"; break;
            case 3: pointType = "NUMERIC"; break;
            default: break;
        }
    }
    else if (pointLocator.getDataType) {
        pointType = pointLocator.getDataType().toString();
    }
    else {
        LOG.error("Unable to determine data point type for " + dataPoint.getXid());
    }
    return pointType;
};

function setDataPointValue(dataPoint, newValue) {
    var pointType = determineDataPointType(dataPoint);
    switch (pointType) {
        case "BINARY":
            dataPointService.setValue(dataPoint.getId(), new binaryValue(!!newValue), null);
            break;
        case "MULTISTATE":
            dataPointService.setValue(dataPoint.getId(), new multistateValue(newValue), null);
            break;
        case "NUMERIC":
            dataPointService.setValue(dataPoint.getId(), new numericValue(newValue), null);
            break;
        default:
            LOG.error("Unsupported data point type: " + pointType + " for XID " + dataPoint.getXid());
    }
    return;
};
