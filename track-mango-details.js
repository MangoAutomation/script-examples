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

var mango_version = ModuleRegistry.getModule("core").getVersion();
LOG.debug("Mango Version: " + mango_version);
var_mango_version.set(mango_version);

var udmi_version = ModuleRegistry.getModule("udmi").getVersion();
LOG.debug("UDMI Version: " + udmi_version);
var_udmi_version.set(udmi_version);

var java_version = System.getProperty('java.version').toString();
LOG.debug("Java Version: " + java_version)
var_java_version.set(java_version);

var os_type = System.getProperty('os.name').toString();
var os_release = "";
var os_distributor = "";
LOG.debug("OS Type: " + os_type);
var_os_type.set(os_type);

//OS Type (Windows/Linux/etc.)
if (os_type == 'Linux') {
  var rt = Runtime.getRuntime();

  try {
    runCommand('lsb_release -a');
  } catch (err) {
    LOG.debug(err.message);
  }
}

LOG.debug("OS Release: " + os_release);
var_os_release.set(os_release);

LOG.debug("OS Distributor: " + os_distributor);
var_os_distributor.set(os_distributor);

function runCommand(commandString) {
  LOG.debug('Executing command: ' + commandString);
  var process = rt.exec(commandString);
  var inputStreamReader = new InputStreamReader(process.getInputStream());
  var bufferedReader = new BufferedReader(inputStreamReader);
  var line;
  while ((line = bufferedReader.readLine()) != null) {
    var lineParts = line.split(':');
    switch (lineParts[0].trim().toUpperCase()) {
      case 'DISTRIBUTOR ID':
        os_release = lineParts[1].trim();
        break;
      case 'RELEASE':
        os_distributor = lineParts[1].trim();
        break;
      default:
        continue;
    }
  }
  var exitCode = process.waitFor();
  return exitCode.toString();
}