/*
 * Copyright (C) 2025 Radix IoT LLC. All rights reserved.
 */

// Load the encryption utilities from store-encrypted-secret.js
const regenerateSecretScriptPath = services.fileStoreService.getPathForRead('default', 'script-examples/secret-management/regenerate-secret.js');

const regenerateSecretScript = load(regenerateSecretScriptPath);

// Import the functions we need from the loaded script
eval(regenerateSecretScript);

// Configuration
const SECRET_XID = 'api-key-secret';
const SECRET_NAME = 'External API Key';
const ENCRYPTION_KEY = 'MySecureEncryptionKey123456789012'; // 32 characters for AES-256
const REGENERATION_INTERVAL = 30;
const REGENERATION_INTERVAL_UNIT = TimeUnit.SECONDS;

//Get a reference to a class to use for the Logger
const LOG_CLASS = Java.type('com.infiniteautomation.mango.util.script.MangoJavaScript');
const LOG = LoggerFactory.getLogger(LOG_CLASS);

/**
 * Generates a new secure random string
 * @returns {string} Random secure string
 */
function generateSecureSecret() {
    const length = 64;
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// Example usage and testing
try {
    LOG.info('Starting Auto-Regenerate Secret Script...');

    // Start the auto-regeneration service
    startAutoRegeneration(SECRET_XID,
        SECRET_NAME,
        ENCRYPTION_KEY,
        REGENERATION_INTERVAL,
        REGENERATION_INTERVAL_UNIT,
        generateSecureSecret);

    console.log('Auto-regeneration service started!');
    console.log('Status:', JSON.stringify(getRegenerationStatus(), null, 2));

    // Example: How to retrieve the current secret
    setTimeout(function() {
        try {
            const current = getCurrentSecret();
            if (current) {
                console.log('Current secret retrieved successfully (length: ' + current.length + ')');
            }
            console.log('Status:', JSON.stringify(getRegenerationStatus(), null, 2));
        } catch (e) {
            console.log('Failed to retrieve current secret: ' + e.message);
        }
    }, 2000); // Wait 2 seconds before testing retrieval

} catch (e) {
    LOG.error('Script initialization failed: ' + e.message);
}
