// saves file here -> <Mango data dir>/filestore/default/latestPolledValues/encompass-latest-pointValues<timestamp>.csv
// RFC 4180: '"' is the only valid CSV text qualifier - do not change (single quote / empty produce invalid CSV)
var wrapCharacter = '"';
//var dataSourceXid = 'DS_MANGO_CONFIG_TRACKING';
var dataSourceXid = 'internal_mango_monitoring_ds';
var fileStore = 'default';
var directoryName = 'latestPolledValues';
// replace ':' from the ISO timestamp -> ':' is illegal in Windows/NTFS filenames
var filename = 'encompass-latest-pointValues' + new Date().toISOString().replace(/:/g, '-') + '.csv';


//assign value to true to make the column visible in CSV file
var showPointNameColumn = true;
var showPointXidColumn = true;
var showPointValueColumn = true;
var showPolledTimeColumn = true;
var showDataSourceXidColumn = false;

//************* end of user configurable values **************************

var date = Java.type('java.util.Date');
var Common = Java.type('com.serotonin.m2m2.Common');
var dataPointService = Common.getBean(com.infiniteautomation.mango.spring.service.DataPointService.class);

var pointsDetails = [];

// query by dataSourceXid: deviceName is per-point editable and non-unique across data sources
var dataPoints = dataPointService.buildQuery().equal('dataSourceXid', dataSourceXid).query();

var pointValueDao = Java.type('com.serotonin.m2m2.db.dao.PointValueDao');
var objPointValueDao = Common.getBean(pointValueDao.class);

var fileStoreObject = Java.type('com.infiniteautomation.mango.spring.service.FileStoreService');
var fileStoreService = Common.getBean(fileStoreObject.class);

var filesObject = Java.type('java.nio.file.Files');

//epoch -> UTC formatted time
var simpleDateFormat = Java.type('java.text.SimpleDateFormat');
var timeZone = Java.type('java.util.TimeZone');
var sdf = new simpleDateFormat('yyyy-MM-dd HH:mm:ss');
sdf.setTimeZone(timeZone.getTimeZone('UTC'));

var columnNames = ['Point Name', 'Point Xid', 'Point Value', 'UTC Polled Time', 'DataSource Xid'];

var flags = {
    'Point Name': showPointNameColumn,
    'Point Xid': showPointXidColumn,
    'Point Value': showPointValueColumn,
    'UTC Polled Time': showPolledTimeColumn,
    'DataSource Xid': showDataSourceXidColumn
};

var visibleColumns = [];
var visibleIndexes = [];

columnNames.forEach(function (col, i) {
    if (flags[col] === true) {
        visibleColumns.push(col);
        visibleIndexes.push(i);
    }
});

for each (var point in dataPoints) {

    var pointName = point.getName();
    var pointXid = point.getXid();
    var pointDsXid = point.getDataSourceXid();
    var pointValue = '';
    var polledTimeFormatted = '';
    var polledTimeEpoch = -1;   // sort key; points with no stored value sort to the bottom

    try {
        // point from buildQuery() is already a full DataPointVO with seriesId populated
        var latestPointValueInfo = objPointValueDao.getLatestPointValue(point);

        // Optional is empty when the point has never stored a value -> leave cells blank
        if (latestPointValueInfo.isPresent()) {
            var unWrapped = latestPointValueInfo.get();
            pointValue = sanitizeValue(unWrapped.getValue());
            var polledTimeInEpoch = sanitizeValue(unWrapped.getTime());
            if (polledTimeInEpoch !== '') {
                polledTimeEpoch = Number(polledTimeInEpoch);
                polledTimeFormatted = sdf.format(new date(polledTimeEpoch));
            }
        }
    } catch (e) {
        LOG.debug('Failed to read latest value for point ' + pointXid + ' (' + pointName + '): ' + e);
    }

    var rowItem = [pointName, pointXid, pointValue, polledTimeFormatted, pointDsXid];
    pointsDetails.push({epoch: polledTimeEpoch, row: rowItem});
}

// order rows by most recent UTC polled time first (points with no value sort last)
pointsDetails.sort(function (a, b) {
    return b.epoch - a.epoch;
});

var rootPath = fileStoreService.getPathForWrite(fileStore, directoryName);
filesObject.createDirectories(rootPath);

var outputFile = rootPath.resolve(filename);
// Files.newBufferedWriter takes a Path natively and writes UTF-8 (FileWriter has no Path ctor + uses platform charset)
var writer = filesObject.newBufferedWriter(outputFile);
try {
    // UTF-8 BOM so Excel (Windows) detects the encoding on double-click and renders non-ASCII correctly
    writer.write('\uFEFF');
    writer.write(visibleColumns.join(','));
    writer.newLine();

    for each (var entry in pointsDetails) {
        var visibleValues = visibleIndexes.map(function (i) {
            return escapeValue(entry.row[i], wrapCharacter);
        });
        writer.write(visibleValues.join(','));
        writer.newLine();
    }
    writer.flush();
} finally {
    writer.close();   // always runs, even if writing throws
}

function escapeValue(value, quote) {
    if (value === null || value === undefined) {
        return '';
    }

    var strValue = value.toString();

    // wrap when the value contains a separator, the quote char, or a line break (\n or \r) - RFC 4180
    if (strValue.indexOf(',') !== -1 || strValue.indexOf(quote) !== -1 ||
        strValue.indexOf('\n') !== -1 || strValue.indexOf('\r') !== -1) {
        // double any embedded quote chars, then wrap in the quote
        return quote + strValue.split(quote).join(quote + quote) + quote;
    }

    return strValue;
}

function sanitizeValue(value) {
    if (value === null ||
        value === undefined ||
        value === '' ||
        value === 'null' ||
        value === 'undefined' ||
        value === 'NaN' ||
        (typeof value === 'number' && isNaN(value))) {
        return '';
    }
    return value.toString();
}
