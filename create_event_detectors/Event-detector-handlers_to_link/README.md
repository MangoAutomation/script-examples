# Event detector scripts user guide.
### Tested MANGO 4.5.x
##### Updated 09/18/2023
This document explains how to create, edit, and delete event detectors in bulk using these scripts.

# Contents

Prerequisites

General usage steps

CREATE event detectors script

Suggested SQL query to create the CSV file

EDIT event detectors script

Suggested SQL query to create the CSV file

DELETE event detectors script

Suggested SQL query to create the CSV file 

# Prerequisites 

For each script to work, a comma separated values (*.csv) file is required in the Mango file store, as well as the script. The csv input files are created by running an SQL query and then reviewed & edited by the user to confirm information is correct.

# General usage steps 

1. Run the specific query in the SQL console (/ui/administeration/sql-console)
2. Click the "Download CSV" icon.
3. Save the file locally. Name the file as follows depending on the script to run.
  1. event-detectors-to-create.csv
  2. event-detectors-to-edit.csv
  3. event-detectors-to-delete.csv
4. Open the file in excel.
5. Delete the first column. The column has no header and word Object in each cell of that column. Mango adds that column to the CSV file and is useless for the purposes of the script.
6. Add information specific for your needs taking in mind that each script requires different fields for the correct execution.
7. Doublecheck that the information in the CSV file is correct.
8. Upload the file to the CSV file stores in the default (/ui/administration/file-stores?fileStore=default) path.
9. Upload the file to the SCRIPT file stores in the default (/ui/administration/file-stores?fileStore=default) path.
10. Click Edit (pencil icon) and open the SCRIPT.
  1. User configurable variable:

Set enableConsoleLog = true, to enable verbose logging

Set enableConsoleLog = false, to disable verbose logging

**Verbose logging may impact the performance if the script is updating a large number of event detectors**

1. Click the Evaluate script (Play) icon TO RUN THE SCRIPT

#

# CREATE event detectors script

Used to create a group of even detectors. The create\_event\_detectors.js script requires a CSV file to be present in the file store named event-detectors-to-create.csv with the following structure:

**dataPointId, dataPointXid, detectorType, detectorName,alarmLevel,limit,duration,durationType, handlers_to_link,dataPointName,dataPointType** any, other, column, can, be, present, but will, be, ignored

- **dataPointId** (prefilled by the SQL and can be edited) is the datapoint's **NUMERIC** id
- **dataPointXid** (prefilled by the SQL and can be edited) is the datapoint's **ALPHANUMERIC** XId
- **detectorType (used defined)** LOW\_LIMIT or HIGH\_LIMIT or MULTISTATE\_STATE & BINARY\_STATE
- **detectorName (used defined)** a name to identify the detector.
- **alarmLevel (user defined)** valid levels: NONE, INFORMATION, IMPORTANT, WARNING, URGENT, CRITICAL, LIFE\_SAFETY, DO\_NOT\_LOG, IGNORE
- **limit (user defined) NUMERIC** value to trigger the event detector.
- **stateValues** Sets the state value(s) for MULTISTATE\_STATE & BINARY\_STATE event detectors. If listing more than 1 state value, use a delimiter symbol ";, \*, ||", please do not use comma delimiter. It will break the CSV file format.
--**stateInverted** is true or false for MULTISTATE\_STATE & BINARY\_STATE
- **duration** Is integer value to represent duration run event.
- **durationType** Is a integer the represent interval value ***1 =  SECONDS, 2 = MINUTES ,3 = HOURS, 4 = DAYS.***
- **Handlers\_to\_link** Links event handlers to the new event detector. This can be a list of event handler IDs, delimited with a custom symbol ";, \*, ||", please do not use comma delimiter. It will break the CSV file format.
- **dataPointName** is only for control
- **dataPointType** is the type numeric,MULTISTATE\_BINARY\_NUMERIC
- **All the columns right to the alarmLevel are only informational for the user and will be ignored by the script.**

This script will:

1. Get and Validate headers.
2. Confirm the detectorType is correct. (Only LOW\_LIMIT,  HIGH\_LIMIT, MULTISTATE\_STATE, and BINARY\_STATE are allowed)
  1. Fail on a mismatch.
  2. Fail if some other type of detector that is not supported.
3. Validate the datapoint.
4. Create the new event detector.
5. Set the detectorType, DetectorName, Limit or State(s), and/or AlarmLevel values as needed.
6. Insert the event detector.
7. Handlers\_to\_link has no event handler links please write EMPTY
8. The delimiter const will be near the top of the script file: const handlersLinkDelimiter = ';'

