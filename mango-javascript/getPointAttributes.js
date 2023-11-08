var Common = Java.type('com.serotonin.m2m2.Common');
var rt = Common.runtimeManager.getDataPoint(test.getDataPointWrapper().getId());
if(rt.getAttributes()['UNRELIABLE']==true){
    print(rt.getAttributes())
}
