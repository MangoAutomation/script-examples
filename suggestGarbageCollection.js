/**
 * Strongly encourage garbage collection.
 * To log GC Events to file:
 * sudo -u mango jcmd $(systemctl show --property MainPID --value mango) VM.log decorators=utc,l,tg output=gc.log what=gc*=debug
 * Note: the output of gc.log will be the location where java was started from.
 */
 
const System = Java.type('java.lang.System');
System.gc();
