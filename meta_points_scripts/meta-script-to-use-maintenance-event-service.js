
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

function FetchWatchListsDataPoints() {
    for (var id = 0; id < watchListActiveMaintenceEventsDataPointsInfo.size(); id++) {
        var record = watchListActiveMaintenceEventsDataPointsInfo.get(id);
        watchListsDataPoints.put(record.get("dataPointId"), record.get("watchListXid"));
    }
    return watchListsDataPoints;
}

for (var key in EXTERNAL_POINTS) {
    //get the point value of each context point
    var contextPoint = this[key];
    var wrapper = contextPoint.getDataPointWrapper();

    if (wrapper.enabled) {
        var dataSourceXid = wrapper.dataSourceXid.trim();
        var dataSource = dataSourceServiceClass.get(dataSourceXid);

        //  ************** dataSource level checking **************************
        if (dataSourceXid != null && dataSourceXid.length() > 0) {
            if (!alreadyProcessedDataSourceXids.containsKey(dataSourceXid)) {
                //get dataSource active maintenance events count
                dsActiveMaintenanceEventsCount = getTotalActiveMaintenanceEventsByDataSourceId(dataSource.id);
                alreadyProcessedDataSourceXids.put(wrapper.dataSourceXid, dsActiveMaintenanceEventsCount);
            } else { //retrieve existing dsactiveMaintenanceEvent
                if (alreadyProcessedDataSourceXids.containsKey(wrapper.dataSourceXid)) {
                    dsActiveMaintenanceEventsCount = alreadyProcessedDataSourceXids.get(wrapper.dataSourceXid);
                }
            }
            if (dsActiveMaintenanceEventsCount > 0) {
                LOG.debug("Data Source Check: Data source for dataPointId (" + wrapper.id + ") has an active Maintenance Event: dataSource Xid '" + wrapper.dataSourceXid + "'" + " dataSourceActiveMaintenanceEventsCount = " + dsActiveMaintenanceEventsCount);
                //Add logic here to be executed when the data source of the current context point has an active Maintenance Event

            }
        }

        //  ************** DataPoint level checking **************************
        //since dataPoint's dataSource doesn't have activeMtcEvents,check whether dataPoint has activeMaintenanceEvents
        if (dsActiveMaintenanceEventsCount === 0) {
            if (!alreadyProcessedDataPointXids.containsKey(wrapper.xid)) {
                dpActiveMaintenanceEventsCount = getTotalActiveMaintenanceEventsByDataPointXid(wrapper.xid);
                alreadyProcessedDataPointXids.put(wrapper.xid, dpActiveMaintenanceEventsCount);
            } else {
                if (alreadyProcessedDataPointXids.containsKey(wrapper.xid)) {
                    dpActiveMaintenanceEventsCount = alreadyProcessedDataPointXids.get(wrapper.xid);
                }
            }

            if (dpActiveMaintenanceEventsCount > 0) {
                LOG.debug("Data Point Check: dataPointId (" + wrapper.id + ") has an active Maintenance Event: dataPoint Xid '" + wrapper.xid + "  dpActiveMaintenanceEventsCount= " + dpActiveMaintenanceEventsCount);
                //Add logic here to be executed when the current context point has an active Maintenance Event linked to the data point itself (but not the data source)

            }
        }

        //***************** WatchList level checking for dataPoint activeMaintenanceEvent ****************************
        /*
         1. if dataPoint doesn't have activeMaintenanceEvent at dp level or ds level, then check watchlist level
         2. if any of dataPoints in watchList has activeMaintenanceEvent at dp level, it will not check at watchList level
       */
        if ((dsActiveMaintenanceEventsCount === 0) && ((dpActiveMaintenanceEventsCount === 0))) {
            totalWatchListsActiveMaintenanceEventsCount = 0;
            if (watchListsDataPoints.containsKey(wrapper.id)) {
                var dpWatchListXid = watchListsDataPoints.get(wrapper.id);
                if (!alreadyProcessedWatchLists.containsKey(dpWatchListXid)) {
                    if (dpWatchListXid != null && dpWatchListXid.trim().length() > 0) {
                        totalWatchListsActiveMaintenanceEventsCount = totalWatchListsActiveMaintenanceEventsCount + 1;
                        alreadyProcessedWatchLists.put(dpWatchListXid, 1);
                        alreadyProcessedWatchListDataPoints.put(wrapper.id, 1);
                        LOG.debug("Watch List check: WatchList Xid '" + dpWatchListXid + "' has an active Maintenance Event and dataPointId (" + wrapper.id + ") is in this Watch List: totalWatchListsActiveMaintenanceEventsCount = " + totalWatchListsActiveMaintenanceEventsCount);
                        //Add logic here to be executed when the current context point is in a Watch List and that Watch List has an active Maintenance Event
                    }
                } else {
                    if (alreadyProcessedWatchLists.containsKey(dpWatchListXid)) {
                        LOG.debug("Watch List check: WatchList Xid '" + dpWatchListXid + "' has an active Maintenance Event and dataPointId (" + wrapper.id + ") is in this Watch List: totalWatchListsActiveMaintenanceEventsCount = " + totalWatchListsActiveMaintenanceEventsCount);
                        alreadyProcessedWatchListDataPoints.put(wrapper.id, 1);
                        //Add logic here to be executed when the current context point is in a Watch List and that Watch List has an active Maintenance Event
                    }
                }
            }
        }

        if ((dsActiveMaintenanceEventsCount + dpActiveMaintenanceEventsCount + totalWatchListsActiveMaintenanceEventsCount) > 0) {
            //Add logic here to be executed if the current context point has any type of active Maintenance Event linked to it

        }
    }
}
