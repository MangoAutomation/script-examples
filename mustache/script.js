/*
 * Copyright (C) 2023 Radix IoT LLC. All rights reserved.
 */

/*
Requires adding Musta
<dependency>
    <groupId>com.github.spullara.mustache.java</groupId>
    <artifactId>compiler</artifactId>
    <version>0.9.10</version>
</dependency>
 */

const DefaultMustacheFactory = Java.type('com.github.mustachejava.DefaultMustacheFactory');
const Files = Java.type('java.nio.file.Files');
const StringWriter = Java.type('java.io.StringWriter');
const Map = Java.type('java.util.Map');
const Common = Java.type('com.serotonin.m2m2.Common');
const MustacheResolver = Java.type('com.github.mustachejava.MustacheResolver');

// get an object mapper
const ObjectMapper = Java.type('com.fasterxml.jackson.databind.ObjectMapper');
const MangoRuntimeContextConfiguration = Java.type('com.infiniteautomation.mango.spring.MangoRuntimeContextConfiguration');
const mapper = Common.getBean(ObjectMapper, MangoRuntimeContextConfiguration.COMMON_OBJECT_MAPPER_NAME);

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

// load parameters from JSON store
const parameters = services.jsonDataService.getDataAtPointer('f32bdeb1-3fc2-447b-8f61-40c0e7ec8045', '');
const parametersMap = mapper.convertValue(parameters, Map);

// execute template
const writer = new StringWriter();
mustache.execute(writer, parametersMap);

response.setContentType('application/json');
response.setHeader('Content-Disposition', 'attachment; filename="configuration.json"');
print(writer.toString());
