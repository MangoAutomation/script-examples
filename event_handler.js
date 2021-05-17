/**
 * This script implements com.serotonin.m2m2.rt.event.handlers.EventHandlerInterface
 * Add this script to a "Script" type event handler and choose the Graal.js or Nashorn engine.
 */

/**
 * Called when the Mango event is raised.
 * You must implement this method.
 *
 * @param event
 */
function eventRaised(event) {
    console.log('Raised', event);
}

/**
 * Called when the Mango event is acknowledged (the event may still be active).
 * Supported as of Mango v4.0.0-beta.14, you are not required to implement this method.
 *
 * @param event
 */
function eventAcknowledged(event) {
    console.log('Acknowledged', event);
}

/**
 * Called when the Mango event returns to normal or is deactivated (e.g. on shutdown).
 * You must implement this method.
 *
 * @param event
 */
function eventInactive(event) {
    console.log('Inactive', event);
}
