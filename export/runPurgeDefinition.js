/**
 * This script will execute a purge definition from the module registry.
 *
 * NOTE: Requires the Access module to be installed (MotionFilePurgeDefinition).
 * Replace the purge definition class with the one you want to run.
 *
 * Fixed for Mango 5.7+:
 *  - ModuleRegistry blocked by Graal.js sandbox → runtimeContext.getBean()
 *  - Common.timer removed → ZonedDateTime.now() or runtimeContext.getBean(AbstractTimer.class).getTimeSource().millis()
 */
const PurgeDefinitionClass = Java.type('com.infiniteautomation.access.MotionFilePurgeDefinition');

try {
    const purgeDefinition = runtimeContext.getBean(PurgeDefinitionClass.class);
    const ZonedDateTime = Java.type('java.time.ZonedDateTime');
    purgeDefinition.execute(ZonedDateTime.now());
    log.info('Ran purge');
}catch(e) {
    log.error('Script failed', e);
    console.log('Script failed: ' + (e.message || e));
}
