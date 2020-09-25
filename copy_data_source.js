const UUID = Java.type('java.util.UUID');

const templateDataSourceXid = 'DS_XYZ';
const templateDataSource = services.dataSourceService.get(templateDataSourceXid);
console.log(copyDataSource(templateDataSource));

function copyDataSource(dataSource) {
    const copy = dataSource.copy();
    copy.setId(-1);
    copy.setXid(`DS_${UUID.randomUUID()}`);
    copy.setEnabled(false);
    services.dataSourceService.insert(copy);
    return copy;
}
