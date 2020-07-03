/**
 * This script implements com.serotonin.m2m2.rt.event.handlers.EventHandlerInterface
 * Add this script to a "Script" type event handler and choose the Graal.js or Nashorn engine.
 */

/**
 * Called when the Mango event is raised
 * @param event
 */
function eventRaised(event) {
    console.log(event);
}

/**
 * Called when the Mango event returns to normal or is deactivated (e.g. on shutdown)
 * @param event
 */
function eventInactive(event) {
    console.log(event);
}
