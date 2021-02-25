/**
 * Creates a number of data points, each with a set of tags and inserts them into the database.
 */

// number of points to create
const count = 100_000;
const tagsPerPoint = 10;
const valuesPerTag = 10;

// template point's XID
const dataPointTemplateXid = 'DP_104502e0-c534-43d2-8c70-5bf1902a607c';

// import classes
const dataPointService = services.dataPointService;
const dataPointTemplate = dataPointService.get(dataPointTemplateXid);

const tags = {};
for (let i = 0; i < tagsPerPoint; i++) {
    const tagValues = [];
    for (let j = 0; j < valuesPerTag; j++) {
        tagValues.push(`key_${i}_value_${j}`);
    }
    tags[`key_${i}`] = tagValues;
}

// copy the template point, save it, and add to our list of published points
for (let i = 0; i < count; i++) {
    const copy = dataPointTemplate.copy();
    copy.setId(-1);
    copy.setXid(null);
    copy.setName(`Point ${i}`);

    const pointTags = {};
    for (const [key, values] of Object.entries(tags)) {
        pointTags[key] = values[Math.round(Math.random() * (values.length - 1))];
    }
    copy.setTags(pointTags);

    dataPointService.insert(copy);
}
