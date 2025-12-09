var Common = Java.type('com.serotonin.m2m2.Common');
var mangoDataPath = Common.envProps.getProperty('paths.data').toString();
var Runtime = Java.type('java.lang.Runtime');
var rt = Runtime.getRuntime();
var System = Java.type('java.lang.System');
var ModuleRegistry = Java.type('com.serotonin.m2m2.module.ModuleRegistry');
var InputStreamReader = Java.type('java.io.InputStreamReader');
var BufferedReader = Java.type('java.io.BufferedReader');
var SystemSettingsDaoInstance = Common.getBean(com.serotonin.m2m2.db.dao.SystemSettingsDao.class);
var Comparator = Java.type('java.util.Comparator');
var PublisherService = Common.getBean(com.infiniteautomation.mango.spring.service.PublisherService.class);

var osConfigParamKeys;
var osConfigParamValues;
var startOptionsParams;

var HashMap = Java.type("java.util.HashMap");
monitoredValuesHashList = new HashMap();

for (var i in EXTERNAL_POINTS) {
    var configPoint = EXTERNAL_POINTS[i];
    var configPointWrapper = configPoint.getDataPointWrapper();
    var configPointTags = configPointWrapper.tags;
    if(configPointTags && !configPointTags.isEmpty()){ 
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
        var locatorParam1 = configPointWrapper.tags.locatorParam1;

        if ((locatorType === 'publisher') && (!locatorParam1)) {
            LOG.error('Point ' + configPointWrapper.name + ' missing locatorParam1 tag.');
            configPoint.set('Missing locatorParam1 tag.');
            continue;
        }

        LOG.debug('Processing point ' + configPointWrapper.name + ' (' + locatorType + ':' + locatorValue + ')')

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
                processStartOptionsParams();
                configPoint.set(processStartOptionsLocatorType(locatorValue));
                break;
            case 'mango.system.settings':
                configPoint.set(processSystemSettingsLocatorType(locatorValue));
                break;
            case 'mango.system.metrics':
                getAllMonitoredValues();
                configPoint.set(processSystemMetricsLocatorType(locatorValue));
                break; 
            case 'publisher':
                configPoint.set(processPublisherLocatorType(locatorValue,locatorParam1));
                break;     
            default:
                LOG.error('Unexpected locatorType: ' + locatorType);
                configPoint.set('Unexpected locatorType: ' + locatorType);
        }
    } else{
        LOG.error('Missing tags for this Point: ' + configPointWrapper.name);
        configPoint.set('Missing tags');
    }
}

function processMangoVersionLocatorType(locatorValue) {
    //Find the locatorValue for this Mango Version point in the ModuleRegistry
    var versionValue = ModuleRegistry.getModule(locatorValue).getVersion();
    if (versionValue) {
        LOG.debug('Version Locator ' + locatorValue + ' = ' + versionValue);
        return versionValue;
    }else {
        LOG.error('Version Locator ' + locatorValue + ' not found.');
        return locatorValue + ' not found.';
    }
}

function processJavaLocatorType(locatorValue) {
    var javaValue = System.getProperty(locatorValue).toString();
    if (javaValue) {
        LOG.debug('Java Locator ' + locatorValue + ' = ' + javaValue);
        return javaValue;
    } else {
        LOG.error('Java Locator ' + locatorValue + ' not found.');
        return locatorValue + ' not found.';
    }
}

function processMangoPropertiesLocatorType(locatorValue) {
    var mangoPropertyValue = Common.envProps.getProperty(locatorValue).toString();
    if (mangoPropertyValue) {
        LOG.debug('Mango.Properties Locator ' + locatorValue + ' = ' + mangoPropertyValue);
        return mangoPropertyValue;
    } else {
        LOG.error('Mango.Properties Locator ' + locatorValue + ' not found.');
        return locatorValue + ' not found.';
    }
}

