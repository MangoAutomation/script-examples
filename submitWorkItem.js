/**
 * Example to submit work to the medium priority thread pool
 */
const Common = Java.type('com.serotonin.m2m2.Common');
const WorkItem = Java.extend(Java.type('com.serotonin.m2m2.rt.maint.work.WorkItem'));

const HIGH_PRIORITY = 1;
const MEDIUM_PRIORITY = 2;
const LOW_PRIORITY = 3;

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
    Common.backgroundProcessing.addWorkItem(work);
}
