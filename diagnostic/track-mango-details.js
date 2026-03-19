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

var Common = Java.type('com.serotonin.m2m2.Common');
var mangoDataPath = Common.envProps.getProperty('paths.data').toString();
var Runtime = Java.type('java.lang.Runtime');
var rt = Runtime.getRuntime();
var System = Java.type('java.lang.System');
var ModuleRegistry = Java.type('com.serotonin.m2m2.module.ModuleRegistry');
var InputStreamReader = Java.type('java.io.InputStreamReader');
var BufferedReader = Java.type('java.io.BufferedReader');

for (var i in EXTERNAL_POINTS) {
  var configPoint = EXTERNAL_POINTS[i];
  var configPointWrapper = configPoint.getDataPointWrapper();
  if (!configPointWrapper.enabled) {
    continue;
  }
  var locatorType = configPointWrapper.tags.locatorType;
  if (!locatorType) {
    LOG.error('Point ' + configPointWrapper.name + ' missing locatorType tag.');
    configPoint.set('Missing locatorType tag.');
    continue;
  }
  var locatorValue = configPointWrapper.tags.locatorValue;
  if (!locatorValue) {
    LOG.error('Point ' + configPointWrapper.name + ' missing locatorValue tag.');
    configPoint.set('Missing locatorValue tag.');
    continue;
  }
  LOG.debug('Processing point ' + configPointWrapper.name + ' (' + locatorType + ':' + locatorValue + ')');
  switch (locatorType) {
    case 'os':
      configPoint.set(processOsLocatorType(locatorValue));
      break;
    case 'mango.version':
      configPoint.set(processMangoVersionLocatorType(locatorValue));
      break;
    case 'java':
      configPoint.set(processJavaLocatorType(locatorValue));
      break;
    case 'mango.properties':
      configPoint.set(processMangoPropertiesLocatorType(locatorValue));
      break;
    case 'start-options':
      configPoint.set(processStartOptionsLocatorType(locatorValue));
      break;
    default:
      LOG.error('Unexpected locatorType: ' + locatorType);
      configPoint.set('Unexpected locatorType: ' + locatorType);
  }
}

function processMangoVersionLocatorType(locatorValue) {
  //Find the locatorValue for this Mango Version point in the ModuleRegistry
  var module = ModuleRegistry.getModule(locatorValue);
  if (!module) {
    LOG.error('Version Locator module ' + locatorValue + ' not found.');
    return 'Module ' + locatorValue + ' not found.';
  }
  var versionValue
  try {
    //This method is not compatible in Mango 5.2 and earlier
    versionValue = module.getVersion();
  }
  catch (err) {
    LOG.debug(module.version);
    //This method is compatible in Mango 5.2 and earlier
    versionValue = ModuleRegistry.getModule(locatorValue).version;
  }

  LOG.debug(ModuleRegistry.getModule(locatorValue).version);
  if (versionValue) {
    LOG.debug('Version Locator ' + locatorValue + ' = ' + versionValue);
    return versionValue;
  }
  else {
    LOG.error('Version Locator ' + locatorValue + ' not found.');
    return locatorValue + ' not found.';
  }
}

function processJavaLocatorType(locatorValue) {
  var javaValue = System.getProperty(locatorValue).toString();
  if (javaValue) {
    LOG.debug('Java Locator ' + locatorValue + ' = ' + javaValue);
    return javaValue;
  }
  else {
    LOG.error('Java Locator ' + locatorValue + ' not found.');
    return locatorValue + ' not found.';
  }
}

function processMangoPropertiesLocatorType(locatorValue) {
  var mangoPropertyValue = Common.envProps.getProperty(locatorValue).toString();
  if (mangoPropertyValue) {
    LOG.debug('Mango.Properties Locator ' + locatorValue + ' = ' + mangoPropertyValue);
    return mangoPropertyValue;
  }
  else {
    LOG.error('Mango.Properties Locator ' + locatorValue + ' not found.');
    return locatorValue + ' not found.';
  }
}

