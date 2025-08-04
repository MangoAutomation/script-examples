/*
 * Copyright (C) 2025 Radix IoT LLC. All rights reserved.
 */

/**
 * Mango Script: Secure String Encryption and JSON Store Management
 * This script encrypts strings using AES encryption and stores them securely in the JSON store
 * it is intended to be used as a tool via evaluating it, see test-store-secret.js
 */

// Import required Java classes for encryption
const Cipher = Java.type('javax.crypto.Cipher');
const KeyGenerator = Java.type('javax.crypto.KeyGenerator');
const SecretKeySpec = Java.type('javax.crypto.spec.SecretKeySpec');
const Base64 = Java.type('java.util.Base64');
const StandardCharsets = Java.type('java.nio.charset.StandardCharsets');
const Common = Java.type('com.serotonin.m2m2.Common');
const JsonDataVO = Java.type('com.serotonin.m2m2.vo.json.JsonDataVO');
const MangoPermission = Java.type('com.infiniteautomation.mango.permission.MangoPermission');
const Role = Java.type('com.serotonin.m2m2.vo.role.Role');
const ObjectMapper = Java.type('com.fasterxml.jackson.databind.ObjectMapper');
const JsonNode = Java.type('com.fasterxml.jackson.databind.JsonNode');

// Mango services and logging
const LoggerFactory = Java.type('org.slf4j.LoggerFactory');
//Get a reference to a class to use for the Logger
const STORE_SECRET_LOG_CLASS = Java.type('com.infiniteautomation.mango.util.script.MangoJavaScript');
const STORE_SECRET_LOG = LoggerFactory.getLogger(STORE_SECRET_LOG_CLASS);

// Create ObjectMapper instance for JSON operations
const mapper = new ObjectMapper();

/**
 * Creates a JsonNode from a JavaScript object
 * @param {Object} jsObject - JavaScript object to convert
 * @returns {JsonNode} Jackson JsonNode
 */
function createJsonNode(jsObject) {
    try {
        // Convert JavaScript object to JSON string, then parse as JsonNode
        const jsonString = JSON.stringify(jsObject);
        return mapper.readTree(jsonString);
    } catch (e) {
        STORE_SECRET_LOG.error('Failed to create JsonNode: ' + e.message);
        throw e;
    }
}


/**
 * Encrypts a string using AES encryption
 * @param {string} plainText - The text to encrypt
 * @param {string} secretKey - The encryption key (must be 16, 24, or 32 bytes)
 * @returns {string} Base64 encoded encrypted string
 */
function encryptString(plainText, secretKey) {
    try {
        // Convert string to bytes properly
        let keyBytes = Java.to(secretKey.split('').map(c => c.charCodeAt(0)), 'byte[]');
        
        // Ensure key is proper length (pad or truncate to 32 bytes for AES-256)
        if (keyBytes.length < 32) {
            const paddedKey = Java.to(new Array(32).fill(0), 'byte[]');
            java.lang.System.arraycopy(keyBytes, 0, paddedKey, 0, keyBytes.length);
            keyBytes = paddedKey;
        } else if (keyBytes.length > 32) {
            const truncatedKey = Java.to(new Array(32).fill(0), 'byte[]');
            java.lang.System.arraycopy(keyBytes, 0, truncatedKey, 0, 32);
            keyBytes = truncatedKey;
        }
        
        const secretKeySpec = new SecretKeySpec(keyBytes, 'AES');
        const cipher = Cipher.getInstance('AES/ECB/PKCS5Padding');
        cipher.init(Cipher.ENCRYPT_MODE, secretKeySpec);
        
        const plainTextBytes = Java.to(plainText.split('').map(c => c.charCodeAt(0)), 'byte[]');
        const encryptedBytes = cipher.doFinal(plainTextBytes);
        
        return Base64.getEncoder().encodeToString(encryptedBytes);
    } catch (e) {
        STORE_SECRET_LOG.error('Encryption failed: ' + e.message);
        throw e;
    }
}

/**
 * Decrypts a Base64 encoded encrypted string
 * @param {string} encryptedText - Base64 encoded encrypted text
 * @param {string} secretKey - The decryption key
 * @returns {string} Decrypted plain text
 */
