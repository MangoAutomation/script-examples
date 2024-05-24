/*
 * This event handler can be used in conjunction with a "Point value update"
 * detector to log the difference between the point value timestamp from the
 * edge and the actual time the value was received & processed in the cloud.
*/

const Common = Java.type('com.serotonin.m2m2.Common');
const tagNamesToLog = ['site', 'deviceId'];

/*
 * Called when the Mango event is raised.
 * You must implement this method.
 *
 * @param event
 */
function eventRaised(event) {
    try{
        //Confirm this eventType is a data point
        const currEventType = event.getEventType();
        if (currEventType.toString().substring(0,18) === 'DataPointEventType') {
            //Get the event context so we can access the triggering data point
            const context = event.getContext();
            const eventPoint = context.get('point');
            const rt = Common.runtimeManager.getDataPoint(eventPoint.getId());
            //Loop through the list of tags that should be logged with the data point information
            //This can be useful when identifying patterns for publishing delays
            let tagLogs = '';
            tagNamesToLog.forEach(function(tagKey) {
                tagLogs = tagLogs + tagKey + 'Tag: ' + eventPoint.getTags().get(tagKey) + ', '
            });
            
            log.debug('Publisher Delay Check: pointName: {}, pointXid: {}, {} value: {}, valueTimeStamp: {}, currentTimeStamp: {}, publishDelayDelta: {}',eventPoint.getName(), eventPoint.getXid(), tagLogs, rt.getPointValue().getValue(), rt.getPointValue().getTime(), Common.timer.currentTimeMillis(), (Common.timer.currentTimeMillis()-rt.getPointValue().getTime()));
        }
    }
    catch (outerEx) {
        log.error('Publisher Delay Check:Unhandled exception', outerEx);
        return;
    }
}

/*
 * Called when the Mango event is acknowledged (the event may still be active).
 * Supported as of Mango v4.0.0-beta.14, you are not required to implement this method.
 *
 * @param event
 */
function eventAcknowledged(event) {
    //console.log('Acknowledged', event);
}

/*
 * Called when the Mango event returns to normal or is deactivated (e.g. on shutdown).
 * You must implement this method.
 *
 * @param event
 */
function eventInactive(event) {
    //console.log('Inactive', event);
}