## Suggested SQL query to create the CSV file 

The goal of the SQL query is obtaining a prefilled CSV file ready to be edited by the user.

DO NOT modify the query in the lines before the WHERE clause. However, the lines after the WHERE clause can be updated as needed to limit the query based on specific Data Sources, Data Points, or some combination of the two. Additional WHERE clauses can be added as needed.

    SELECT DISTINCT 
		dP.id as dataPointId, 
		dP.xid as dataPointXid, 
		'' as detectorType, 
		'' as detectorName,
		'' as alarmLevel,
		'' as `limit`,
		'' as stateValues,
		'' as stateInverted,
		'' as duration,
		'' as durationType,
		'' as handlers_to_link, 
		dP.name as dataPointName,
			REPLACE(REPLACE(REPLACE(REPLACE(dP.dataTypeId, '1', 'BINARY'), '2', 'MULTISTATE'), '3', 'NUMERIC'), '4', 'ALPHANUMERIC') as dataPointType,
		dS.id as dataSourceId, 
		dS.xid as dataSourceXid,
		dS.name as dataSourceName, 
		dS.dataSourceType
    
	FROM  dataPoints dP
		INNER JOIN dataSources dS ON dP.dataSourceId = dS.id
      
	WHERE
          (
              dS.xid IN ('[USER INPUT FOR THE XID 1], [USER INPUT FOR THE XID 2][…]')
          )
          AND
          (
              dP.name LIKE '[USER defined pattern], […] '
          );

# EDIT event detectors script

Used to edit a group of even detectors. The **edit\_event\_detectors.js** script requires a CSV file to be present in the file stores named **event-detectors-to-edit.csv** with the following structure:

**eventDetectorId, eventDetectorXid, detectorType, newDetectorName, newAlarmLevel  newLimit, newStateValues,newStateInverted,newDuration,newDurationType"handlers\_to\_link, handlers\_to\_remove,dataPointType** any, other, column, can, be, present, but will, be, ignored

- **eventDetectorId** (prefilled by the SQL query, not editable) is the event detector **NUMERIC** id.
- **eventDetectorXid** (prefilled by the SQL query, not editable) is the event detector **ALPHANUMERIC** XId.
- **detectorType (**prefilled by the SQL query, not editable**)** LOW\_LIMIT or HIGH\_LIMIT or MULTISTATE\_STATE or BINARY\_STATE
- **newDetectorName** **(used defined)** a name to identify the detector.
- **newAlarmLevel** **(user defined)** valid levels: NONE, INFORMATION, IMPORTANT, WARNING, URGENT, CRITICAL, LIFE\_SAFETY, DO\_NOT\_LOG, IGNORE
- **stateValues** Sets the state value(s) for MULTISTATE\_STATE & BINARY\_STATE event detectors. If listing more than 1 state value, use a delimiter symbol ";, \*, ||", please do not use comma delimiter. It will break the CSV file format.
--**stateInverted** is true or false for MULTISTATE\_STATE & BINARY\_STATE
- **newDuration** Is integer value to represent duration run event.
- **newDurationType** Is a integer the represent interval value ***1 =  SECONDS, 2 = MINUTES ,3 = HOURS, 4 = DAYS.***
- **Handlers\_to\_link** Links event handlers to the event detector that were not already linked to this detector. This can be a list of event handler IDs, delimited with a custom symbol ";, \*, ||", please do not use comma delimiter. It will break the CSV file format.
- **Handlers\_to\_remove** Unlinks event handlers from the event detector if they were previously linked to this detector. This can be a list of event handler IDs, delimited with a custom symbol ";, \*, ||", please do not use comma delimiter. It will break the CSV file format.

- **All the columns right to the alarmLevel are only informational for the user and will be ignored by the script.**


This script will:

1. Get and Validate headers.
2. Locate the event detector that matches the eventDetectorXid provided
3. Confirm the id is also a match (always double-verify before editing things)
4. Confirm the detectorType is correct. (Only LOW\_LIMIT,  HIGH\_LIMIT, MULTISTATE\_STATE, and BINARY\_STATE are allowed)
  1. Fail on a mismatch.
  2. Fail if some other type of detector that is not supported.
5. Set the new DetectorName, Limit, and/or AlarmLevel values as needed.
  1. If any of the new\* columns are empty, that value should be left unchanged Create the new event detector.