var osConfigParamKeys;
var osConfigParamValues;
function processOsLocatorType(locatorValue) {
  //Check if the command has already been executed before running it
  if (!osConfigParamKeys) {
    var osConfigLines = runCommand('lsb_release -a');
    osConfigParamKeys = new Array();
    osConfigParamValues = new Array();
    osConfigLines.forEach(parseOsConfigLines);
  }
  //Find the locatorValue for this OS point in osConfigParamKeys
  var osConfigValue = osConfigParamValues[osConfigParamKeys.indexOf(locatorValue)];
  if (osConfigValue) {
    LOG.debug('OS Locator ' + locatorValue + ' = ' + osConfigValue);
    return osConfigValue;
  }
  else {
    LOG.error('OS Locator ' + locatorValue + ' not found.');
    return locatorValue + ' not found.';
  }
}
function parseOsConfigLines(value) {
  LOG.debug('Processing OS config line: ' + value);
  var lineParts = value.split(':');
  if (lineParts.length <= 1) {
    LOG.debug('Config line missing separator `:` ' + lineParts.toString());
  } else {
    osConfigParamKeys.push(lineParts[0].trim());
    osConfigParamValues.push(lineParts[1].trim());
  }
}


var startOptionsParams;
function processStartOptionsLocatorType(locatorValue) {
  //Check if the command has already been executed before running it
  if (!startOptionsParams) {
    var startOptionsLines = runCommandArray(['grep', '-v', '^#\\|^$', mangoDataPath + '/start-options.sh']);
    startOptionsParams = new Array();
    startOptionsLines.forEach(parseStartOptionsLines);
  }
  //Find the locatorValue for this OS point in startOptionsParamKeys
  var matchedValues = startOptionsParams.filter(strStartsWith);
  LOG.debug('matchedValues: ' + matchedValues.toString());
  function strStartsWith(value) {
    return value.startsWith(locatorValue);
  }
  if (matchedValues.length > 0) {
    LOG.debug('Start Options Locator ' + locatorValue + ' = ' + matchedValues[0]);
    return matchedValues[0];
  }
  else {
    LOG.error('Start Options Locator ' + locatorValue + ' not found.');
    return locatorValue + ' not found.';
  }
}
function parseStartOptionsLines(value) {
  LOG.debug('Processing Start Options line: ' + value);
  var lineParts = value.trim().split('-');
  if (lineParts.length <= 1) {
    LOG.debug('Config line missing separator `-` ' + lineParts.toString());
  }
  lineParts.forEach(pushPart);
  function pushPart(value) {
    //Only push parameters that start with X
    //Remove quotation marks
    if (value.trim().substring(0,1) == 'X') {
      startOptionsParams.push(value.trim().replace('"', ''));
    }
  }
  LOG.debug(lineParts.toString());
}


function runCommand(commandToRun) {
  return runCommandArray(commandToRun.split(' '));
}

function runCommandArray(commandArrayToRun) {
  LOG.debug('Executing command: ' + commandArrayToRun.toString());
  var logErrors = true;
  var process = rt.exec(commandArrayToRun);
  var bReader = java.io.BufferedReader;
  var iStreamReader = java.io.InputStreamReader;
  var line = String;
  var commandOutputLines = new Array();
  var returnValue = process.waitFor() === 0;
  iStreamReader = new java.io.InputStreamReader(process.getInputStream());
  bReader = new java.io.BufferedReader(iStreamReader);
  while ((line = bReader.readLine()) != null) {
    LOG.debug(line);
    commandOutputLines.push(line);
  }
  if (logErrors) {
    iStreamReader = new java.io.InputStreamReader(process.getErrorStream());
    bReader = new java.io.BufferedReader(iStreamReader);
    while ((line = bReader.readLine()) != null) {
      LOG.error(line);
    }
  }
  return commandOutputLines;
}