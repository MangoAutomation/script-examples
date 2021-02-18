/*
*  Generate some historical data on one or more Numeric data points located by XID
*/
const Common = Java.type('com.serotonin.m2m2.Common');
const PointValueTime = Java.type('com.serotonin.m2m2.rt.dataImage.PointValueTime');
const NumericValue = Java.type('com.serotonin.m2m2.rt.dataImage.types.NumericValue');

const xids = ['DP_NO_CHANGE_1', 'DP_NO_CHANGE_2', 'DP_NO_CHANGE_3', 'DP_NO_CHANGE_4'];
//Generate history forward from this time in the past
const startTimePeriodType = 'MINUTES';
const startTimePeriods = 30;
const msBack = Common.getMillis(Common.TIME_PERIOD_CODES.getId(startTimePeriodType), startTimePeriods);
const now = new Date().getTime();
const startDate = new Date(now - msBack);
const startEpoch = startDate.getTime();

//Generate values at this period
const genTimePeriodType = 'SECONDS';
const genTimePeriods = 5;
const genPeriod = Common.getMillis(Common.TIME_PERIOD_CODES.getId(genTimePeriodType), genTimePeriods);

print('Generating data from ' + startDate);

services.dataPointService.buildQuery()
    .in('xid', xids)
    .query((dp) => {
        const rt = Common.runtimeManager.getDataPoint(dp.getId());
        let count = 0;
        let time = startEpoch;
        const valueToSet = 4000.0;
        while(time <= now) {
            rt.setPointValue(new PointValueTime(new NumericValue(valueToSet), time), null);
            time += genPeriod;   
            count++;
        }
        print('Generated ' + count + ' samples for ' + dp.getXid());
    });
