//Confirm that the current value of all points matches the data type

const RuntimeManager = Java.type('com.serotonin.m2m2.rt.RuntimeManager');
const runtimeManager = runtimeContext.getBean(RuntimeManager.class);

for(const pointRT of runtimeManager.getRunningDataPoints()) {
    const pvt = pointRT.getPointValue();
    if(pvt == null) continue; // point has no value yet
    if(pvt.getValue().getDataType() != pointRT.getVO().getPointLocator().getDataType()) {
        console.log("Mismatch on point " + pointRT.getVO().getXid());
    }
}
