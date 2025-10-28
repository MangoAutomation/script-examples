
var dataSourceService = Java.type('com.infiniteautomation.mango.spring.service.DataSourceService');
var dataSourceServiceClass = Common.getBean(dataSourceService.class);

//alreadyProcessedDsXids = alreadyProcessedDataSourceXids
var HashMap = Java.type('java.util.HashMap');
var alreadyProcessedDataSourceXids = new HashMap();
var alreadyProcessedDataPointXids = new HashMap();
var alreadyProcessedWatchListXids = new HashMap();

var dsActiveMaintenanceEventsCount = 0;
var dpActiveMaintenanceEventsCount = 0;

//for watList related
var alreadyProcessedWatchLists = new HashMap();
var alreadyProcessedWatchListDataPoints = new HashMap();

//Instance of WatchListServiceClass
var watchListService = Java.type('com.infiniteautomation.mango.spring.service.WatchListService');
var watchListServiceClass = Common.getBean(watchListService.class);

//Instance of WatchListDAO class
var watchListDAO = Java.type('com.infiniteautomation.mango.spring.dao.WatchListDao');
var watchListDAOClass = Common.getBean(watchListDAO.class);

//This variable contains watchListId, watchListMtcEventCount
var maintenanceEventsInfo = getWatchListMaintenanceEventsInfo();

var watchListActiveMaintenceEventsDataPointsInfo = getAllWatchListsActiveMaintenanceEventsDataPoints();
var totalWatchListsActiveMaintenanceEventsCount = 0;
var watchListsDataPoints = new HashMap();
watchListsDataPoints = FetchWatchListsDataPoints();

function FetchWatchListsDataPoints(){
     for(var id = 0; id < watchListActiveMaintenceEventsDataPointsInfo.size(); id++){
          var record = watchListActiveMaintenceEventsDataPointsInfo.get(id);
          watchListsDataPoints.put(record.get("dataPointId"),record.get("watchListXid"));
    }
    return  watchListsDataPoints;
}

for (var key in EXTERNAL_POINTS) {
    //get the point value of each context point
    var contextPoint = this[key];
    var wrapper = contextPoint.getDataPointWrapper();

    if (wrapper.enabled) {
         var dataSourceXid = wrapper.dataSourceXid.trim();
         var dataSource = dataSourceServiceClass.get(dataSourceXid);

         //  ************** dataSource level checking **************************
         if(dataSourceXid != null && dataSourceXid.length() > 0){
            if(!alreadyProcessedDataSourceXids.containsKey(dataSourceXid)){
              //get dataSource active maintenance events count
              dsActiveMaintenanceEventsCount = getTotalActiveMaintenanceEventsByDataSourceId(dataSource.id);
              alreadyProcessedDataSourceXids.put(wrapper.dataSourceXid,dsActiveMaintenanceEventsCount);
            } else{ //retrieve existing dsactiveMaintenanceEvent
                if(alreadyProcessedDataSourceXids.containsKey(wrapper.dataSourceXid)){
                    dsActiveMaintenanceEventsCount = alreadyProcessedDataSourceXids.get(wrapper.dataSourceXid);
                }
           }

           if(dsActiveMaintenanceEventsCount > 0){
                LOG.debug("DataSource block: This dataPoint's (" +  wrapper.id + ") dataSource has activeMaintenanceEvent: dataSource xid '" + wrapper.dataSourceXid + "'" + " dataSourceActiveMaintenanceEventsCount= " + dsActiveMaintenanceEventsCount);
           }
         }


         //  ************** DataPoint level checking **************************
         //since dataPoint's dataSource doesn't have activeMtcEvents,check whether dataPoint has activeMaintenanceEvents
         if(dsActiveMaintenanceEventsCount === 0){
            if(!alreadyProcessedDataPointXids.containsKey(wrapper.xid)){
               dpActiveMaintenanceEventsCount  = getTotalActiveMaintenanceEventsByDataPointXid(wrapper.xid);
               alreadyProcessedDataPointXids.put(wrapper.xid,dpActiveMaintenanceEventsCount);
        }else {
             if(alreadyProcessedDataPointXids.containsKey(wrapper.xid)){
                  dpActiveMaintenanceEventsCount = alreadyProcessedDataPointXids.get(wrapper.xid);
             }
         }

             if(dpActiveMaintenanceEventsCount > 0) {
                LOG.debug("DataPoint block: This dataPoints has activeMaintenanceEvent: dataPoint xid '" + wrapper.xid + "' dataPointId " + wrapper.id + "  dpActiveMaintenanceEventsCount= " + dpActiveMaintenanceEventsCount);
                //operations team will add some logic here
         }
         }

         //***************** WatchList level checking for dataPoint activeMaintenanceEvent ****************************
         /*
          1. if dataPoint doesn't have activeMaintenanceEvent at dp level or ds level, then check watchlist level
          2. if any of dataPoints in watchList has activeMaintenanceEvent at dp level, it will not check at watchList level
        */
       if((dsActiveMaintenanceEventsCount === 0) && ((dpActiveMaintenanceEventsCount === 0) )){
             if(watchListsDataPoints.containsKey(wrapper.id)) {
               totalWatchListsActiveMaintenanceEventsCount = 0;
               var dpWatchListXid = watchListsDataPoints.get(wrapper.id);
               if(!alreadyProcessedWatchLists.containsKey(dpWatchListXid) ) {
                    if(dpWatchListXid != null && dpWatchListXid.trim().length() > 0) {
                        totalWatchListsActiveMaintenanceEventsCount = totalWatchListsActiveMaintenanceEventsCount + 1;
                        alreadyProcessedWatchLists.put(dpWatchListXid,1);
                        alreadyProcessedWatchListDataPoints.put(wrapper.id,1);
                        LOG.debug("WatchList block: This WatchList has activeMaintenanceEvent: watchList xid '" + dpWatchListXid + "'"  + " and dataPoint in this watchList is " + wrapper.id + " totalWatchListsActiveMaintenanceEventsCount= " + totalWatchListsActiveMaintenanceEventsCount);
                        //ops team to add some logic as the dataPointid in watchList
                    }
               }else {
                    if(alreadyProcessedWatchLists.containsKey(dpWatchListXid)){
                       LOG.debug("WatchList block: This WatchList has activeMaintenanceEvent: watchList xid '" + dpWatchListXid + "'"  + " and dataPoint in this watchList is " + wrapper.id + " totalWatchListsActiveMaintenanceEventsCount= " + totalWatchListsActiveMaintenanceEventsCount);
                       alreadyProcessedWatchListDataPoints.put(wrapper.id,1);

                       //ops team to add some logic as the dataPointid in watchList
                    }
               }

         }
       }
     }
 }