6. Insert the event detector.
7. The delimiter const will be near the top of the file: const handlersLinkDelimiter = ';'

NOTE: "EMPTY" is not a valid name for an event detector using this script

## Suggested SQL query to edit the CSV file 

The goal of the SQL query is obtaining a prefilled CSV file ready to be edited by the user.

DO NOT modify the query in the lines before the WHERE clause. However, the lines after the WHERE clause can be updated as needed to limit the query based on specific Data Sources, Data Points, Event Detector types, Event Detector names, or some combination of these. Additional WHERE clauses can be added as needed.
#### The following query (Edit) is only for Mysql ####

      SELECT DISTINCT 
	  eD.id as eventDetectorId,
	  eD.xid as eventDetectorXid,
	  eD.typeName as detectorType,
      '' as newDetectorName,
	  '' as newAlarmLevel, 
	  '' as newLimit, 
	  '' as newStateValues,
      '' as newStateInverted, 
	  '' as newDuration,
	  '' as newDurationType,
	  '' as handlers_to_link, 
	  '' as handlers_to_remove,
      eD.data->>'$.name' as existingName, 
	  eD.data->>'$.alarmLevel' as existingAlarmLevel,
      eD.data->>'$.limit' as existingLimit,
	  eD.data->>'$.duration' as existingDuration,
	  REPLACE(REPLACE(REPLACE(REPLACE(eD.data->>'$.durationType','SECONDS',1),'MINUTES',2),'HOURS',3),'DAYS',4) as existingDurationType,
      CASE
          WHEN eD.data->>'$.states' = 'null' THEN eD.data->>'$.state'
          ELSE REPLACE(REPLACE(REPLACE(eD.data->>'$.states', '[', ''), ']', ''), ',', ';')
      END as existingStateValues,
      eD.data->>'$.inverted' as existingStateInverted, dP.name as dataPointName,
      REPLACE(REPLACE(REPLACE(REPLACE(dP.dataTypeId, '1', 'BINARY'),
        '2', 'MULTISTATE'), '3', 'NUMERIC'), '4',
        'ALPHANUMERIC') as dataPointType, eD.data->>'$.sourceType' as detectorSourceType,
      dP.id as dataPointId, dP.xid as dataPointXid, dS.id as dataSourceId, dS.xid as dataSourceXid,
      dS.name as dataSourceName, dS.dataSourceType
      FROM eventDetectors eD
      INNER JOIN dataPoints dP ON eD.dataPointId = dP.id
      INNER JOIN dataSources dS ON dP.dataSourceId = dS.id
      WHERE
			  (
				  eD.data->>'$.sourceType' IN ('DATA_POINT')
			  )
		  AND 
			  (
				  dS.id IN (63, 65, 69)
				  OR
				  dS.xid IN ('[USER INPUT FOR THE XID 1], [USER INPUT FOR THE XID 2][…]')
			  )
		  AND
			(
			  eD.typeName IN ('HIGH_LIMIT', 'LOW_LIMIT', 'BINARY_STATE', 'MULTISTATE_STATE')
			)
		  AND
			  (
				  dP.name LIKE 'onOffAlarmPoint%'
			  )
		  AND
			  (
				  eD.data->>'$.name' LIKE 'Weather%'
				  OR
				  eD.data->>'$.name' LIKE 'weather%'
			  );

