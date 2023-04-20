# Event detector scripts user guide.

This document explains how to create, edit, and delete event detectors in bulk using these scripts.

# Contents

[Prerequisites]

[General usage steps]

[CREATE event detectors script]

[Suggested SQL query to create the CSV file]

[EDIT event detectors script]

[Suggested SQL query to create the CSV file]

[DELETE event detectors script]

[Suggested SQL query to create the CSV file ]

# Prerequisites 

For each script to work, a comma separated values (*.csv) file is required in the Mango file store, as well as the script. The csv input files are created by running an SQL query and then manually edited by the user to set the required information.

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

**dataPointId, dataPointXid, detectorType, detectorName, limit, alarmLevel,**** dataPointName **,** handlers\_to\_link,** any, other, column, can, be, present, but will, be, ignored

- **dataPointId** (prefilled by the SQL and can be edited) is the datapoint's **NUMERIC** id
- **dataPointXid** (prefilled by the SQL and can be edited) is the datapoint's **ALPHANUMERIC** XId
- **detectorType (used defined)** LOW\_LIMIT or HIGH\_LIMIT
- **detectorName (used defined)** a name to identify the detector.
- **limit (user defined) NUMERIC** value to trigger the event detector.
- **alarmLevel (user defined)** valid levels: NONE, INFORMATION, IMPORTANT, WARNING, URGENT, CRITICAL, LIFE\_SAFETY, DO\_NOT\_LOG, IGNORE
- **All the columns right to the alarmLevel are only informational for the user and will be ignored by the script.**
- **Handlers\_to\_link** Links handlers from the event detector were not in the original, they are delimited for a customs symbol ";, \*, ||", please do not use comma delimiter. It will break the CSV file format.

This script will:

1. Get and Validate headers.
2. Confirm the detectorType is correct. (Only LOW\_LIMIT and HIGH\_LIMIT is allowed)
  1. LOW\_LIMIT or HIGH\_LIMIT
  2. Fail on a mismatch.
  3. Fail if some other type of detector that is not supported.
3. Validate the datapoint.
4. Create the new event detector.
5. Set the detectorType, DetectorName, Limit, and/or AlarmLevel values as needed.
  1. If any of the new\* columns are empty, that value should be left unchanged.
6. Insert the event detector.
7. Handlers\_to\_link has no event handler links please write EMPTY
8. The delimiter const will be on top file, line 28 const handlersLinkDelimiter = ';'

## Suggested SQL query to create the CSV file 

The goal of the SQL query is obtaining a prefilled CSV file ready to be edited by the user.

DO NOT modify the query in the lines before the WHERE clause. However, the lines after the WHERE clause can be updated as needed to limit the query based on specific Data Sources, Data Points, or some combination of the two. Additional WHERE clauses can be added as needed.

      SELECT DISTINCT dP.id as dataPointId, dP.xid as dataPointXid, 
          '' as detectorType, '' as detectorName, 
          '' as `limit`, '' as alarmLevel, 
          dP.name as dataPointName, '' as handlers_to_link,
          dS.id as dataSourceId, dS.xid as dataSourceXid,
          dS.name as dataSourceName, dS.dataSourceType
      FROM eventDetectors eD
      INNER JOIN dataPoints dP ON eD.dataPointId = dP.id
      INNER JOIN dataSources dS ON dP.dataSourceId = dS.id
      WHERE
          (
              dS.xid IN ('DS_b3dfc7fa-416e-4650-b8de-b521ce288275')
          )
      AND
          (
              dP.name LIKE 'onOffAlarmPoint%'
          )

# EDIT event detectors script

Used to edit a group of even detectors. The **edit\_event\_detectors.js** script requires a CSV file to be present in the file stores named **event-detectors-to-edit.csv** with the following structure:

**eventDetectorId, eventDetectorXid, detectorType, newDetectorName, newLimit, newAlarmLevel, handlers\_to\_link, handlers\_to\_remove** any, other, column, can, be, present, but will, be, ignored

