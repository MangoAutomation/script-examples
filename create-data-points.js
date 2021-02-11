/**
 * This script clones a template data point and adds the data points to a publisher.
 */

// number of points to create
const count = 1000;
// template point's XID
const dataPointTemplateXid = 'DP_41d00264-dc35-4d5b-bd7b-0f8da2296210';
// The publisher XID to add all of the data points to (this script assumes it is a Persistent TCP publisher)
const publisherXid = 'DP_a714f2fb-af4e-4810-aa83-24f8e8789e72';

// import classes
const dataPointService = services.dataPointService;
const publisherService = services.publisherService;
const PersistentPointVO = Java.type('com.serotonin.m2m2.persistent.pub.PersistentPointVO');
const ArrayList = Java.type('java.util.ArrayList');

const dataPointTemplate = dataPointService.get(dataPointTemplateXid);
const publishedPoints = new ArrayList();

// copy the template point, save it, and add to our list of published points
for (let i = 0; i < count; i++) {
    const copy = dataPointTemplate.copy();
    copy.setId(-1);
    copy.setXid(null);
    copy.setName(`Point ${i}`);
    dataPointService.insert(copy);
    
    // change this if you want to use a different publisher type
    const publishedPoint = new PersistentPointVO();
    publishedPoint.setDataPointId(copy.getId());
    publishedPoints.add(publishedPoint);
}

// get the publisher, add the points to it, then save it
const publisher = publisherService.get(publisherXid);
publisher.setPoints(publishedPoints);
publisherService.update(publisher.getId(), publisher);