#### The following query (EDIT) is only for MariaDB w/JSON data type included ####

	SELECT DISTINCT 
			eD.id as eventDetectorId, 
			eD.xid as eventDetectorXid, 
			eD.typeName as detectorType,
			'' as newDetectorName, 
			'' as newAlarmLevel, 
			'' as newLimit, 
			'' as newStateValues,
			'' as newStateInverted, 
			'' as newDuration, 
			'' as newDurationType,
			'' as handlers_to_link, 
			'' as handlers_to_remove,
			dS.dataSourceType as dataPointType,
            JSON_UNQUOTE(JSON_EXTRACT(eD.data, '$.name')) as existingName,
            JSON_UNQUOTE(JSON_EXTRACT(eD.data, '$.alarmLevel')) as existingAlarmLevel,
            JSON_UNQUOTE(JSON_EXTRACT(eD.data, '$.limit')) as existingLimit,
			JSON_UNQUOTE(JSON_EXTRACT(eD.data, '$.duration')) as existingDuration,
			REPLACE(REPLACE(REPLACE(REPLACE(JSON_UNQUOTE(JSON_EXTRACT(eD.data,'$.durationType')),'SECONDS',1),'MINUTES',2),'HOURS',3),'DAYS',4) as existingDurationType,
		CASE
			WHEN JSON_EXTRACT(eD.data, '$.states') IS NULL 
			THEN JSON_EXTRACT(eD.data, '$.state') 
			ELSE REPLACE(REPLACE(REPLACE(JSON_UNQUOTE(JSON_EXTRACT(eD.data, '$.states')), '[', ''), ']', ''), ',', ';')
		END as existingStateValues,
			JSON_UNQUOTE(JSON_EXTRACT(eD.data, '$.inverted')) as existingStateInverted, 
			dP.name as dataPointName,
			REPLACE(REPLACE(REPLACE(REPLACE(dP.dataTypeId, '1', 'BINARY'), '2', 'MULTISTATE'), '3', 'NUMERIC'), '4', 'ALPHANUMERIC') AS dataPointType, 
			JSON_UNQUOTE(JSON_EXTRACT(eD.data, '$.sourceType')) as detectorSourceType,
			dP.id as dataPointId, 
			dP.xid as dataPointXid, 
			dS.id as dataSourceId, 
			dS.xid as dataSourceXid,
			dS.name as dataSourceName
	FROM 
			eventDetectors eD
			INNER JOIN dataPoints dP ON eD.dataPointId = dP.id
			INNER JOIN dataSources dS ON dP.dataSourceId = dS.id
		WHERE
			
				dS.id IN (63, 65, 69)
				OR
				dS.xid IN ('[USER INPUT FOR THE XID 1], [USER INPUT FOR THE XID 2][…]')
			
			AND 
				eD.typeName IN ('HIGH_LIMIT', 'LOW_LIMIT', 'BINARY_STATE', 'MULTISTATE_STATE')
			
			AND 
				dP.name = '[USER INPUT FOR THE dataPointName]'
			
			AND 
				JSON_EXTRACT(eD.data,'$.name') LIKE '[USER INPUT FOR THE EVENT DETECTOR NAME]'
				OR 
				JSON_EXTRACT(eD.data,'$.name') LIKE '[USER INPUT FOR THE EVENT DETECTOR NAME]';




# DELETE event detectors script. 

Used to edit a group of even detectors. The **delete\_event\_detectors.js** script requires a CSV file to be present in the file stores named **event-detectors-to-delete.csv** with the following structure:

**eventDetectorId, eventDetectorXid,** any, other, column, can, be, present, but will, be, ignored

- **eventDetectorId** (prefilled by the SQL query, not editable) is the event detector **NUMERIC** id.
- **eventDetectorXid** (prefilled by the SQL query, not editable) is the event detector **ALPHANUMERIC** XId.
- **All the columns right to the alarmLevel are only informational for the user and will be ignored by the script.**

This script will:

1. Get and Validate column headers.
2. Locate the event detector that matches the eventDetectorXid provided.
3. Confirm the id is also a match (always double-verify before editing things)
4. Delete the event detector.

## Suggested SQL query to delete the CSV file 

The goal of the SQL query is obtaining a prefilled CSV file ready to be edited by the user.

DO NOT modify the query in the lines before the WHERE clause. However, the lines after the WHERE clause can be updated as needed to limit the query based on specific Data Sources, Data Points, or some combination of the two. Additional WHERE clauses can be added as needed.

    SELECT DISTINCT 
		eD.id as eventDetectorId, 
		eD.xid as eventDetectorXid,
		dP.id as dataPointId, 
		dP.xid as dataPointXid,
		eD.sourceTypeName as detectorsourceTypeName, 
		eD.TypeName as detectorTypeName,
		'' as `limit`, 
		'' as alarmLevel,
		dP.name as dataPointName, 
		dS.id as dataSourceId,
		dS.xid as dataSourceXid, 
		dS.name as dataSourceName, 
		dS.dataSourceType,
		eD.data as detectorData
	FROM eventDetectors eD
		INNER JOIN dataPoints dP ON eD.dataPointId = dP.id
		INNER JOIN dataSources dS ON dP.dataSourceId = dS.id
    WHERE

    (

    dS.xid IN ('[USER INPUT FOR THE XID 1], [USER INPUT FOR THE XID 2][…]')

    )

    AND

    (

    dP.name LIKE '[USER defined pattern], […] '

    );
