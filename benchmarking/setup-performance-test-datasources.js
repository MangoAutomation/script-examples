// import classes
const ModuleRegistry = Java.type('com.serotonin.m2m2.module.ModuleRegistry');
const PersistentDataSourceDefinition = Java.type('com.serotonin.m2m2.persistent.PersistentDataSourceDefinition');

// import services
const dataPointService = services.dataPointService;
const dataSourceService = services.dataSourceService;

const numDataSources = 1; // number of data sources to create
const sharedKey = '';
const firstPort = 8090;

for (let dsCount = 0; dsCount < numDataSources; dsCount++) {
    const dataSourceDef = ModuleRegistry.getDefinition(PersistentDataSourceDefinition.class);
    const dataSource = dataSourceDef.baseCreateDataSourceVO();
    dataSource.setEnabled(true);
    dataSource.setName(`Performance test ${dsCount}`);
    dataSource.setPort(firstPort + dsCount);
    dataSource.setAuthorizationKey('');
    dataSource.setAcceptPointUpdates(true);
    dataSource.setSaveRealtimeData(true);
    dataSource.setSharedKey(sharedKey);
    dataSource.setKeySize(128);
    dataSourceService.insert(dataSource);
}
