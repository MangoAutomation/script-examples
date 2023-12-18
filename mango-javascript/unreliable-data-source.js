var Common = Java.type('com.serotonin.m2m2.Common');
var DataSourceRT = Java.type("com.serotonin.m2m2.rt.dataSource.DataSourceRT");
var ILifecycleState = Java.type("com.serotonin.util.ILifecycleState");
var Collectors = Java.type("java.util.stream.Collectors");


var dsRTMap = {};
var dsRTs = Common.runtimeManager.getRunningDataSources();
dsRTs.forEach(function (dsRT) {
    var dsXid = dsRT.getVo().getXid();
    dsRTMap[dsXid] = dsRT;
});

// Warning: This method holds dataPoints lock, make sure stream is closed
var streamPoints = DataSourceRT.class.getDeclaredMethod("streamPoints");
streamPoints.setAccessible(true);

function countAttribute(dataSourceXid, attributeKey, attributeValue) {
    var count = 0;
    var dsRT = dsRTMap[dataSourceXid];
    if (dsRT && dsRT.getLifecycleState() === ILifecycleState.RUNNING) {
        var stream;
        try {
            stream = streamPoints.invoke(dsRT);
            stream.collect(Collectors.toList()).forEach(function (dpRT) {
                var actualValue = dpRT.getAttribute(attributeKey);
                if (actualValue === attributeValue) count++;
            });
        } catch (ex) {
            print(ex);
        } finally {
            stream && stream.close();
        }
    }
    return count;
}

var results = {};
// set the point values
for (var key in EXTERNAL_POINTS) {
    var point = this[key];
    var wrapper = point.getDataPointWrapper();
    var dsXid = wrapper.tags.dsXid;
    if (dsXid) {
        if (results[dsXid] === undefined)
            results[dsXid] = countAttribute(dsXid, DataSourceRT.ATTR_UNRELIABLE_KEY, true);

        var count = results[dsXid];
        switch (wrapper.name) {
            case 'Unreliable count': point.set(count); break;
            case 'Unreliable': point.set(count > 0); break;
        }
    }
}
