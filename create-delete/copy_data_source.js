const UUID = Java.type('java.util.UUID');
const dataSourceService = services.dataSourceService;
const dataPointService = services.dataPointService;

const templateDataSourceXid = 'DS_XYZ';
const templateDataSource = dataSourceService.get(templateDataSourceXid);
const dataSourceCopy = copyDataSource(templateDataSource);

const dataPoints = services.dataPointService.buildQuery()
    .equal('dataSourceId', templateDataSource.getId())
    .query(point => {
        copyDataPoint(dataSourceCopy, point);
    });

console.log(dataSourceCopy);

function copyDataSource(dataSource) {
    const copy = dataSource.copy();
    copy.setId(-1);
    copy.setXid(`DS_${UUID.randomUUID()}`);
    copy.setName(dataSource.getName() + ' (copy)');
    copy.setEnabled(false);
    services.dataSourceService.insert(copy);
    return copy;
}

function copyDataPoint(dataSource, dataPoint) {
    const copy = dataPoint.copy();
    copy.setId(-1);
    copy.setSeriesId(-1);
    copy.setXid(null);
    copy.setDataSourceXid(dataSource.getXid());
    copy.setDataSourceId(dataSource.getId());
    dataPointService.insert(copy);
    return copy;
}
