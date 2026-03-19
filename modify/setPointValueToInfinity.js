const RuntimeManager = Java.type('com.serotonin.m2m2.rt.RuntimeManager');
const AbstractTimer = Java.type('com.serotonin.timer.AbstractTimer');
const PointValueTime = Java.type('com.serotonin.m2m2.rt.dataImage.PointValueTime');
const NumericValue = Java.type('com.serotonin.m2m2.rt.dataImage.types.NumericValue');
const infinity = new NumericValue(Number.POSITIVE_INFINITY);

const runtimeManager = runtimeContext.getBean(RuntimeManager.class);
const timer = runtimeContext.getBean(AbstractTimer.class);
const pointId = 36;
const rt = runtimeManager.getDataPoint(pointId);
rt.setPointValue(new PointValueTime(infinity, timer.getTimeSource().millis()), null);
