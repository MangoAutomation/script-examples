// Delete a group of data points read from a csv file of the form:
// id,xid,other,rows

const Files = Java.type('java.nio.file.Files');

function readCsv(fileStore, filePath) {
    const path = services.fileStoreService.getPathForRead(fileStore, filePath);
    const lines = Array.from(Files.readAllLines(path));
    const header = lines.shift().split(',');
    for (let i = 0; i < lines.length; i++) {
        const row = lines[i].split(',');
        const data = lines[i] = {};
        for (let j = 0; j < row.length; j++) {
            data[header[j]] = row[j];
        }
    }
    return lines;
}

const dataPointService = services.dataPointService;
const pointsArray = readCsv('default', 'data-points-to-delete.csv');

console.log(`Deleting ${pointsArray.length} points`);
let count = 0;
let failed = 0;
for(const point of pointsArray) {
    try {
        dataPointService.delete(point.xid);
        count++;
    }catch(error) {
        log.error('Failed deleting data point {}', point.xid, error);
        failed++;
    }

    if(count % 10 == 0){
        console.log(`Deleted ${count} points out of ${pointsArray.length}`);
    }
}
console.log(`Finished deleting ${count} out of ${pointsArray.length} points with ${failed} errors`);
