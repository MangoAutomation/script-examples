/*
 * Copyright (C) 2026 Radix IoT LLC. All rights reserved.
 */

/**
 *  Clear all in memory caches, can be used when modifying the database of a cached entity.
 */
const CachingService = Java.type('com.infiniteautomation.mango.spring.service.CachingService');

runtimeContext.getBeansOfType(CachingService.class)
                .values().stream()
                .forEach(s => s.clearCaches(true));
