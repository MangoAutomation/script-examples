/**
* This script will mitigate a bug in Jetty present from (9.4.36 -9.4.45) and described here [https://github.com/jetty/jetty.project/issues/6974]
*/
//Set to false to actually free up memory
const dryRun = true;
//Target pool size, Jetty will re-allocate as necessary if you go too low
const targetPoolSizeGB = 8;
//Sanity check so we don't get into a runaway situation, this may cause the script to not drop the pool to targetPoolSizeGB
const maxIterations = 3000; 

const Common = Java.type('com.serotonin.m2m2.Common');
const Lifecycle = Java.type('com.serotonin.m2m2.Lifecycle');
const MangoWebSocketHandshakeHandler = Java.type('com.infiniteautomation.mango.rest.latest.websocket.MangoWebSocketHandshakeHandler');
const BooleanClass = Java.type('java.lang.Boolean');

const lifecycle = Common.getBean(Lifecycle);
const serverField = lifecycle.getClass().getDeclaredField('server');
serverField.setAccessible(true);
const server = serverField.get(lifecycle);

const contextField = lifecycle.getClass().getDeclaredField('context');
contextField.setAccessible(true);
const context = contextField.get(lifecycle);

const connector1 = server.getConnectors()[0];
console.log("Connector direct: " + connector1.getByteBufferPool().getDirectMemory() + ' bytes');
console.log("Connector heap: " + connector1.getByteBufferPool().getHeapMemory() + ' bytes');

const servletHandler = context.getServletHandler();
const servlet = servletHandler.getServlet("restV3DispatcherServlet").getServlet();
const restV3Context = servlet.getWebApplicationContext();

const handshakeHandler = restV3Context.getBean(MangoWebSocketHandshakeHandler);
const upgradeStrategy = handshakeHandler.getRequestUpgradeStrategy();

const factoryField = upgradeStrategy.getClass().getDeclaredField('factory');
factoryField.setAccessible(true);
const factory = factoryField.get(upgradeStrategy);

const bufferPool = factory.getBufferPool();
console.log("WebSocketServerFactory direct: " + bufferPool.getDirectMemory() + ' bytes');
console.log("WebSocketServerFactory heap: " + bufferPool.getHeapMemory() + ' bytes');

const clearOldestBucketMethod = bufferPool.getClass().getDeclaredMethod('clearOldestBucket', BooleanClass.TYPE);
clearOldestBucketMethod.setAccessible(true);


if(!dryRun) {
    let iterations = 0;
    while (bufferPool.getHeapMemory() > (targetPoolSizeGB * 1024 * 1024 * 1024) && iterations++ < maxIterations) {
        clearOldestBucketMethod.invoke(bufferPool, false)
    }
    
    console.log("Iterations: " + iterations);
}
console.log("WebSocketServerFactory direct: " + bufferPool.getDirectMemory() + ' bytes');
console.log("WebSocketServerFactory heap: " + bufferPool.getHeapMemory() + ' bytes');
