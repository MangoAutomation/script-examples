/**
 * Prints the class name and write rate of the point value cache proxy.
 */
const Common = Java.type('com.serotonin.m2m2.Common');
print(Common.databaseProxy.getPointValueCacheDao().getClass().getName());

print(Common.databaseProxy.getPointValueCacheDao().getWritesPerSecond());