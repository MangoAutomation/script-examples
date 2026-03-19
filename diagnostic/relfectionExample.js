//Example access to EventManagerImpl.universalHandlers field (java.util.List)

const EventManager = Java.type('com.serotonin.m2m2.rt.EventManager');
const eventManager = runtimeContext.getBean(EventManager.class);
console.log(eventManager.getClass());
const universalHandlersField = eventManager.getClass().getDeclaredField('universalHandlers'); //Must use getDeclaredField for private fields
console.log(universalHandlersField)
universalHandlersField.setAccessible(true); //make accessible by reflection
console.log(universalHandlersField.get(eventManager)); //get the value of the field on the event manager instance
