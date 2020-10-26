const JavaString = Java.type('java.lang.String');
const Files = Java.type('java.nio.file.Files');

const DataPointTagsDao = Java.type('com.serotonin.m2m2.db.dao.DataPointTagsDao');
const Common = Java.type('com.serotonin.m2m2.Common');

function readJson(fileStore, filePath) {
    const path = services.fileStoreService.getPathForRead(fileStore, filePath);
    const fileString = new JavaString(Files.readAllBytes(path), 'UTF-8');
    return JSON.parse(fileString);
}

function readCsv(fileStore, filePath) {
    const path = services.fileStoreService.getPathForRead(fileStore, filePath);
    const lines = Array.from(Files.readAllLines(path));
    const header = lines.shift().split(',');
    for (let i = 0; i < lines.length; i++) {
        const row = lines[i].split(',');
        const data = lines[i] = {};
        for (let j = 0; j < row.length; j++) {
            data[header[j]] = row[j];
        }
    }
    return lines;
}

function printJson(jsonData, filename = 'configuration.json') {
    const newJsonData = JSON.stringify(jsonData, null, 2);
    response.setContentType('application/json');
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    print(newJsonData);
}

function getTagValues(key, restrictions = {}) {
    const dataPointTagsDao = Common.getBean(DataPointTagsDao);
    const user = Common.getUser();

    const valueSet = dataPointTagsDao.getTagValuesForKey(key, restrictions, user);
    return [...valueSet];
}

function groupBy(array, key) {
    return array.reduce((map, item) => {
        const keyValue = item[key];
        if (!map.has(keyValue)) map.set(keyValue, []);
        map.get(keyValue).push(item);
        return map;
    }, new Map());
}