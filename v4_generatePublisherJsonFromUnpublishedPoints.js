
/*
 * Tested on MANGO 4.5.x
 * Last updated: June 2025
 * Version: 1.0
 ================================================================================
   HOW TO GENERATE THE INITIAL CSV OF UNPUBLISHED DATA POINTS

   1. Go to Mango's SQL Console (Admin > SQL Console).
   2. Run the following query to retrieve all data points that are NOT published:

      SELECT dp.id, dp.xid, dp.name, dp.deviceName
      FROM dataPoints dp
      WHERE dp.id NOT IN (SELECT pp.dataPointId FROM publishedPoints pp)
      ORDER BY dp.deviceName, dp.name;

   3. Download the query results as a CSV file.
      - Ensure the CSV columns are: id, xid, name, deviceName.
      - You will need to remove the "A" column if it appears.

   4. Upload the CSV file to the Mango Default Filestore.
      - Example filename: your-query-output.csv

   5. Add or remove publisher XIDs for distributing the unpublished points.
      - Note: You may also want to create new publishers if the currently running ones do not need to reindex.

   6. Set the 'filePath' variable in this script to match your uploaded CSV filename.

 ================================================================================
*/


const Files = Java.type('java.nio.file.Files');

// CONFIGURE THESE:
const fileStore = 'default';
const filePath = 'your-query-output.csv'; // Your CSV file name
const publisherXids = ['PUB_AAA-1', 'BBB-2', 'PUB_CCC-3']; // Add/remove as needed
const enabledValue = true;

// Read CSV
function readCsv(fileStore, filePath) {
    const path = services.fileStoreService.getPathForRead(fileStore, filePath);
    const lines = Array.from(Files.readAllLines(path));
    const header = lines.shift().split(',');
    const rows = [];
    for (let i = 0; i < lines.length; i++) {
        if (!lines[i].trim()) continue; // skip empty lines
        const row = lines[i].split(',');
        const data = {};
        for (let j = 0; j < row.length; j++) {
            data[header[j].trim()] = row[j].trim();
        }
        rows.push(data);
    }
    return rows;
}

// Main logic
const pointsArray = readCsv(fileStore, filePath);
const publisherCount = publisherXids.length;
let assignIndex = 0;
const publishedPoints = [];

for (const point of pointsArray) {
    // Assign publisher in round-robin fashion
    const publisherXid = publisherXids[assignIndex % publisherCount];
    assignIndex++;
    publishedPoints.push({
        name: point.name,
        dataPointXid: point.xid,
        publisherXid: publisherXid,
        enabled: enabledValue
    });
}

const output = {
    publishedPoints: publishedPoints
};

print(JSON.stringify(output, null, 4));
