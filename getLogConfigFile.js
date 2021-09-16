const loggerContext = Java.type('org.apache.logging.log4j.LogManager').getContext(false);
print(loggerContext.getConfiguration().toString());