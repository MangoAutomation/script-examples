var activeContextPointCount = 0;
var pointValueSum = 0;
var totalDataSourcesAMECount = 0;
var totalDataPointsAMECount = 0;

var dataSourceService = Java.type('com.infiniteautomation.mango.spring.service.DataSourceService');
var dataSourceServiceClass = Common.getBean(dataSourceService.class);

var HashMap = Java.type('java.util.HashMap');
var alreadyProcessedDsXids = new HashMap();
var alreadyProcessedDataPointXids = new HashMap();
var loopCycle = 1;

//Instance of WatchListServiceClass
var watchListService = Java.type('com.infiniteautomation.mango.spring.service.WatchListService');
var watchListServiceClass = Common.getBean(watchListService.class);

//Instance of WatchListDAO class
var watchListDAO = Java.type('com.infiniteautomation.mango.spring.dao.WatchListDao');
var watchListDAOClass = Common.getBean(watchListDAO.class);

//This is global
var watchListMtcEventsCount = getWatchListMtcEventsCount();

//This method add dataPoints to list which are linked to
var watchListDataPointIds = getAllWatchListEventsDataPoints();

for (var key in EXTERNAL_POINTS) {
    //get the point value of each context point
    var contextPoint = this[key];
    var wrapper = contextPoint.getDataPointWrapper();

    if (wrapper.enabled) {
         var dataSourceXid = wrapper.dataSourceXid;
         var dataSource = dataSourceServiceClass.get(dataSourceXid);

         //  ************** dataSource level checking **************************
          if(!alreadyProcessedDsXids.containsKey(dataSourceXid)){
              //get dataSource active maintenance events count
              var dsActiveMaintenanceEventsCount = getTotalActiveMaintenanceEventsByDataSourceId(dataSource.id);
              alreadyProcessedDsXids.put(wrapper.dataSourceXid,dsActiveMaintenanceEventsCount);
              totalDataSourcesAMECount += dsActiveMaintenanceEventsCount;

              if(dsActiveMaintenanceEventsCount > 0){
                  print("This dataSource has activeMaintenanceEvent: dataSource xid '" + wrapper.dataSourceXid + "'" + " count= " + dsActiveMaintenanceEventsCount);
                  //operations team will add some logic here
              }
          }

         //  ************** DataPoint level checking **************************
         //since dataPoint's dataSource doesn't have activeMtcEvents,check whether dataPoint has activeMaintenanceEvents
         if(dsActiveMaintenanceEventsCount === 0){
            if(!alreadyProcessedDataPointXids.containsKey(wrapper.xid)){
               dpActiveMaintenanceEventsCount  = getTotalActiveMaintenanceEventsByDataPointXid(wrapper.xid);
               if(dpActiveMaintenanceEventsCount > 0){
                 totalDataPointsAMECount += dpActiveMaintenanceEventsCount;
                 alreadyProcessedDataPointXids.put(wrapper.xid,dpActiveMaintenanceEventsCount);
                 if(dpActiveMaintenanceEventsCount > 0) {
                    print("This dataPoints has activeMaintenanceEvent: dataPoint xid '" + wrapper.xid + "'" + " count= " + dpActiveMaintenanceEventsCount);
                    //operations team will add some logic here
                 }
               }
            }
         }

         //***************** WatchList level checking for dataPoint activeMaintenanceEvent ****************************
         if((dsActiveMaintenanceEventsCount === 0) && (dpActiveMaintenanceEventsCount === 0)){
            if(!alreadyProcessedDataPointXids.containsKey(wrapper.xid)){
                if(watchListMtcEventsCount > 0 ){
                  if(watchListDataPointIds.contains(wrapper.id)){
                    dpActiveMaintenanceEventsCount = dpActiveMaintenanceEventsCount + 1;
                    totalDataPointsAMECount += dpActiveMaintenanceEventsCount;
                    alreadyProcessedDataPointXids.put(wrapper.xid,dpActiveMaintenanceEventsCount);

                    if(dpActiveMaintenanceEventsCount > 0) {
                       print("This dataPoint(in watchList) has activeMaintenanceEvent: dataPoint xid '" + wrapper.xid + "'" + " count= " + dpActiveMaintenanceEventsCount);
                       //operations team will add some logic here
                    }
                  }
                }
            }
        }
    }
 }

print("Total ActiveMaintenanceEventsCount = ", totalDataSourcesAMECount + totalDataPointsAMECount);
return totalDataSourcesAMECount + totalDataPointsAMECount;






