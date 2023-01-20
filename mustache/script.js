/*
 * Copyright (C) 2023 Radix IoT LLC. All rights reserved.
 */

/*
Requires adding Mustache dependency
<dependency>
    <groupId>com.github.spullara.mustache.java</groupId>
    <artifactId>compiler</artifactId>
    <version>0.9.10</version>
</dependency>
 */

const DefaultMustacheFactory = Java.type('com.github.mustachejava.DefaultMustacheFactory');
const Files = Java.type('java.nio.file.Files');
const StringWriter = Java.type('java.io.StringWriter');
const Common = Java.type('com.serotonin.m2m2.Common');
const MustacheResolver = Java.type('com.github.mustachejava.MustacheResolver');
const ArrayList = Java.type('java.util.ArrayList');

// create a mustache factory that can read templates from the file store
var FileStoreMustacheResolver = Java.extend(MustacheResolver);
const factory = new DefaultMustacheFactory(new FileStoreMustacheResolver({
    getReader: function(resourceName) {
        const template = services.fileStoreService.getPathForRead('default', 'script-examples/mustache/' + resourceName);
        return Files.newBufferedReader(template);
    }
}));

// create a mustache instance from the template
const mustache = factory.compile('template.mustache');

// load data from CSV file
const data = readCsv('default', 'script-examples/mustache/data.csv');
const groupedData = groupByKeys(data, [{
    groupKey: 'site',
    childrenKey: 'dataHalls'
}, {
    groupKey: 'dataHall',
    childrenKey: 'devices'
}]);

// execute template
const writer = new StringWriter();
const templateData = {
    sites: groupedData
};
// convert JavaScript Arrays to Java Lists so mustache can use them
mustache.execute(writer, arraysToLists(templateData));

// setup response headers
response.setContentType('application/json');
response.setHeader('Content-Disposition', 'attachment; filename="configuration.json"');
// output JSON to response body
// print(JSON.stringify(templateData, null, 2));
print(writer.toString());

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

function groupByKey(array, key) {
    const map = array.reduce((map, item) => {
        const keyValue = item[key.groupKey];
        if (!(keyValue in map)) {
            map[keyValue] = {
                [key.groupKey]: keyValue,
                [key.childrenKey]: []
            };
        }
        map[keyValue][key.childrenKey].push(item);
        return map;
    }, {});
    const groups = Object.values(map);

    // find common properties from the children and copy them to the group
    for (const group of groups) {
        const common = findCommonProperties(group[key.childrenKey]);
        Object.assign(group, common);
    }

    return groups;
}

function groupByKeys(data, keys) {
    if (!keys.length) return data;
    const firstKey = keys[0];
    const nextKeys = keys.slice(1);
    const groups = groupByKey(data, firstKey);
    for (const group of groups) {
        group[firstKey.childrenKey] = groupByKeys(group[firstKey.childrenKey], nextKeys);
    }
    return groups;
}

function findCommonProperties(data) {
    if (!data.length) return {};
    return data.reduce((common, item) => {
        for (const [k, v] of Object.entries(common)) {
            if (item[k] !== v) {
                delete common[k];
            }
        }
        return common;
    }, Object.assign({}, data[0]));
}

function arraysToLists(data) {
    if (Array.isArray(data)) {
        const list = new ArrayList();
        for (const v of data) {
            list.add(arraysToLists(v));
        }
        return list;
    } else if (data && typeof data === 'object') {
        for (const [k, v] of Object.entries(data)) {
            data[k] = arraysToLists(v);
        }
    }
    return data;
}
