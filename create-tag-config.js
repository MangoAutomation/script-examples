/**
 * Creates a number of data points, each with a set of tags and inserts them into the database.
 */

// number of points to create
const count = 100_000;
const numberOfTagKeys = 10;
const valuesPerTagKey = 10;
const tagsPerPoint = 5;

// template point's XID
const dataPointTemplateXid = 'DP_104502e0-c534-43d2-8c70-5bf1902a607c';

// import classes
const dataPointService = services.dataPointService;
const dataPointTemplate = dataPointService.get(dataPointTemplateXid);

const tags = {};
for (let i = 0; i < numberOfTagKeys; i++) {
    const tagValues = [];
    for (let j = 0; j < valuesPerTagKey; j++) {
        tagValues.push(`key_${i}_value_${j}`);
    }
    tags[`key_${i}`] = tagValues;
}
const tagKeys = Object.keys(tags);

// copy the template point, save it, and add to our list of published points
for (let i = 0; i < count; i++) {
    const copy = dataPointTemplate.copy();
    copy.setId(-1);
    copy.setSeriesId(-1);
    copy.setXid(null);
    copy.setName(`Point ${i}`);

    // randomize the tag keys order, grab the first x
    const randomKeys = tagKeys.sort(() => 0.5 - Math.random()).slice(0, tagsPerPoint);
    const pointTags = {};
    for (const key of randomKeys) {
        const values = tags[key];
        pointTags[key] = values[Math.round(Math.random() * (values.length - 1))];
    }
    copy.setTags(pointTags);

    dataPointService.insert(copy);
}
