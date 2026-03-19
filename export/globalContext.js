/**
 * Example to show how to use this script with the global shared memory
 * 
 * On first run this will log 'Lock Exists' once, one next runs it will log that 2x
 * 
 */
 
 //Get a random logger to use so we can see the task in the logs
 const logger = org.slf4j.LoggerFactory.getLogger('com.infiniteautomation.mango.spring.script.bindings.LogBinding');
 const addTask = true;
 const removeTasks = false;
 const lockName = 'sharedLock';
 const tasksName = 'sharedTasks';
 const globalCounterName = 'taskIds';
 let counter;
 
 if(hasBinding(lockName)) {
     console.log('Lock exists');
 }
 
 if(!hasBinding(globalCounterName)) {
     counter = 0;
     addBinding(globalCounterName, counter);
 }else if(addTask) {
     counter = getBinding(globalCounterName);
     counter++;
     addBinding(globalCounterName, counter);
 }else {
     counter = getBinding(globalCounterName);
 }
 console.log('Current task id ' + counter);
 
 const lock = new java.util.concurrent.locks.ReentrantReadWriteLock(); 
 
 addBinding(lockName, lock);

  if(hasBinding(lockName)) {
     console.log('Lock exists');
 }
 
 //Set a timer task to run for every 30s until we stop it via the shared state monitor
 if(addTask) {
     const interval = 5000;
     const timeoutTask = setInterval(() => {
         logger.info("Running timer task " + counter);
         try {
             const localLock = getBinding(lockName);
             localLock.writeLock().lock();
             try {
                 //Sleep to hold the lock
                 java.lang.Thread.sleep(interval);
                 logger.info("Done waiting in timer task " + counter);
             }finally {
                 localLock.writeLock().unlock();
             }
         }catch(error) {
             logger.error(error);
         }
     }, interval);
     let tasks;
     if(hasBinding(tasksName)) {
         tasks = getBinding(tasksName);
     }else {
         tasks = [];
     }
     tasks.push(timeoutTask)
     addBinding(tasksName, tasks);
     console.log('Added task')
 }
 if(removeTasks) {
    const tasks = getBinding(tasksName);
    if(tasks) {
        tasks.forEach(function(task, index) {
            clearInterval(task)
            console.log('Stopped task')
        });
    }
    //Delete the binding, we are done
    removeBinding(tasksName);
 }
 
 