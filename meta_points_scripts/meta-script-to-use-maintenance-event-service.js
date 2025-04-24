
//to gain access to standard java objects
var Arrays = Java.type('java.util.Arrays');
var ArrayList = Java.type('java.util.ArrayList');
var Consumer = Java.type('java.util.function.Consumer');

//spring application context
var Common = Java.type('com.serotonin.m2m2.Common');

//DAO
var maintenanceEventDao = Java.type('com.serotonin.m2m2.maintenanceEvents.MaintenanceEventDao');
var daoClass = Common.getBean(maintenanceEventDao.class);

var maintenanceEventModel = Java.type('com.infiniteautomation.mango.rest.latest.model.MaintenanceEventModel');
var eventModelClass = new maintenanceEventModel();

//RQL related libraries
var ASTNode = Java.type('net.jazdw.rql.parser.ASTNode');
var RQLUtils = Java.type('com.infiniteautomation.mango.util.RQLUtils');
var EventInstanceService = Java.type('com.infiniteautomation.mango.spring.service.EventInstanceService');
var eventInstanceServiceClass = Common.getBean(EventInstanceService.class);

//first check whether this Meta data point has any acitve maintenance events, if has return 0
 var metapointActiveMtcEventsCount = 0;
 var pointValueSum = 0;
 var MetaPointXid = 'DP_a620e9ab-8760-4177-8c1a-fecea969652f'
 var isMetaPointEnabled = RuntimeManager.isDataPointEnabled(MetaPointXid);
 
 if (isMetaPointEnabled) { 
        metapointActiveMtcEventsCount = getPointXidActiveMaintenanceEvents(MetaPointXid);
 } else {
      return pointValueSum;
 }

 if(metapointActiveMtcEventsCount > 0)  {
     return pointValueSum;
 } else {
     var activeContextPointCount = 0;
 
     for (var key in EXTERNAL_POINTS) {
      //get the point value of each context point
      var contextPoint = this[key];
      var wrapper = contextPoint.getDataPointWrapper();
     if (wrapper.enabled) {
         
         //check this pointXid has any active MaintenanceEvents
         var sumOfActiveMaintenanceEventsCount = getPointXidActiveMaintenanceEvents(wrapper.xid);
         
         if (sumOfActiveMaintenanceEventsCount !== null && sumOfActiveMaintenanceEventsCount > 0){
             pointValueSum += 0;
         } else {
              pointValueSum += contextPoint.value;
         }
       
        activeContextPointCount += 1;
    }
} 

  if (activeContextPointCount > 0) {
       return pointValueSum;
  } else {
       
  }
}

//Helper functions
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
 
//another helper function
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

//return total
function getTotalCountOfActiveMaintenanceEvents(aList) {
var totalCountOfActiveMaintenanceEvents = 0;
  for(var element = 0; element < aList.size(); element++){
      totalCountOfActiveMaintenanceEvents += aList.get(element);
  }
   return totalCountOfActiveMaintenanceEvents;
}

//function to call for each xid
var HashMap = Java.type('java.util.HashMap');

var maintenanceEventVO = Java.type('com.serotonin.m2m2.maintenanceEvents.MaintenanceEventVO');
var eventVOClass = new maintenanceEventVO();

//RQL related libraries
var ASTNode = Java.type('net.jazdw.rql.parser.ASTNode');
var RQLUtils = Java.type('com.infiniteautomation.mango.util.RQLUtils');
var eventInstance = Java.type('com.infiniteautomation.mango.spring.service.EventInstanceService');
var eventInstanceService = Common.getBean(eventInstance.class);
var subSelectMap = new HashMap();

//function to return the active MaintenanceEvent count linked to pointXids
function getPointXidActiveMaintenanceEvents(pointXid) {
 
var sumOfActiveMaintenanceEventsCount = new ArrayList();
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
        sumOfActiveMaintenanceEventsCount.add(activeEventsCount);
        
        //if(activeEventsCount != null && Number(activeEventsCount) > 0)
               //print("This meta/context point has active maintenance events..")
          }
        });
     
        daoClass.getForDataPoint(pointXid, new MyConsumer());
      return getTotalCountOfActiveMaintenanceEvents(sumOfActiveMaintenanceEventsCount);
}





