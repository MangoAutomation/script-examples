//spring application context
var Common = Java.type('com.serotonin.m2m2.Common');
var ArrayList = Java.type('java.util.ArrayList');
var Consumer = Java.type('java.util.function.Consumer');

//DAO
var maintenanceEventDao = Java.type('com.serotonin.m2m2.maintenanceEvents.MaintenanceEventDao');
var daoClass = Common.getBean(maintenanceEventDao.class);
    
var Arrays = Java.type('java.util.Arrays');

var maintenanceEventModel = Java.type('com.infiniteautomation.mango.rest.latest.model.MaintenanceEventModel');
var eventModelClass = new maintenanceEventModel();

//RQL libraries
var ASTNode = Java.type('net.jazdw.rql.parser.ASTNode');
var RQLUtils = Java.type('com.infiniteautomation.mango.util.RQLUtils');
var EventInstanceService = Java.type('com.infiniteautomation.mango.spring.service.EventInstanceService');
var eventInstanceServiceClass = Common.getBean(EventInstanceService.class);

var pointValueSum = 0;
//first check whether this Meta data point has any acitve maintenance events, if has return 0
 var metapointActiveMtcEventsCount = 0;
 var MetaPointXid = 'DP_a620e9ab-8760-4177-8c1a-fecea969652f'
 var isMetaPointEnabled = RuntimeManager.isDataPointEnabled(MetaPointXid);
  //print(isEnabled);
 if (isMetaPointEnabled) { 
        metapointActiveMtcEventsCount = getPointXidActiveMaintenanceEvents('DP_a620e9ab-8760-4177-8c1a-fecea969652f');
 } else {
     print("Metapoint disabled");
     return pointValueSum;
 }
//print("This Meta point has MaintenanceEvents:  Count is....", metapointActiveMtcEventsCount);
 
 if(metapointActiveMtcEventsCount > 0)  {
     return pointValueSum;
 } else {
    // var pointValueSum = 0;
     var activeContextPointCount = 0;
 
     for (var key in EXTERNAL_POINTS) {
      //get the point value of each context point
      var contextPoint = this[key];
      
       //print(contextPoint);
      var wrapper = contextPoint.getDataPointWrapper();
      print('context point Xid ' + wrapper.xid + "context point value " + contextPoint.value);
     // print(wrapper.extendedName); // print(wrapper.value);
      //print('Current Context Point: id=' + wrapper.id + ' || pointXid= ' + wrapper.xid + '|| pointName= ' + wrapper.extendedName);
        
     if (wrapper.enabled) {
         
         //check this pointXid has any active MaintenanceEvents
         var sumOfActiveMaintenanceEventsCount = getPointXidActiveMaintenanceEvents(wrapper.xid);
         print("Active Maintenance Events Count for pointXid " + wrapper.xid + ' are ', sumOfActiveMaintenanceEventsCount);
         
         if (sumOfActiveMaintenanceEventsCount !== null && sumOfActiveMaintenanceEventsCount > 0){
             //contextPoint.PointValue = 0;
             pointValueSum += 0;
            // print("entered..",contextPoint.value);
         } else {
              pointValueSum += contextPoint.value;
         }
           
       // pointValueSum += contextPoint.value;
        activeContextPointCount += 1;
    }
    
    print('pointValueSum=' + pointValueSum + '  ' +  'activeContextPoint ' + activeContextPointCount);
    print(' ');
    //Accessing a single data point tag by name
    //print('Accessing a single tag: deviceID: ' + wrapper.tags.deviceId);
} 

  if (activeContextPointCount > 0) {
       // print('Sum of all ENABLED context points: ' + pointValueSum);
       return pointValueSum;
  } else {
       //return 0;
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
  // if(xids.isEmpty()) { model.setDataPoints(null);}  //else { model.setDataPoints(xids); }
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
var eventType = 'MAINTENANCE';
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
 
//print("Entered getPointXidActiveMaintenanceEvents", pointXid);
var sumOfActiveMaintenanceEventsCount = new ArrayList();

//var finalCount = 0;
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
        //print("pointXid....", pointXid);
        //print("model xid= ", model.xid + "    model id= " +  model.id);
        var astNodeInitial = new ASTNode("eq", "typeName", 'MAINTENANCE');
        var rql = RQLUtils.addAndRestriction(astNodeInitial, new ASTNode("eq", "rtnTs", null));
            rql = RQLUtils.addAndRestriction(rql, new ASTNode("eq", "rtnApplicable", "Y"));
            rql = RQLUtils.addAndRestriction(rql, new ASTNode("in", "typeRef1", model.id));
        // print(rql);    
        activeEventsCount = eventInstanceServiceClass.customizedCount(rql);
        //print("activeEventsCount....",activeEventsCount);
        sumOfActiveMaintenanceEventsCount.add(activeEventsCount);
         //}
        //print("activeEventsCount..",activeEventsCount);
        //print("Active maintenance events count for this Event xid" , model.xid + " are: "+ JSON.stringify(activeEventsCount));
        
        if(activeEventsCount != null && Number(activeEventsCount) > 0)
               print("This meta/context point has active maintenance events..")
          }
        });
     
      //print("before calling MyConsumer", pointXid);
      daoClass.getForDataPoint(pointXid, new MyConsumer());
       //print("Called  MyConsumer", pointXid);
      // print("final Count..",finalCount);
      //return activeEventsCount;
      return getTotalCountOfActiveMaintenanceEvents(sumOfActiveMaintenanceEventsCount);
    // map.put(pointXid,models);
    //return map.size();
}





