/**
 * Script to investigate what points are actually running on a publisher 
 * 
 * 
 */
const publisherXid = 'PUB_bad11678-4891-4080-aa86-8c5fadd4f790';
const Common = Java.type('com.serotonin.m2m2.Common');
const publisherService = services.publisherService;

//get the publisher from the database
const publisherVO = publisherService.get(publisherXid);

//Get the running publisher
const publisherRT = Common.runtimeManager.getRunningPublisher(publisherVO.getId());

//Use reflection to expose points accessor
const Consumer = Java.type('java.util.function.Consumer');
const PublisherRT = Java.type('com.serotonin.m2m2.rt.publish.PublisherRT');
const streamPoints = PublisherRT.class.getDeclaredMethod('streamPoints');
streamPoints.setAccessible(true);

const pointStream = streamPoints.invoke(publisherRT);
try {
    pointStream.forEach((pp) => {
        console.log(pp.getVo().getXid() + ' -> ' + pp.getLifecycleState());
    });
}finally {
  pointStream.close();    
}

//Get all the published points in the runtime manager

const RuntimeManagerImpl = Java.type('com.serotonin.m2m2.rt.RuntimeManagerImpl');
const publishedPointCacheField = RuntimeManagerImpl.class.getDeclaredField('publishedPointCache');
const runtimeManager = Common.runtimeManager;
publishedPointCacheField.setAccessible(true);
publishedPointCacheField.get(runtimeManager).keySet();