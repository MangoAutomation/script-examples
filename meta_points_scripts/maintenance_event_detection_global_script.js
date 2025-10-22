//Spring application context
var Common = Java.type('com.serotonin.m2m2.Common');

//Needed to gain access to standard java objects
 var Arrays = Java.type('java.util.Arrays');
var ArrayList = Java.type('java.util.ArrayList');
var Consumer = Java.type('java.util.function.Consumer');
var HashMap = Java.type('java.util.HashMap');
var subSelectMap = new HashMap();

//RQL related libraries
var ASTNode = Java.type('net.jazdw.rql.parser.ASTNode');
var RQLUtils = Java.type('com.infiniteautomation.mango.util.RQLUtils');

//Mango classes
var maintenanceEventDao = Java.type('com.serotonin.m2m2.maintenanceEvents.MaintenanceEventDao');
var daoClass = Common.getBean(maintenanceEventDao.class);

var maintenanceEventModel = Java.type('com.infiniteautomation.mango.rest.latest.model.MaintenanceEventModel');
//var eventModelClass = new maintenanceEventModel();

var maintenanceEventVO = Java.type('com.serotonin.m2m2.maintenanceEvents.MaintenanceEventVO');
var eventVOClass = new maintenanceEventVO();

var EventInstanceService = Java.type('com.infiniteautomation.mango.spring.service.EventInstanceService');
var eventInstanceServiceClass = Common.getBean(EventInstanceService.class);

//Instance of WatchListServiceClass
var watchListService = Java.type('com.infiniteautomation.mango.spring.service.WatchListService');
var watchListServiceClass = Common.getBean(watchListService.class);

//to store wahtchListId's
var watchListXidsList = new ArrayList();

//Helper function
function fillDataPoints(model){
    var xids = new ArrayList();
    var addConsumer =  Java.extend(Consumer, {
     accept: function(xid) {
      xids.add(xid);
    }
  });

  daoClass.getPointXids(model.getId(), new addConsumer());
  model.setDataPoints(xids.isEmpty() ? null : xids);
}

//Helper function
function fillDataSources(model){
  var dsXids = new ArrayList();
  var addConsumerDataSources =  Java.extend(Consumer, {
  accept: function(xid) {
      dsXids.add(xid);
  }
});
daoClass.getSourceXids(model.getId(), new addConsumerDataSources());
model.setDataSources(dsXids.isEmpty() ? null : dsXids);
}

//Returns total number of Active Maintenance Events from an array list
function countActiveMaintenanceEventsByArrayList(aList) {
var totalCountOfActiveMaintenanceEvents = 0;
  for(var element = 0; element < aList.size(); element++){
      totalCountOfActiveMaintenanceEvents += aList.get(element);
  }
   return totalCountOfActiveMaintenanceEvents;
}

function fillDataSourcesForTesting(model){
   var dsXids = new ArrayList();
  var addConsumerDataSources =  Java.extend(Consumer, {
  accept: function(xid) {
       dsXids.add(xid);
  }
});
daoClass.getSourceXids(model.getId(), new addConsumerDataSources());
model.setDataSources(dsXids.isEmpty() ? null : dsXids);
}

//Function to call for each data point xid
function getTotalActiveMaintenanceEventsByDataPointXid(pointXid) {
    var activeMaintenanceEventList = new ArrayList();
    var activeEventsCount = null;
    //create a map to store results
    var HashMap = Java.type('java.util.HashMap');
    var map = new HashMap();
    var models = new ArrayList();

    var MyConsumer = Java.extend(Consumer, {
        accept: function(vo) {
          var model = new maintenanceEventModel(vo);
          fillDataPoints(model);
          fillDataSources(model);
          models.add(model);

          var astNodeInitial = new ASTNode("eq", "typeName", 'MAINTENANCE');
          var rql = RQLUtils.addAndRestriction(astNodeInitial, new ASTNode("eq", "rtnTs", null));
          rql = RQLUtils.addAndRestriction(rql, new ASTNode("eq", "rtnApplicable", "Y"));
          rql = RQLUtils.addAndRestriction(rql, new ASTNode("in", "typeRef1", model.id));

          activeEventsCount = eventInstanceServiceClass.customizedCount(rql);
          activeMaintenanceEventList.add(activeEventsCount);
        }

      }
    );

    daoClass.getForDataPoint(pointXid, new MyConsumer());
    return countActiveMaintenanceEventsByArrayList(activeMaintenanceEventList);
}

