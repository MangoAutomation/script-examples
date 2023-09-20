/**
 * This script will get an event handler, modify it's settings and update it.  Without using
 * to console.log or print() this will run until finished and can be used to 
 * update a very large event handler with hundreds of thousands of event types on it.
 */
 const Common = Java.type('com.serotonin.m2m2.Common');
 const ValidationException = Java.type('com.infiniteautomation.mango.util.exception.ValidationException');
 const PermissionHolder = Java.type('com.serotonin.m2m2.vo.permission.PermissionHolder');
 const eventHandlerService = services.eventHandlerService;
 const ScriptPermissions = Java.type('com.infiniteautomation.mango.util.script.ScriptPermissions');
 const ArrayList = Java.type('java.util.ArrayList');
 
 
 const update=false; //set to true if you want to update the detectors

 
 try {
        const handlers = eventHandlerService.list();                                            // Changes ALL Event Handlers
        const handler = new ArrayList();                                                        // Changes ALL Event Handlers
        
        //const handler = eventHandlerService.get('EH_1216a3b6-05cd-4062-91cc-134e5898bd14');   // Changes a single Event Handler
        //const handlers = new ArrayList();                                                       // Changes a single Event Handler
        
        handlers.add(handler);                                                                  
        
        for(var i=0; i < handlers.size(); i++) {
            const handlerVO=handlers.get(i);
                if(handlerVO.getHandlerType() == 'EMAIL'){
                console.log('before: ' + handlerVO.getScriptRoles().getRoles()+ handlerVO.getXid());
                                console.log('legacy: ' + handlerVO.getScriptRoles().getLegacyScriptRoles()+ ' ' + handlerVO.getXid()); 
                handlerVO.setScriptRoles(new ScriptPermissions());
                //handlerVO.setScriptRoles(new ScriptPermissions(Common.getUser()));                
                console.log('after: ' + handlerVO.getScriptRoles().getRoles());
                    if (update == true){
                        try {
                    eventHandlerService.update(handlerVO.getId(), handlerVO);     
                    log.info('Saved event handler');
                        }
                        catch(error) {
                    log.error('save failed', error);
                    if(error instanceof ValidationException) {
                        for (i = 0; i < error.getValidationResult().getMessages().length; i++) {
                            var msg = error.getValidationResult().getMessages()[i];
                            console.log(msg.getContextKey() + ' --> ' + msg.getContextualMessage().translate(Common.getTranslations()));
                        }
                    }
                }  
            }
        }
    }
 }catch(e) {
     log.error('Script failed', e);
 };
 