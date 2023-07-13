/*
*  Generate some historical data on one or more Numeric data points located by XID
*/
const Common = Java.type('com.serotonin.m2m2.Common');
const PointValueTime = Java.type('com.serotonin.m2m2.rt.dataImage.PointValueTime');
const NumericValue = Java.type('com.serotonin.m2m2.rt.dataImage.types.NumericValue');

const xids = ['DS_7f6560b9-407a-4ba1-91a1-76e9a29d578d',
              'DP_d331a6e8-3a6b-4e7d-bef1-31b1681ef95a', 
              'DP_cf4ea808-b3f3-4f06-a03f-fa740911a66a', 
              'DP_9cfe27f4-53d1-4b30-9b85-9efb3a4c7086', 
              'DP_93ff9607-f392-4e19-84c5-622ad93a8e33', 
              'DP_54fc5fff-10de-4591-a87d-eae8377074d4', 
              'DP_46910880-07c7-4ba9-a63c-e8a7a4534050', 
              'DP_189c5180-a11a-4a15-b328-aec7d5266bb8'];


//Generate history forward from this time in the past
const startTimePeriodType = 'MONTHS';
const startTimePeriods = 6;
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
        let valueToSet = 0; 
        while(time <= now) {
            valueToSet = (Math.random() * 10);
            rt.setPointValue(new PointValueTime(new NumericValue(valueToSet), time), null);
            //print('Point value: ' + rt.getPointValueAt(time));
            
            time += genPeriod;   
            count++;
        }
        print('Generated ' + count + ' samples for ' + dp.getXid());
    });
