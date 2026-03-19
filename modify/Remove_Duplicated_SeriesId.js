/* Loads a list of duplicated seriesIds from a CVS file dounloaded from the SQL console
 * using the query: select seriesId from dataPoints group by seriesId having count(seriesId)>1; 
 * looks for datapoints with duplicated SeriesId and update them with a new unique seriesId;
 * Instructions: 
 * 1. Run the query in the SQL console: select seriesId from dataPoints group by seriesId having count(seriesId)>1;
 * 2. Save the file to the default File Store directory.
 * 3. Load and execute this script. 
 * Note: Change to true, the value of the allowModifications constant to allow the script to make the changes,
 * otherwise it will just log the sata points that need to fe fixed. 
 */


const allowModifications = false;
const Files = Java.type('java.nio.file.Files');

/**
 * IMPORTANT NOTE: this will read the file as is so one Gotcha is that the first line of the file may contain 
 *  some invisible bytes that get appened to the start of the first column header which will make 
 *  this script fail.
 */
function readCsv(fileStore, filePath) {
    const path = services.fileStoreService.getPathForRead(fileStore, filePath);
    const lines = Array.from(Files.readAllLines(path));
    const header = lines.shift().split(',');
    //console.log(header); 
    for (let i = 0; i < header.length; i++) {
        header[i] = header[i].replace(/["]+/g, '');
    }
    for (let i = 0; i < lines.length; i++) {
        //console.log(lines[i]);
        const row = lines[i].split(',');
        const data = lines[i] = {};
        for (let j = 0; j < row.length; j++) {
            data[header[j]] = row[j].replace(/["]+/g, '');
        }
    }
    return lines;
}

const Common = Java.type('com.serotonin.m2m2.Common');
const DataPointDao = Java.type('com.serotonin.m2m2.db.dao.DataPointDao');
const dataPointDao = Common.getBean(DataPointDao);

const pointsArray = readCsv('default', '9999.csv');

let count = 0;
let failed = 0;
for(const point of pointsArray) {
   
    try {
        //console.log(point.SERIESID);
        let seriesId = parseInt(point.SERIESID);
        console.log(`seriesId ${seriesId}`);
        const dataPoints = services.dataPointService.buildQuery()
        .equal('seriesId', seriesId)
        .query(); // limit, offset
        for(const dp of dataPoints) {
            
            if (allowModifications === true){
                let newSeriesId = dataPointDao.insertNewTimeSeries();
                console.log(`Updating dp with XID ${dp.getXid()}  to have seriesId ${newSeriesId}`);
                dp.setSeriesId(newSeriesId);
                services.dataPointService.update(dp.getId(), dp);
            }else{
                console.log(`Will modify dp with XID ${dp.getXid()}`);
            }
            count++;
        }
        
    }catch(error) {
        console.log(`Failed processing seriesId  ${point.SERIESID}` , error);
        failed++;
    }

    if(count % 10 == 0){
        console.log(`Processing ${count} out of ${pointsArray.length} duplicated seriesId`);
    }
}
console.log(`Finished processing ${count} out of ${pointsArray.length} duplicated seriesId with ${failed} errors`);


