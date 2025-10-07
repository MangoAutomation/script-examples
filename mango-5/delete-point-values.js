/**
 * Delete point values for many points that match a query
 */
 const Common = Java.type('com.serotonin.m2m2.Common');
 const ZonedDateTime = Java.type('java.time.ZonedDateTime');
 
 //Get a reference to the point value DAO to delete values from the database, caution this does not delete values
 // that are cached in the runtime in the data point's cache.
 const PointValueDao = Java.type('com.serotonin.m2m2.db.dao.PointValueDao');
 const pointValueDao = Common.getBean(PointValueDao);
 
 //Do you want to reload the values from the database in the runtime?
 const bustCache = false;
 
 //Don't delete or make any changes
 const dryRun = true;
 
 //Setup the period to delete, use server timezone unless supplied.
 const from = ZonedDateTime.now().minusMinutes(2);
 const to = ZonedDateTime.now().minusMinutes(1);


print('Delete values from ' + from + ' to ' + to);
const fromMs = from.toInstant().toEpochMilli();
const toMs = to.toInstant().toEpochMilli();
 
//Query for the points you want to delete values from
//.equal('tags.tagName', 'tagValue')
services.dataPointService.buildQuery()
    .equal('deviceName', 'Mango Internal')
    .query((dp) => {
        //Show the point you will delete values from
        if(dryRun) { 
            console.log(dp.getName());
        }
        
        //Ensure the running user can in fact modify values (Optional check here)
        services.dataPointService.ensureSetPermission(Common.getUser(), dp);
        
        if(!dryRun) {
            //Delete Values
            //start of time range (epoch ms), inclusive
            //end of time range (epoch ms), exclusive
            //Depending on the type of database used, the count may be 0.  Mango NoSQL will return a count.
            const optionalLong = pointValueDao.deletePointValuesBetween(dp, fromMs, toMs);
            
            //If you wanted to ensure cached values are cleaned out
            if(bustCache) {
                const dpRT = Common.runtimeManager.getDataPoint(dp.getId());
                if(dpRT != null) { 
                    dpRT.invalidateCache();
                }
            }
            console.log(dp.getName() + ' deleted ' + optionalLong.orElse(0) + ' values.');
        }
    });