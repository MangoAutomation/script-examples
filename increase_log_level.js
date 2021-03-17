/*
 * Copyright (C) 2021 Radix IoT LLC. All rights reserved.
 */

var Common = Java.type('com.serotonin.m2m2.Common');
var LogLevel = Java.type('org.apache.logging.log4j.Level');

Common.configureLoggerLevel('com.serotonin.m2m2.modbus.rt.ModbusDataSourceRT', LogLevel.DEBUG);

// when done you can reset it back to default
// Common.removeLoggerConfig('com.serotonin.m2m2.modbus.rt.ModbusDataSourceRT');