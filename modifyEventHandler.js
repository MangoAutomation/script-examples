/**
 * This script will get an event handler, modify it's settings and update it.  Without using
 * to console.log or print() this will run until finished and can be used to 
 * update a very large event handler with hundreds of thousands of event types on it.
 */
 const Common = Java.type('com.serotonin.m2m2.Common');
 const ValidationException = Java.type('com.infiniteautomation.mango.util.exception.ValidationException');

 const eventHandlerService = services.eventHandlerService;
 
 const handlerXid = 'ATC_DEM_SALESFORCE_EVENT_HANDLER';
 
 try {
     const handler = eventHandlerService.get(handlerXid);
     log.info('Retrieved event handler');
     
     //Modify it to load a js script from the default file store.
     handler.setScript("load('filestore://default/myEventHandler.js');");
     try {
         eventHandlerService.update(handlerXid, handler);
     }catch(error) {
         log.error('save failed', error);
         if(error instanceof ValidationException) {
            for (i = 0; i < error.getValidationResult().getMessages().length; i++) {
                var msg = error.getValidationResult().getMessages()[i];
                console.log(msg.getContextKey() + ' --> ' + msg.getContextualMessage().translate(Common.getTranslations()));
            }
         }
     }
     log.info('Saved event handler');
 }catch(e) {
     log.error('Script failed', e);
     console.log('Script failed' + e.getMessage());
 }
 