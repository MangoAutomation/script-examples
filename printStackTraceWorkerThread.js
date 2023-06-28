/**
 *  Prints stack trace for worker threads for debugging
 */

const Common = Java.type('com.serotonin.m2m2.Common');
const BackgroundProcessingImpl = Java.type('com.serotonin.m2m2.rt.maint.BackgroundProcessingImpl');
const ThreadPoolExecutor = Java.type('java.util.concurrent.ThreadPoolExecutor');
const Worker = Java.type('java.util.concurrent.ThreadPoolExecutor$Worker');

//const fieldToAccess = "lowPriorityService";
const fieldToAccess = "mediumPriorityService";
//const fieldToAccess = "highPriorityService";

const priorityService = BackgroundProcessingImpl.class.getDeclaredField(fieldToAccess);
priorityService.setAccessible(true);
const priorityServiceObject = priorityService.get(Common.backgroundProcessing);

const workers = ThreadPoolExecutor.class.getDeclaredField('workers');
workers.setAccessible(true);
const workersObject = workers.get(priorityServiceObject);

const thread = Worker.class.getDeclaredField('thread');
thread.setAccessible(true);

workersObject.forEach(worker => {
    const threadObject = thread.get(worker);
    for(const line of threadObject.getStackTrace())
        print(line);
    print("--------------------------");
});
