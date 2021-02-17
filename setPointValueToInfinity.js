const Common = Java.type('com.serotonin.m2m2.Common');
const PointValueTime = Java.type('com.serotonin.m2m2.rt.dataImage.PointValueTime');
const NumericValue = Java.type('com.serotonin.m2m2.rt.dataImage.types.NumericValue');
const infinity = new NumericValue(Number.POSITIVE_INFINITY);

const pointId = 36
const rt = Common.runtimeManager.getDataPoint(pointId);
rt.setPointValue(new PointValueTime(infinity, Common.timer.currentTimeMillis()), null);