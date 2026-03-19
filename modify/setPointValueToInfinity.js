const RuntimeManager = Java.type('com.serotonin.m2m2.rt.RuntimeManager');
const PointValueTime = Java.type('com.serotonin.m2m2.rt.dataImage.PointValueTime');
const NumericValue = Java.type('com.serotonin.m2m2.rt.dataImage.types.NumericValue');
const infinity = new NumericValue(Number.POSITIVE_INFINITY);

const runtimeManager = runtimeContext.getBean(RuntimeManager.class);
const pointId = 36;
const rt = runtimeManager.getDataPoint(pointId);
rt.setPointValue(new PointValueTime(infinity, java.lang.System.currentTimeMillis()), null);
