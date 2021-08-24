/**
 * These tests will output metrics to the mango log
 *  be sure to modify your log4j2.xml settings to
 *  capture the script log output too.
 */
// import classes
const Common = Java.type('com.serotonin.m2m2.Common');
const LogStopWatch = Java.type('com.serotonin.log.LogStopWatch');
const DataPointTagsDao = Java.type('com.serotonin.m2m2.db.dao.DataPointTagsDao');
const MangoPermission = Java.type('com.infiniteautomation.mango.permission.MangoPermission');

// import services
const dataPointService = services.dataPointService;
const dataSourceService = services.dataSourceService;
const publisherService = services.publisherService;
const usersService = services.usersService;

//TODO create non-admin user to test with permissions
const users = [];
users.push(usersService.get('admin'));
users.push(usersService.get('non-admin-benchmark'));

const iterations = users.length;

for(let i=0; i<iterations; i++) {

    log.info('Test iteration ' + i + ' with user ' + users[i].getName());
    //Test data point tags
    const stopwatch = new LogStopWatch();
    const keys = DataPointTagsDao.getInstance().getTagKeys(users[i]);
    stopwatch.stop(() => 'Collected ' + keys.size() + ' tag keys');
    
    const tags = {};
    stopwatch.reset();
    const keyIt = keys.iterator();
    while(keyIt.hasNext()) {
        let key = keyIt.next();
        tags[key] = DataPointTagsDao.getInstance().getTagValuesForKey(key, users[i]);
    }
    stopwatch.stop(() => 'Retrieved all tag key values.');
    
    //Test data point queries
    if(keys.iterator().hasNext()) {
        const testKey = keys.iterator().next();
        const testTagValue = tags[testKey].iterator().next();
        let count = 0;
        if(i%2 == 0) {
            log.info('Lazy loading fields for points')
        }
        stopwatch.reset();
        dataPointService.buildQuery()
            .equal('tags.' + testKey, testTagValue)
            .query(point => {
                count++;
                //TODO activate the lazy loading of fields, permissions and tags...
                if(i%2 == 0) {
                    //These all make extra queries and WILL slow things down
                    point.getTags();
                    point.getReadPermission();
                    point.getEditPermission();
                    point.getSetPermission();
                }
            }, 100, 0);
        stopwatch.stop(() => 'Query found ' + count + ' data points for tag ' + testKey + '=' + testTagValue);
    }
}
