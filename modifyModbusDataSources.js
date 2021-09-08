/**
 * Query for Modbus data sources with name matching pattern and modify them
 */
const dataSourceService = services.dataSourceService;
const pattern = 'SS';
const maxReadRegisterCount = 100;
let count = 0;
services.dataSourceService.buildQuery()
    .like('name', pattern)
    .equal('dataSourceType', 'MODBUS_IP')
    .query(ds => { 
        ds.setMaxReadRegisterCount(maxReadRegisterCount);
        dataSourceService.update(ds.getId(), ds);
        count++;
    });
//This will fail on long running scripts for which the response times out, in that case use log.info('string');
console.log('Updated ' + count + ' modbus data sources.');
