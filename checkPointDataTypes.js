//Confirm that the current value of all points matches the data type


const Common = Java.type('com.serotonin.m2m2.Common');

for(const pointRT of Common.runtimeManager.getRunningDataPoints()) {
    const pvt = pointRT.getPointValue();
    if(pvt.getValue().getDataType() != pointRT.getVO().getPointLocator().getDataType()) {
        console.log("Mismatch on point " + pointRT.getVO().getXid());
    }
}
