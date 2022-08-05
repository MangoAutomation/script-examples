const Common = Java.type('com.serotonin.m2m2.Common');
const dataPoints = services.dataPointService.buildQuery().query();
const pointValueDao = Common.getBean(Java.type('com.serotonin.m2m2.db.dao.PointValueDao'));

const startTimePeriodType = 'MONTHS';
const startTimePeriods = 1;
const msBack = Common.getMillis(Common.TIME_PERIOD_CODES.getId(startTimePeriodType), startTimePeriods);

//Compute the time in the past to start from
const now = new Date().getTime();
const from = now - msBack;
const to = now;
for(const point of dataPoints) {
   print(point.getName());    
   const pointValues = pointValueDao.getPointValuesBetween(point, from, to);
   print(pointValues);
}

