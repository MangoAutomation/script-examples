/**
 * Crash mango by allocating a large amound of memory, useful to test Mango behviour on OOM.
 * Recommended JVM Options:
 * -XX:+HeapDumpOnOutOfMemoryError
 * -XX:HeapDumpPath=/path/to/existing/directory/mango-data/
 * -XX:+ExitOnOutOfMemoryError
 */
 
const List = Java.type('java.util.List');
const ArrayList = Java.type('java.util.ArrayList');
const Runtime = Java.type('java.lang.Runtime');
const ByteBuffer = Java.type('java.nio.ByteBuffer');

var list = new ArrayList();
var index = 1;
while (true) {
    // 1MB each loop, 1 x 1024 x 1024 = 1048576
    var b = ByteBuffer.allocate(10 * 1048576);
    list.add(b);
    var rt = Runtime.getRuntime();
    log.info("{} free memory: {}", index++, rt.freeMemory());
}
