/**
 *  Clear all in memory caches, can be used when modifying the database of a cached entity.
 */
const Common = Java.type('com.serotonin.m2m2.Common');
const CachingService = Java.type('com.infiniteautomation.mango.spring.service.CachingService');
const PermissionService = Java.type('com.infiniteautomation.mango.spring.service.PermissionService');

Common.getRuntimeContext()
                .getBeansOfType(CachingService.class)
                .values().stream()
                .forEach(s => s.clearCaches());
