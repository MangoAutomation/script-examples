/*
*  Query data points on a single data source and check point locator values
*    to determine if there are any multiple points.  This was used in testing
*    the sychronization of the data source logic.
*/
let count = 0;
const uniqueKeys = [];
const duplicatePoints = [];

const limit = 500000;
const logInterval = 1000;

services.dataPointService.buildQuery()
    .equal('dataSourceId', 7)
    .query((dp) => {
        const locator = dp.getPointLocator();
        //Create unique key and check to see if already exists
        const key = locator.getMeasurement() + locator.getFieldKey();
        if(uniqueKeys.includes(key)) {
            duplicatePoints.push(dp);
        }else {
            uniqueKeys.push(key);
        }

        if((count % logInterval) == 0) {
            log.info('Processed ' + count);
        }
        count++;
    }, limit, 0);

duplicatePoints.forEach(dp => {
    log.info('Point ' + dp.getId() + ' measurement: ' + dp.getPointLocator().getMeasurement() + ' fieldKey: ' + dp.getPointLocator().getFieldKey());
});
