/**
 * This script finds all data points with names of reboot,resetAlarms,beacon1State and sets the data type to MULTISTATE
 */

const dataPointService = services.dataPointService;
const DataType = Java.type('com.serotonin.m2m2.DataType');
let count = 0;

const upgradePoint = function(point) {
    try {
        point.getPointLocator().setDataType(DataType.MULTISTATE);
        dataPointService.update(point.getXid(), point);
        count++;
    } catch(e) {
        log.error('Failed to upgrade point {}', point, error);
    }
};

const dataPoints = dataPointService.buildQuery()
    .or()
    .equal('name', 'reboot')
    .equal('name', 'resetAlarms')
    .equal('name', 'beacon1State')
    .close()
    .query();

for (const dp of dataPoints) {
    upgradePoint(dp);
}

log.info('Upgraded {} data points', count);
