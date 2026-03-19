/**
 * This script will execute a purge definition from the module registry.
 */
 const Common = Java.type('com.serotonin.m2m2.Common');
 const ModuleRegistry = Java.type('com.serotonin.m2m2.module.ModuleRegistry');
 const PurgeDefinitionClass = Java.type('com.infiniteautomation.access.MotionFilePurgeDefinition');
 
 try {
     ModuleRegistry.getDefinition(PurgeDefinitionClass).execute(Common.timer.currentTimeMillis());
     log.info('Ran purge');
 }catch(e) {
     log.error('Script failed', e);
     console.log('Script failed' + e.getMessage());
 }
