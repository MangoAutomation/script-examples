/**
 * Script to Set Unreliable Numeric Data Points to a Default Value
 * Designed to run via Advanced Schedules using Graal.js
 *
 * Purpose:
 * - Detect numeric data points marked as "unreliable"
 * - Check if they haven't received an update for at least 1 minute
 * - Set their value to a default (e.g. -1.0)
 *
 * Rules:
 * - Skip points in Persistent TCP/gRPC data sources
 * - Skip non-numeric data points
 */

const Common = Java.type('com.serotonin.m2m2.Common');
const DataSourceRT = Java.type('com.serotonin.m2m2.rt.dataSource.DataSourceRT');
const GrpcDatasourceRT = Java.type('com.radixiot.mango.persistent.datasource.GrpcDatasourceRT')
const PersistentDataSourceRT = Java.type('com.serotonin.m2m2.persistent.ds.PersistentDataSourceRT')
const Collectors = Java.type('java.util.stream.Collectors');
const PointValueTime = Java.type('com.serotonin.m2m2.rt.dataImage.PointValueTime');
const NumericValue = Java.type('com.serotonin.m2m2.rt.dataImage.types.NumericValue');
const DataType = Java.type('com.serotonin.m2m2.DataType');

/**
 * Called when the Mango event is raised.
 * You must implement this method.
 *
 * @param event
 */
function eventRaised(event) {
  // Configuration
  const DEFAULT_NUMERIC_VALUE = new NumericValue(-1.0); // Default value to assign
  const MINIMUM_IDLE_TIME = 60_000; // 1 minute (in milliseconds)

  // Get all the datasources
  const streamPoints = DataSourceRT.class.getDeclaredMethod("streamPoints");
  streamPoints.setAccessible(true);

  // Get running datasources
  const dsRTs = Common.runtimeManager.getRunningDataSources();

  // Filter out persistent data sources (TCP/gRPC types)
  const dsRTList = [];
  dsRTs.forEach(function (dsRT) {
    if(!(dsRT instanceof GrpcDatasourceRT || dsRT instanceof PersistentDataSourceRT)) {
      dsRTList.push(dsRT);
    }
  });

  //Now I have the data source on which I want to check the points
  dsRTList.forEach(function(element, index) {
    const unreliablePointsList = [];
    try {
      // Get stream of data points from this data source
      stream = streamPoints.invoke(element);

      // Find points marked as "unreliable"
      stream.collect(Collectors.toList()).forEach(function (dpRT) {
        var attributeValue = dpRT.getAttribute(DataSourceRT.ATTR_UNRELIABLE_KEY);
        if (attributeValue === true) {
          console.log('Found unreliable point ' + dpRT.getVO().getXid());
          unreliablePointsList.push(dpRT);
        }
      });
    } catch (ex) {
      print('Error while processing data source: ' + ex);
    } finally {
      stream && stream.close();
    }

    // Now process each unreliable point
    unreliablePointsList.forEach(function(dataPointRT) {
      var pointVO = dataPointRT.getVO();
      var pointLocator = pointVO.getPointLocator();

      // Only process numeric points
      var isNumeric = pointLocator.getDataType() === DataType.NUMERIC;

      // Check if the point has received a value update in the last minute
      var recentValue = dataPointRT.getPointValueAfter(Common.timer.currentTimeMillis() - MINIMUM_IDLE_TIME);

      if (isNumeric && !recentValue) {
        // Set default value if no recent update
        dataPointRT.setPointValue(
            new PointValueTime(DEFAULT_NUMERIC_VALUE, Common.timer.currentTimeMillis()),
            null // setPointSource is null for async update
        );
        console.log('Updated point: ' + pointVO.getXid());
      } else {
        console.log('Skipped point (recent or not numeric): ' + pointVO.getXid());
      }
    });
  });
}

/**
 * Called when the Mango event is acknowledged (the event may still be active).
 * Supported as of Mango v4.0.0-beta.14, you are not required to implement this method.
 *
 * @param event
 */
function eventAcknowledged(event) {
  //console.log('Acknowledged', event);
}

/**
 * Called when the Mango event returns to normal or is deactivated (e.g. on shutdown).
 * You must implement this method.
 *
 * @param event
 */
function eventInactive(event) {
  //console.log('Inactive', event);
}