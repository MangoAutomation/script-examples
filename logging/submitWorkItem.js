/**
 * Example to submit work to the medium priority thread pool
 */
const BackgroundProcessing = Java.type('com.serotonin.m2m2.rt.maint.BackgroundProcessing');
const WorkItem = Java.extend(Java.type('com.serotonin.m2m2.rt.maint.work.WorkItem'));
const WorkItemPriority = Java.type('com.serotonin.m2m2.rt.maint.work.WorkItemPriority');
const backgroundProcessing = runtimeContext.getBean(BackgroundProcessing.class);

const HIGH_PRIORITY = WorkItemPriority.HIGH;
const MEDIUM_PRIORITY = WorkItemPriority.MEDIUM;
const LOW_PRIORITY = WorkItemPriority.LOW;

console.log('Submitting work items');

for(var i=0; i<10; i++) {
    var work = new WorkItem({
        execute: function() {
            log.info('executing ');
        },
        
        getPriority: function() {
            return MEDIUM_PRIORITY;
        },
        
        getDescription: function() {
            return 'Work item ';
        },
        
        rejected: function(reason) { 
            log.error('rejected ');    
        }
    });
    backgroundProcessing.addWorkItem(work);
}
