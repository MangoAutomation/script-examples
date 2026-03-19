/**
 * Retrieves and prints the current Log4j logging configuration.
 */
const loggerContext = Java.type('org.apache.logging.log4j.LogManager').getContext(false);
print(loggerContext.getConfiguration().toString());