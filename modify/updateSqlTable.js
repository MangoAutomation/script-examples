/**
 * Script to modify the column of a Mango table in the database
 */
const DSL = Java.type('org.jooq.impl.DSL');
const RoleInheritance = Java.type('com.infiniteautomation.mango.db.tables.RoleInheritance');
const DatabaseProxy = Java.type('com.serotonin.m2m2.db.DatabaseProxy');
const proxy = runtimeContext.getBean(DatabaseProxy.class);
const create = proxy.getContext();
create.alterTable(RoleInheritance.ROLE_INHERITANCE)
    .alterColumn(DSL.field('roleId'))
    .setDefault('null').execute();
