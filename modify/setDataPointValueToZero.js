//Set the value of a data point to 0 using a csv file of the form:
// id,xid,other,rows

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
    for (let i = 0; i < lines.length; i++) {
        console.log(lines[i]);
        const row = lines[i].split(',');
        const data = lines[i] = {};
        for (let j = 0; j < row.length; j++) {
            data[header[j]] = row[j];
        }
    }
    return lines;
}

const Common = Java.type('com.serotonin.m2m2.Common');
const PointValueTime = Java.type('com.serotonin.m2m2.rt.dataImage.PointValueTime');
const MultistateValue = Java.type('com.serotonin.m2m2.rt.dataImage.types.MultistateValue');
const multistateZero = new MultistateValue(0);

const pointsArray = readCsv('default', 'data-points-to-setToZero.csv');

console.log(`Setting values for ${pointsArray.length} points`);
let count = 0;
let failed = 0;
for(const point of pointsArray) {
    try {
        const rt = Common.runtimeManager.getDataPoint(parseInt(point.id));
        rt.setPointValue(new PointValueTime(multistateZero, Common.timer.currentTimeMillis()), null);
        count++;
    }catch(error) {
        console.log('Failed setting value of data point with xid {} and id {}', point.xid, point.id, error);
        failed++;
    }

    if(count % 10 == 0){
        console.log(`Set the value for ${count} points out of ${pointsArray.length}`);
    }
}
console.log(`Finished setting the value for ${count} out of ${pointsArray.length} points with ${failed} errors`);
