/*
 * Copyright (C) 2022 Radix IoT LLC. All rights reserved.
 */

const Common = Java.type('com.serotonin.m2m2.Common');
const PointValueDao = Java.type('com.serotonin.m2m2.db.dao.PointValueDao');
const IasTsdbImpl = Java.type('com.infiniteautomation.tsdb.impl.IasTsdbImpl');


const pointValueDao = Common.getBean(PointValueDao);
const db = pointValueDao.getDb();

const lockField = IasTsdbImpl.class.getDeclaredField('lock');
lockField.setAccessible(true);
const lock = lockField.get(db);

print(lock);