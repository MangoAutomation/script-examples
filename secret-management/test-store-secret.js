/*
 * Copyright (C) 2025 Radix IoT LLC. All rights reserved.
 */

// Load the encryption utilities from store-encrypted-secret.js
const path = services.fileStoreService.getPathForRead('default', 'script-examples/secret-management/store-encrypted-secret.js');
const encryptionScript = load(path);

// Import the functions we need from the loaded script
eval(encryptionScript);

const LOG = LoggerFactory.getLogger('TestStoreSecret');

// Example usage
try {
    LOG.info('Starting secure string encryption example...');

    const secretKey = 'MySecureEncryptionKey123456789012'; // 32 characters for AES-256
    const secretToStore = 'my-api-key-12345';

    LOG.info('Generated random key: ' + generateRandomKey());

    // Store encrypted secret
    storeEncryptedSecret(
        'api-key-secret',           // XID
        'External API Key',         // Name
        secretToStore,              // Secret to encrypt
        secretKey,                  // Encryption key
        MangoPermission.superadminOnly(),       // Read permission
        MangoPermission.superadminOnly(),       // Edit permission
        false, //Should regenerate
        10, //Regenerate interval
        "SECONDS" //Regenerate Unit
    );

    // Retrieve and decrypt secret
    const retrievedSecret = retrieveAndDecryptSecret('api-key-secret', secretKey);
    console.log('Original secret: ' + secretToStore);
    console.log('Retrieved secret: ' + retrievedSecret);
    console.log('Secrets match: ' + (secretToStore === retrievedSecret));

} catch (e) {
    LOG.error('Script execution failed: ' + e.message);
}