function processOsLocatorType(locatorValue) {
    try{
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
        }else {
            LOG.error('OS Locator ' + locatorValue + ' not found.');
            return locatorValue + ' not found.';
        }
    }catch(err){
        LOG.error('OS Locator ' + locatorValue + ' ' +  err.getMessage()); 
        return err.getMessage();
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

function processStartOptionsParams(){
   //Check if the command has already been executed before running it
   if (!startOptionsParams) {
        var startOptionsLines = runCommandArray(['grep', '-v', '^#\\|^$', mangoDataPath + '/start-options.sh']);
        startOptionsParams = new Array();
        startOptionsLines.forEach(parseStartOptionsLines);
   }
}

function processStartOptionsLocatorType(locatorValue) {
    //Find the locatorValue for this OS point in startOptionsParamKeys
    var matchedValues = startOptionsParams.filter(strStartsWith);
    LOG.debug('matchedValues: ' + matchedValues.toString());
    function strStartsWith(value) {
        return value.startsWith(locatorValue);
    }
    if (matchedValues.length > 0) {
        LOG.debug('Start Options Locator ' + locatorValue + ' = ' + matchedValues[0]);
        return matchedValues[0];
    } else {
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

function processSystemSettingsLocatorType(locatorValue){
    var systemSettings = SystemSettingsDaoInstance.getAllSystemSettingsAsCodes();
    var systemSettingValue = systemSettings.get(locatorValue);
   
    if(systemSettingValue === null || systemSettingValue === undefined){
         LOG.debug('System Settings key not found..');
         return locatorValue + ' not found.';
    } else {
        return systemSettingValue;
    }
}

function getAllMonitoredValues() {
    var monitoredValuesList = Common.MONITORED_VALUES.getMonitors();
    var translations = Common.getTranslations();
    
    for (var item=0; item < monitoredValuesList.size(); item++){
         var monitoredValuesModel = monitoredValuesList.get(item);
         var monitoredKey = monitoredValuesModel.getName().translate(translations);
         var monitoredValue = monitoredValuesModel.getValue();
         if(monitoredValue) {
              monitoredValuesHashList.put(monitoredKey,monitoredValue);
         }
    }
}

function processSystemMetricsLocatorType(locatorValue){
   var systemMetricsValue = monitoredValuesHashList.get(locatorValue);
   if(systemMetricsValue == null){
     LOG.error(locatorValue + " not found." );
     return locatorValue + " not found.";
   }
    return  systemMetricsValue;
}
  
function processPublisherLocatorType(locatorValue,locatorParam1){
    try{
        var ObjectMapper = Java.type('com.fasterxml.jackson.databind.ObjectMapper');
        var AbstractPublisherModel = Java.type('com.infiniteautomation.mango.rest.latest.model.publisher.AbstractPublisherModel');
        var LifeCycleClass = Java.type('com.serotonin.m2m2.Lifecycle').class;
        var LifeCycleInstance = Common.getBean(LifeCycleClass);
        var ContextField = LifeCycleInstance.getClass().getDeclaredField('context');
        ContextField.setAccessible(true);
        var Context = ContextField.get(LifeCycleInstance);
        
        var ServletHandler = Context.getServletHandler();
        var Servlet = ServletHandler.getServlet("restV3DispatcherServlet").getServlet();
        var RestV3Context = Servlet.getWebApplicationContext();
        var RestModelMapperClass = Java.type('com.infiniteautomation.mango.rest.latest.model.RestModelMapper').class;
        var RestModelMapperInstance = RestV3Context.getBean(RestModelMapperClass);
        
        //get the bean named restObjectMapper and make sure it is of type ObjectMapper
        var mapperInstance = Common.getBean(ObjectMapper.class,"restObjectMapper");
        var PublisherVO= PublisherService.get(locatorParam1);
        var AbstractPublisherModelObj = RestModelMapperInstance.map(PublisherVO, AbstractPublisherModel.class, Common.getUser());

        var PublisherJsonString = mapperInstance.writerWithDefaultPrettyPrinter().writeValueAsString(AbstractPublisherModelObj);
        if(PublisherJsonString == null || String(PublisherJsonString).trim() === ""){
          LOG.error('locatorParam1 ' + locatorParam1 + " returned empty JSON string. locatorValue: " + locatorValue);
        } else {
          LOG.debug('locatorParam1 ' + locatorParam1 + " successfully returned Publisher. Publisher JSON string : " + PublisherJsonString);
          var publisherLocatorValue = getPublisherLocatorTypePropertyValue(PublisherJsonString,locatorValue);
        }

        if(publisherLocatorValue == null || publisherLocatorValue === ""){
          LOG.error('Publisher Locator ' + locatorValue + ' not found.');
          return 'Publisher Locator ' + locatorValue + ' not found.';
        }
        return publisherLocatorValue;
    } catch(err){
        LOG.error('Publisher locatorParam1: ' + locatorParam1 + ' locatorValue: ' + locatorValue + ' ' +  err.message);
    }
   }
   
function getPublisherLocatorTypePropertyValue(jsonObject,path){
      var fetchedValue = getJsonValue(jsonObject,path);
      if (fetchedValue !== undefined){ 
        return fetchedValue.toString();
     }
 }
   
function getJsonValue(jsonObject,path){
   LOG.debug('Processing jsonObject: ' + jsonObject + " path: " + path);
   if (typeof jsonObject === 'string') { jsonObject = JSON.parse(jsonObject) };
        try{
            if((typeof jsonObject === 'object') && (jsonObject !== null)) {
                var extractedKeys = path.split('.');
                var currentObject = jsonObject;
                
                for (var i=0; i < extractedKeys.length; i++){
                  var key = extractedKeys[i];
                  LOG.debug("looping key is..." + key);
                  LOG.debug("currentObject hasOwnProperty " + key + ":" + currentObject.hasOwnProperty(key)) ;
                  if(currentObject.hasOwnProperty(key)){
                    var currentObject = currentObject[key];
                    this.fetchedLocatorValue = currentObject.toString();
                  }else{
                      LOG.debug("no such key:" + key + " exists.");
                  }
                }      
           } else {
                LOG.debug("empty object received.");
                return 'undefined';
           }
        }catch(err){
            LOG.error("Error in parsing path " + path + " in json object '" + jsonObject +  + ' ' +  err.message);
        }
      return this.fetchedLocatorValue;
} 


 