function decryptString(encryptedText, secretKey) {
    try {
        // Convert string to bytes properly
        let keyBytes = Java.to(secretKey.split('').map(c => c.charCodeAt(0)), 'byte[]');
        
        // Ensure key is proper length
        if (keyBytes.length < 32) {
            const paddedKey = Java.to(new Array(32).fill(0), 'byte[]');
            java.lang.System.arraycopy(keyBytes, 0, paddedKey, 0, keyBytes.length);
            keyBytes = paddedKey;
        } else if (keyBytes.length > 32) {
            const truncatedKey = Java.to(new Array(32).fill(0), 'byte[]');
            java.lang.System.arraycopy(keyBytes, 0, truncatedKey, 0, 32);
            keyBytes = truncatedKey;
        }
        
        const secretKeySpec = new SecretKeySpec(keyBytes, 'AES');
        const cipher = Cipher.getInstance('AES/ECB/PKCS5Padding');
        cipher.init(Cipher.DECRYPT_MODE, secretKeySpec);
        
        const encryptedBytes = Base64.getDecoder().decode(encryptedText);
        const decryptedBytes = cipher.doFinal(encryptedBytes);
        
        // Convert bytes back to string
        let result = '';
        for (let i = 0; i < decryptedBytes.length; i++) {
            result += String.fromCharCode(decryptedBytes[i] & 0xFF);
        }
        
        return result;
    } catch (e) {
        STORE_SECRET_LOG.error('Decryption failed: ' + e.message);
        throw e;
    }
}

/**
 * Stores an encrypted string in the JSON store using Mango's REST endpoint
 * @param {string} xid - Unique identifier for the JSON store item
 * @param {string} name - Human readable name
 * @param {string} plainTextSecret - The secret to encrypt and store
 * @param {string} encryptionKey - The key to use for encryption
 * @param {Array} readPermission - Permission to read this item
 * @param {Array} editPermission - Permission to edit this item
 * @param {boolean} shouldRegenerate - Should we regenerate the secret
 * @param {number} regenerationInterval - interval used to generate the secret
 * @param {string} regenerationIntervalUnit - Unit of interval used to regenerate
 */
function storeEncryptedSecret(xid, name, plainTextSecret, encryptionKey,
                              readPermission,
                              editPermission,
                              shouldRegenerate, regenerationInterval, regenerationIntervalUnit) {
    readPermission = readPermission || MangoPermission.superadminOnly();
    editPermission = editPermission || MangoPermission.superadminOnly();
    
    try {
        const encryptedSecret = encryptString(plainTextSecret, encryptionKey);

        const jsonData = {
            encryptedValue: encryptedSecret,
            algorithm: 'AES/ECB/PKCS5Padding',
            createdAt: new Date().toISOString(),
            description: 'Encrypted secret stored securely',
            shouldRegenerate: shouldRegenerate,
            regenerationInterval: regenerationInterval,
            regenerationIntervalUnit: regenerationIntervalUnit,
        };
        
        // Create JSON store item structure
        const jsonStoreItem = new JsonDataVO();
        jsonStoreItem.setXid(xid);
        jsonStoreItem.setName(name);
        jsonStoreItem.setJsonData(createJsonNode(jsonData));
        jsonStoreItem.setReadPermission(readPermission);
        jsonStoreItem.setEditPermission(editPermission)
        
        // Use Mango's JSON store service
        try {
                const existing = services.jsonDataService.get(xid);
                const result = services.jsonDataService.update(xid, jsonStoreItem);
                STORE_SECRET_LOG.info('Successfully updated encrypted secret with XID: ' + xid);
                return result;
            }catch (e) {
                const result = services.jsonDataService.insert(jsonStoreItem);
                STORE_SECRET_LOG.info('Successfully inserted encrypted secret with XID: ' + xid);
                return result;
            }
    } catch (e) {
        STORE_SECRET_LOG.error('Failed to store encrypted secret: ' + e.message);
        throw e;
    }
}

/**
 * Get the JSON Store Item
 * @param xid
 * @returns {*}
 */
function getJsonStoreItem(xid) {
    let jsonStoreItem;

    // Try to use Mango's JSON store service
    jsonStoreItem = services.jsonDataService.get(xid);

    if (!jsonStoreItem) {
        throw new Error('JSON store item not found: ' + xid);
    }
    return jsonStoreItem;
}
/**
 * Retrieves and decrypts a secret from the JSON store
 * @param {string} xid - The XID of the JSON store item
 * @param {string} decryptionKey - The key to decrypt with
 * @returns {string} The decrypted secret
 */
function retrieveAndDecryptSecret(xid, decryptionKey) {
    try {
        let jsonStoreItem = getJsonStoreItem(xid);
        const encryptedValue = jsonStoreItem.getJsonData().get('encryptedValue').textValue();
        if (!encryptedValue) {
            throw new Error('No encrypted value found in JSON store item: ' + xid);
        }

        const decryptedSecret = decryptString(encryptedValue, decryptionKey);
        STORE_SECRET_LOG.info('Successfully retrieved and decrypted secret with XID: ' + xid);
        
        return decryptedSecret;
    } catch (e) {
        STORE_SECRET_LOG.error('Failed to retrieve and decrypt secret: ' + e.message);
        throw e;
    }
}

STORE_SECRET_LOG.info('Secure String Encryption Script loaded successfully');