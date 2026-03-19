const Common = Java.type('com.serotonin.m2m2.Common');
print(Common.databaseProxy.getPointValueCacheDao().getClass().getName());

print(Common.databaseProxy.getPointValueCacheDao().getWritesPerSecond());