//Example Mango 5.0 access to EventManagerImpl.universalHandlers field (java.util.List)

const Common = Java.type('com.serotonin.m2m2.Common');
const eventManager = Common.eventManager;
console.log(eventManager.getClass());
const universalHandlersField = eventManager.getClass().getDeclaredField('universalHandlers'); //Must use getDeclaredField for private fields
console.log(universalHandlersField)
universalHandlersField.setAccessible(true); //make accessible by reflection
console.log(universalHandlersField.get(eventManager)); //get the value of the field on the event manager instance
