/**
 * Script to modify the column of a Mango table in the database
 */
const Common = Java.type('com.serotonin.m2m2.Common');
const DSL = Java.type('org.jooq.impl.DSL');
const RoleInheritance = Java.type('com.infiniteautomation.mango.db.tables.RoleInheritance');
const create = DSL.using(Common.databaseProxy.getConfig());
create.alterTable(RoleInheritance.ROLE_INHERITANCE)
    .alterColumn(DSL.field('roleId'))
    .setDefault('null').execute();
