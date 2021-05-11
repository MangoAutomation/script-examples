/**
 * This script queries the publishers table using jOOQ and deserializes the data column.
 */

const Common = Java.type('com.serotonin.m2m2.Common');
const DSL = Java.type('org.jooq.impl.DSL');
const SerializationHelper = Java.type('com.serotonin.util.SerializationHelper');
const MangoPermission = Java.type('com.infiniteautomation.mango.permission.MangoPermission');

const configuration = Common.databaseProxy.getConfig();
const create = DSL.using(configuration);

const idField = DSL.field('id');
const dataField = DSL.field('data');
const publishersTable = DSL.table('publishers');

const records = create.select(idField, dataField)
    .from(publishersTable)
    .fetch();

for (const record of records) {
    const id = record.get(idField);
    const data = record.get(dataField);

    const publisher = SerializationHelper.readObjectInContextFromArray(data);
    // print(id, publisher.getOverrideReadPermission().getId());
    // print(id, publisher.getOverrideSetPermission().getId());

    publisher.setOverrideReadPermission(new MangoPermission(1));
    publisher.setOverrideSetPermission(new MangoPermission(1));

    const newData = SerializationHelper.writeObjectToArray(publisher);
    // create.update(publishersTable).set(dataField, newData).where(idField.eq(id)).execute();
}