function getTotalActiveMaintenanceEventsByDataSourceId(dsId) {
    var activeMaintenanceEventList = new ArrayList();
    var activeEventsCount = null;
    //create a map to store results
    var HashMap = Java.type('java.util.HashMap');
    var map = new HashMap();
    var models = new ArrayList();
    //print("dsXid..ramana ",dsXid );
    var varConsumer = Java.extend(Consumer, {
        accept: function(vo) {
         var model = new maintenanceEventModel(vo);
        //fillDataPoints(model);
        fillDataSourcesForTesting(model);
        models.add(model);

        var astNodeInitial = new ASTNode("eq", "typeName", 'MAINTENANCE');
        var rql = RQLUtils.addAndRestriction(astNodeInitial, new ASTNode("eq", "rtnTs", null));
        rql = RQLUtils.addAndRestriction(rql, new ASTNode("eq", "rtnApplicable", "Y"));
        rql = RQLUtils.addAndRestriction(rql, new ASTNode("in", "typeRef1", model.id));

        activeEventsCount = eventInstanceServiceClass.customizedCount(rql);
        activeMaintenanceEventList.add(activeEventsCount);

       }
    });

      try {
             daoClass.getForDataSource(dsId, new varConsumer());
             return countActiveMaintenanceEventsByArrayList(activeMaintenanceEventList);

    } catch (e) {
         e.printStackTrace();
    }
}

//Loop through all mtc events and gets the count
function getWatchListMtcEventsCount(){
    var maintenanceEventDao = Java.type('com.serotonin.m2m2.maintenanceEvents.MaintenanceEventDao');
    var maintenanceEventDaoInstance = maintenanceEventDao.getInstance();
    //grab all active maintenance events and then filter by watchList
    var allMtcEvents = maintenanceEventDaoInstance.getAll();

    var watchListMtcEventsCount = 0;
    var totalWatchListMtcEventsCount = 0;

    for each (var evt in allMtcEvents){
         var mtcEventModel = new maintenanceEventModel(evt);

        if(mtcEventModel.getMaintenanceType() == "WATCHLIST"){
             var astNodeInitial = new ASTNode("eq", "typeName", 'MAINTENANCE');
             var rql = RQLUtils.addAndRestriction(astNodeInitial, new ASTNode("eq", "rtnTs", null));
             rql = RQLUtils.addAndRestriction(rql, new ASTNode("eq", "rtnApplicable", "Y"));
             rql = RQLUtils.addAndRestriction(rql, new ASTNode("in", "typeRef1", mtcEventModel.id));

             watchListMtcEventsCount = eventInstanceServiceClass.customizedCount(rql);
             totalWatchListMtcEventsCount += watchListMtcEventsCount;

              //this global list stores WatchList eventtype Xids
             watchListXidsList.add(mtcEventModel.getWatchListXid());

             return totalWatchListMtcEventsCount; //can return watchListIdList count also
         }
      }
}

function getAllWatchListEventsDataPoints(){
    var watchListService = Java.type('com.infiniteautomation.mango.spring.service.WatchListService');
    var watchListServiceClass = Common.getBean(watchListService.class);
    var watchListVo = Java.type('com.serotonin.m2m2.watchlist.WatchListVO');

    //loop through global watchListXidsList
     for each (var xid in watchListXidsList){

         var watchListVO = watchListServiceClass.get(xid);

         //make sure type is whether STATIC,TAGS,QUERY
         var  watchListType = watchListVO.getType();

          if(watchListType == "STATIC") {
             watchListServiceClass.getDataPoints(xid,new watchListDataPointsConsumer());
           }
         else if(watchListType == "TAGS"){
             print("Currently Mango doesn't support TAGS WatchList type...",watchListVO.getType);
         }
         else if(watchListType == "QUERY"){
            print("Currently Mango doesn't support QUERY WatchList type...",watchListVO.getType);
         }
      }

    return dpList;
}

//This is globalList which all dataPoints stored in watchList
var dpList = new ArrayList();

var watchListDataPointsConsumer = Java.extend(Consumer, {
    accept:function(dpId){
        dpList.add(dpId.id);
   }
});


