/*
 * Copyright (C) 2025 Radix IoT LLC. All rights reserved.
 */

// Load the encryption utilities from store-encrypted-secret.js
const path = services.fileStoreService.getPathForRead('default', 'script-examples/secret-management/store-encrypted-secret.js');
const encryptionScript = load(path);

// Import required Java classes
const MangoRuntimeContextConfiguration = Java.type('com.infiniteautomation.mango.spring.MangoRuntimeContextConfiguration');
const ScheduledExecutorService = Java.type('org.springframework.security.concurrent.DelegatingSecurityContextScheduledExecutorService');
const mangoScheduledExecutorService = Common.getBean(ScheduledExecutorService, MangoRuntimeContextConfiguration.SCHEDULED_EXECUTOR_SERVICE_NAME);
const TimeUnit = Java.type('java.util.concurrent.TimeUnit');
const Runnable = Java.type('java.lang.Runnable');

//Get a reference to a class to use for the Logger
const AUTO_REGENERATE_LOG_CLASS = Java.type('com.infiniteautomation.mango.util.script.MangoJavaScript');
const AUTO_REGENERATE_LOG = LoggerFactory.getLogger(AUTO_REGENERATE_LOG_CLASS);



// Import the functions we need from the loaded script
eval(encryptionScript);

// Global variables to manage the timer
let regenerationTaskFuture = null;
let secretGeneratorStatus =  {
    running: false,
    shouldRegenerate: false,
    regenerationInterval: 0,
    regenerationIntervalUnit: TimeUnit.SECONDS.toString(),
    createdAt: ''
}

/**
 * Generates and stores a new encrypted secret
 * @param {string} xid - JSON Data XID
 * @param {string} name - JSON Data Name
 * @param {string} encryptionKey - key used for encryption
 * @param {number} interval - number of units to wait to regenerate secret
 * @param {TimeUnit} intervalUnit - unit of time to wait
 * @param {function(): string} regenerateSecretFunction - call to regenerate secret
 * @param {boolean} shouldRegenerate - continue to regenerate
 *
 */
function regenerateSecret(xid, name, encryptionKey, interval,
                          intervalUnit, regenerateSecretFunction,
                          shouldRegenerate) {
    try {
        const secretStore = getJsonStoreItem(xid);
        const shouldRegenerateState = secretStore.getJsonData().get('shouldRegenerate').asBoolean()
        AUTO_REGENERATE_LOG.info('Regenerating secret...');

        // Generate new secret
        const newSecret = regenerateSecretFunction();

        // Store encrypted secret using the function from store-encrypted-secret.js
        storeEncryptedSecret(
            xid,
            name,
            newSecret,
            encryptionKey,
            MangoPermission.superadminOnly(),
            MangoPermission.superadminOnly(),
            shouldRegenerate,
            interval,
            intervalUnit.toString()
        );

        AUTO_REGENERATE_LOG.info('Secret regenerated successfully at: ' + new Date().toISOString());

        // Optional: Log first few characters for verification (don't log full secret)
        AUTO_REGENERATE_LOG.info('Should Regenerate: ' + shouldRegenerateState);
        return shouldRegenerateState;
    } catch (e) {
        AUTO_REGENERATE_LOG.error('Failed to regenerate secret: ' + e.message);
        return false;
    }
}

/**
 * Retrieves the current secret (for testing purposes)
 * @returns {string} The current decrypted secret
 */
function getCurrentSecret() {
    try {
        return retrieveAndDecryptSecret(SECRET_XID, ENCRYPTION_KEY);
    } catch (e) {
        AUTO_REGENERATE_LOG.error('Failed to retrieve current secret: ' + e.message);
        return null;
    }
}

/**
 * Starts the auto-regeneration timer
 * @param {string} xid - JSON Data XID
 * @param {string} name - JSON Data Name
 * @param {string} encryptionKey - key used for encryption
 * @param {number} interval - number of units to wait to regenerate secret
 * @param {TimeUnit} intervalUnit - unit of time to wait
 * @param {function(): string} regenerateSecretFunction - call to regenerate secret and return string secret
 */
function startAutoRegeneration(xid, name, encryptionKey, interval,
                               intervalUnit, regenerateSecretFunction) {
    try {
        // Stop existing timer if running
        stopAutoRegeneration();

        AUTO_REGENERATE_LOG.info('Starting auto-regeneration timer with interval: ' + interval + ' ' + intervalUnit.toString());

        // Generate initial secret immediately
        regenerateSecret(xid, name, encryptionKey, interval, intervalUnit, regenerateSecretFunction, true);

        // Schedule periodic regeneration
        const RunnableImpl = Java.extend(Runnable, {
            run: function() {
                try {
                    let runAgain = regenerateSecret(xid, name, encryptionKey, interval, intervalUnit, regenerateSecretFunction, true);
                    secretGeneratorStatus = {
                        shouldRegenerate: runAgain,
                        regenerationInterval: interval,
                        regenerationIntervalUnit: intervalUnit.toString(),
                        secretXid: xid,
                        createdAt: new Date().toISOString()
                    }
                    if (runAgain === false) {
                        stopAutoRegeneration();
                    }
                }catch(error) {
                    AUTO_REGENERATE_LOG.error('Failed running regenerate secret: ' + error.message);
                }
            }
        });

        const regenerationTask = new RunnableImpl();

        regenerationTaskFuture = mangoScheduledExecutorService.scheduleAtFixedRate(
            regenerationTask,
            interval, // Initial delay
            interval, // Period
            intervalUnit //Units
        );

        AUTO_REGENERATE_LOG.info('Auto-regeneration timer started successfully');
        AUTO_REGENERATE_LOG.info('Secret will be regenerated every ' + interval + ' ' + intervalUnit);

    } catch (e) {
        AUTO_REGENERATE_LOG.error('Failed to start auto-regeneration: ' + e.message);
    }
}

/**
 * Stops the auto-regeneration timer
 */
function stopAutoRegeneration() {
    try {
        if (mangoScheduledExecutorService && !mangoScheduledExecutorService.isShutdown()) {

            // Wait for graceful shutdown
            if (!regenerationTaskFuture.cancel(true)) {
                AUTO_REGENERATE_LOG.error('Unable to stop secret regeneration task');
            }

            AUTO_REGENERATE_LOG.info('Auto-regeneration timer stopped');
            console.log('Secret auto-regeneration stopped');
        }
    } catch (e) {
        AUTO_REGENERATE_LOG.error('Failed to stop auto-regeneration: ' + e.message);
    } finally {
        regenerationTaskFuture = null;
    }
}

/**
 * Gets the status of the auto-regeneration service
 * @returns {Object} Status information
 */
function getRegenerationStatus() {
    secretGeneratorStatus.running = regenerationTaskFuture && !regenerationTaskFuture.isDone();
    AUTO_REGENERATE_LOG.info('Auto-regeneration status: ' + JSON.stringify(secretGeneratorStatus, null, 2))
    return secretGeneratorStatus;
}

// Cleanup function to ensure proper shutdown
function cleanup() {
    AUTO_REGENERATE_LOG.info('Cleaning up auto-regeneration service...');
    stopAutoRegeneration();
}