- **eventDetectorId** (prefilled by the SQL query, not editable) is the event detector **NUMERIC** id.
- **eventDetectorXid** (prefilled by the SQL query, not editable) is the event detector **ALPHANUMERIC** XId.
- **detectorType (**prefilled by the SQL query, not editable**)** LOW\_LIMIT or HIGH\_LIMIT
- **newDetectorName** **(used defined)** a name to identify the detector.
- **newLimit** **(user defined) NUMERIC** value to trigger the event detector.
- **newAlarmLevel** **(user defined)** valid levels: NONE, INFORMATION, IMPORTANT, WARNING, URGENT, CRITICAL, LIFE\_SAFETY, DO\_NOT\_LOG, IGNORE
- **All the columns right to the alarmLevel are only informational for the user and will be ignored by the script.**
- **Handlers\_to\_link** Links handlers from the event detector were not in the original, they are delimited for a customs symbol ";, \*, ||", please do not use comma delimiter. It will break the CSV file format.
- **Handlers\_to\_remove** Links handlers from the event detector were not in the original, they are delimited for a customs symbol ";, \*, ||", please do not use comma delimiter. It will break the CSV file format
- **Handlers\_to\_remove** Links handlers from the event detector were not in the original, they are delimited for a customs symbol ";, \*, ||", please do not use comma delimiter. It will break the CSV file format

This script will:

1. Get and Validate headers.
2. Locate the event detector that matches the eventDetectorXid provided
3. Confirm the id is also a match (always double-verify before editing things)
4. Confirm the detectorType is correct. (Only LOW\_LIMIT and HIGH\_LIMIT is allowed)
  1. LOW\_LIMIT or HIGH\_LIMIT
  2. Fail on a mismatch.
  3. Fail if some other type of detector that is not supported.
5. Set the new DetectorName, Limit, and/or AlarmLevel values as needed.
  1. If any of the new\* columns are empty, that value should be left unchanged Create the new event detector.
6. Insert the event detector.
7. The delimiter const will be on top file, line 27 const handlersLinkDelimiter = ';'

NOTE: "EMPTY" is not a valid name for an event detector using this script

## Suggested SQL query to create the CSV file 

The goal of the SQL query is obtaining a prefilled CSV file ready to be edited by the user.

DO NOT modify the query in the lines before the WHERE clause. However, the lines after the WHERE clause can be updated as needed to limit the query based on specific Data Sources, Data Points, Event Detector types, Event Detector names, or some combination of these. Additional WHERE clauses can be added as needed.

    SELECT DISTINCT eD.id as eventDetectorId, eD.xid as eventDetectorXid, eD.typeName as detectorType,
    '' as newDetectorName, '' as newLimit,'' as newAlarmLevel, 
     '' as handlers_to_link, '' as handlers_to_remove,eD.data->>'$.name' as detectorName,
    eD.data->>'$.limit' as detectorLimit, eD.data->>'$.alarmLevel' as detectorAlarmLevel,
    eD.data->>'$.sourceType' as detectorSourceType,  dP.id as dataPointId,
    dP.xid as dataPointXid, dS.id as dataSourceId, dS.xid as dataSourceXid,
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
            dS.xid IN ('DS_b3dfc7fa-416e-4650-b8de-b521ce288275')
        )
    AND
      (
        eD.typeName IN ('HIGH_LIMIT', 'LOW_LIMIT')
      )
    AND
        (
            eD.data->>'$.name' LIKE 'Weather%'
            OR
            eD.data->>'$.name' LIKE 'weather%'
        )
    AND
        (
            dP.name LIKE 'weatherAlert%'
        )


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

## Suggested SQL query to create the CSV file 

The goal of the SQL query is obtaining a prefilled CSV file ready to be edited by the user.

DO NOT modify the query in the lines before the WHERE clause. However, the lines after the WHERE clause can be updated as needed to limit the query based on specific Data Sources, Data Points, or some combination of the two. Additional WHERE clauses can be added as needed.

    SELECT DISTINCT eD.id as eventDetectorId, eD.xid as eventDetectorXid,

    dP.id as dataPointId, dP.xid as dataPointXid,

    eD.sourceTypeName as detectorsourceTypeName, eD.TypeName as detectorTypeName,

    '' as `limit`, '' as alarmLevel,

    dP.name as dataPointName, dS.id as dataSourceId,

    dS.xid as dataSourceXid, dS.name as dataSourceName, dS.dataSourceType,

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
