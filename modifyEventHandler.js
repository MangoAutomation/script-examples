/**
 * This script will get an event handler, modify it's settings and update it.  Without using
 * to console.log or print() this will run until finished and can be used to 
 * update a very large event handler with hundreds of thousands of event types on it.
 */
  
 const eventHandlerService = services.eventHandlerService;
 
 const handlerXid = 'EH_ddf75950-bb29-4ae0-8c25-445bf9df5cfc';
 
 const handler = eventHandlerService.get(handlerXid);
 log.info('Retrieved event handler');
 handler.setScript("load('filestore://default/eventHandlerScriptToRun.js')");
 eventHandlerService.update(handlerXid, handler);
 log.info('Saved event handler');