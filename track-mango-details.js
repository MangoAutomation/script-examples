/**
 * Script to track Mango, Modules, and OS details
 * Last update Sept 2025
 *
 * Java Details
 * - Java version
 *
 * Mango Details
 * - Mango Version
 * - UDMI Version
 *
 * OS Details
 * - OS Type
 * - OS Release
 * - OS Distributor
 *
 * Note: For OS linux is necessary install lsb_release
 */

var Runtime = Java.type('java.lang.Runtime');
var System = Java.type('java.lang.System');
var ModuleRegistry = Java.type('com.serotonin.m2m2.module.ModuleRegistry');
var InputStreamReader = Java.type('java.io.InputStreamReader');
var BufferedReader = Java.type('java.io.BufferedReader');

// --- HELPER FUNCTIONS ---

/**
 * Gets the version of a Mango module by name.
 * @param {string} moduleName - The name of the module (e.g., "core", "udmi").
 * @returns {string} The module version or "ERROR" if it fails.
 */
function getModuleVersion(moduleName) {
  try {
    var version = ModuleRegistry.getModule(moduleName).getVersion();
    LOG.debug("Module version '" + moduleName + "': " + version);
    return version;
  } catch (e) {
    LOG.error("Failed to get module version for '" + moduleName + "': " + e.message);
    return 'ERROR';
  }
}

/**
 * Gets a system property.
 * @param {string} propertyName - The name of the property (e.g., "java.version").
 * @returns {string} The property value or "ERROR" if it fails.
 */
function getSystemProperty(propertyName) {
  try {
    var propertyValue = System.getProperty(propertyName).toString();
    LOG.debug("System property '" + propertyName + "': " + propertyValue);
    return propertyValue;
  } catch (e) {
    LOG.error("Failed to get system property '" + propertyName + "': " + e.message);
    return 'ERROR';
  }
}

/**
 * Executes a system shell command and returns its output.
 * @param {string} command - The command to execute.
 * @returns {string[] | null} An array with the output lines, or null on error.
 */
function runCommand(command) {
  LOG.debug("Executing command: " + command);
  try {
    var process = Runtime.getRuntime().exec(command);
    var reader = new BufferedReader(new InputStreamReader(process.getInputStream()));

    var lines = [];
    var line;
    while ((line = reader.readLine()) !== null) {
      lines.push(line);
    }

    var exitCode = process.waitFor();
    LOG.debug("Command finished with exit code: " + exitCode);

    if (exitCode !== 0) {
      throw new Error("Command failed with exit code " + exitCode);
    }
    return lines;
  } catch (e) {
    LOG.error("Error executing command '" + command + "': " + e.message);
    return null;
  }
}

// --- MAIN LOGIC ---

// Get all the information
var mangoVersion = getModuleVersion('core');
var udmiVersion = getModuleVersion('udmi');
var javaVersion = getSystemProperty('java.version');
var osType = getSystemProperty('os.name');

var osRelease = '';
var osDistributor = '';

//OS Type (Windows/Linux/etc.)
if (osType === 'Linux') {
  var resultLines = runCommand('lsb_release -a');
  if (resultLines) {
    var osInfo = resultLines.reduce(function(acc, line) {
      var parts = line.split(':', 2);
      if (parts.length >= 2) {
        var key = parts[0].trim();
        var value = parts[1].trim();
        acc[key] = value;
      }
      return acc;
    }, {});

    osDistributor = osInfo['Distributor ID'] || '';
    osRelease = osInfo['Release'] || '';
  } else {
    osDistributor = 'ERROR';
    osRelease = 'ERROR';
  }
}

LOG.debug("OS Distributor: " + osDistributor);
LOG.debug("OS Release: " + osRelease);

// Set the context variables to the data points
var_mango_version.set(mangoVersion);
var_udmi_version.set(udmiVersion);
var_java_version.set(javaVersion);
var_os_type.set(osType);
var_os_release.set(osRelease);
var_os_distributor.set(osDistributor);