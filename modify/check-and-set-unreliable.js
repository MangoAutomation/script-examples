/**
 * Script to find unreliable data points and set them to -1
 * Using Graal.js Syntax for Mango Filestore
 *
 * Import accompanying virtual-container.json configuration for the point and data source used in this script
 */
 
const Common = Java.type('com.serotonin.m2m2.Common');
const DataSourceRT = Java.type('com.serotonin.m2m2.rt.dataSource.DataSourceRT');
const ILifecycleState = Java.type('com.serotonin.util.ILifecycleState');
const Collectors = Java.type('java.util.stream.Collectors');
const PointValueTime = Java.type('com.serotonin.m2m2.rt.dataImage.PointValueTime');
const NumericValue = Java.type('com.serotonin.m2m2.rt.dataImage.types.NumericValue');

//Must match the data type for the point, this will work on Numeric data points
const UNRELIABLE_VALUE = new NumericValue(-1.0);

//In this script I am going to ensure the data point is set to unreliable before I search for it, so I know it is
const dataPointXID = 'DP_73f870b7-a95b-4e92-8a80-f6d148650e73';
const dataPointID = services.dataPointService.get(dataPointXID).getId();
const dataPointRT = Common.runtimeManager.getDataPoint(dataPointID).setAttribute(DataSourceRT.ATTR_UNRELIABLE_KEY, true);

// Warning: This method holds dataPoints lock, make sure stream is closed
const streamPoints = DataSourceRT.class.getDeclaredMethod("streamPoints");
streamPoints.setAccessible(true);
 
//First we need to filter some subset of data points in the most efficent way possible, for this example I will get 1 data source from the Runtime
// as I know my point is on that data source
const dsRTs = Common.runtimeManager.getRunningDataSources();

//Find the data sources I care about and keep them in a list
const dataSourceXID = 'DS_aecd0dd5-4222-4b5a-8723-248d23163e5a';
const dsRTList = [];

dsRTs.forEach(function (dsRT) {
    if(dsRT.getVo().getXid() === dataSourceXID) {
        dsRTList.push(dsRT);
    }
});

//Now I have the data source on which I want to check the points
dsRTList.forEach(function(element, index) {
    const unreliablePointsList = [];
    try {
            stream = streamPoints.invoke(element);
            stream.collect(Collectors.toList()).forEach(function (dpRT) {
                var attributeValue = dpRT.getAttribute(DataSourceRT.ATTR_UNRELIABLE_KEY);
                if (attributeValue === true) {
                    console.log('Found unreliable point ' + dpRT.getVO().getXid());
                    unreliablePointsList.push(dpRT);
                }
            });
    } catch (ex) {
            print(ex);
    } finally {
            stream && stream.close();
    }
    //Stream is closed, now I will set all my points to UNRELIABLE_VALUE at the curren time
    // Note I could choose any time for this, even the time of the current value if there is one on my point
    const timeToSetUnreliable = Common.timer.millis(); //Mango 5 syntax
    
    //Note I could define a set point source here that would annotate the value, however by leaving this null the value will be saved asychronously to the
    // database but immediately be available in the point cache.
    const setPointSource = null;
    
    unreliablePointsList.forEach(function(dpRT, index){
        // the null parameter on the end can be a SetPointSource to annotate the value
       dpRT.setPointValue(new PointValueTime(UNRELIABLE_VALUE, timeToSetUnreliable), setPointSource); 
    });
});
